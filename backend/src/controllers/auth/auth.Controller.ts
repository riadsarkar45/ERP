
import type { Request, Response } from "express";

import prisma from "../../database/prismaClient/prisma";
import { comparePassword, hashPassword } from "../../utils/auth/password.util";

import {
    generateRefreshToken,
    hashRefreshToken,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_MAX_AGE_MS,
    signAccessToken,
} from "../../utils/auth/token.util";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? ("none" as const) : ("lax" as const),
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? ("none" as const) : ("lax" as const),
    path: "/api/auth",
};

/* -------------------------------------------------------------------------- */
/*                              ERROR HELPERS                                 */
/* -------------------------------------------------------------------------- */

function clearRefreshCookie(res: Response) {
    res.clearCookie(
        REFRESH_TOKEN_COOKIE_NAME,
        CLEAR_COOKIE_OPTIONS
    );
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}

/* -------------------------------------------------------------------------- */
/*                              SESSION HELPERS                               */
/* -------------------------------------------------------------------------- */

async function loadUserSession(userId: number) {
    return prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            name: true,
            phoneNo: true,
            workingStation: true,
            userRole: true,
            isActive: true,
            permissionSections: {
                select: {
                    permittedSection: true,
                    isPermitted: true,
                },
            },
        },
    });
}

type SessionUser = NonNullable<
    Awaited<ReturnType<typeof loadUserSession>>
>;

/**
 * PostgreSQL is the single source of truth.
 * No Redis caching.
 */
async function getUserSession(
    userId: number
): Promise<SessionUser | null> {
    return loadUserSession(userId);
}

/* -------------------------------------------------------------------------- */
/*                             PERMISSION HELPERS                             */
/* -------------------------------------------------------------------------- */

function permittedSectionNames(
    user: Pick<SessionUser, "permissionSections">
): string {
    return user.permissionSections
        .filter((permission) => permission.isPermitted)
        .map((permission) => String(permission.permittedSection))
        .join(",");
}

/* -------------------------------------------------------------------------- */
/*                       REFRESH TOKEN REVOCATION                             */
/* -------------------------------------------------------------------------- */

/**
 * Revoke every refresh token belonging to a user.
 * PostgreSQL is the only storage.
 */
async function revokeAllUserRefreshTokens(
    userId: number
): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: {
            userId,
            revoked: false,
        },
        data: {
            revoked: true,
        },
    });
}

/* -------------------------------------------------------------------------- */
/*                                  REGISTER                                  */
/* -------------------------------------------------------------------------- */

export async function register(req: Request, res: Response) {
    try {
        const {
            phoneNo,
            name,
            password,
            workStation,
        } = req.body;

        if (
            typeof phoneNo !== "string" ||
            typeof password !== "string" ||
            !phoneNo.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Phone number and password are required",
            });
        }

        const normalizedPhone = phoneNo.trim();

        const normalizedName =
            typeof name === "string" ? name.trim() : undefined;

        if (normalizedName === "") {
            return res.status(400).json({
                message: "Name cannot be empty",
            });
        }

        const existing = await prisma.user.findUnique({
            where: {
                phoneNo: normalizedPhone,
            },
            select: {
                id: true,
            },
        });

        if (existing) {
            return res.status(409).json({
                message: "Phone number is already registered",
            });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                password: hashedPassword,
                name: name,

                // Public registration cannot assign privileged roles.
                userRole: "AUDITOR",

                userName: name,

                phoneNo: normalizedPhone,
                workingStation: workStation || null,
            },
            select: {
                id: true,
                userRole: true,
            },
        });

        return res.status(201).json({
            id: user.id,
            role: user.userRole,
        });

    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return res.status(409).json({
                message: "Phone number or username is already registered",
            });
        }

        console.error("[register]", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

/* -------------------------------------------------------------------------- */
/*                                    LOGIN                                   */
/* -------------------------------------------------------------------------- */

export async function login(req: Request, res: Response) {
    try {
        const { phoneNo, password } = req.body;

        if (
            typeof phoneNo !== "string" ||
            typeof password !== "string" ||
            !phoneNo.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Phone number and password are required",
            });
        }

        const normalizedPhone = phoneNo.trim();

        const user = await prisma.user.findUnique({
            where: {
                phoneNo: normalizedPhone,
            },
            select: {
                password: true,
                phoneNo: true,
                id: true,
                userRole: true,
                workingStation: true,
                name: true,
                isActive: true,
                permissionSections: {
                    select: {
                        permittedSection: true,
                        isPermitted: true,
                    },
                },
            },
        });

        const valid = user
            ? await comparePassword(password, user.password)
            : false;

        if (!user || !valid) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                message: "User not active yet. Please contact the admin.",
            });
        }

        const {
            password: _password,
            ...sessionUser
        } = user;

        const accessToken = signAccessToken({
            userId: String(user.id),
            workingStation: String(user.workingStation),
            role: permittedSectionNames(sessionUser),
        });

        const {
            rawToken,
            tokenHash,
            expiresAt,
        } = generateRefreshToken();

        // Persist refresh token in PostgreSQL.
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        res.cookie(
            REFRESH_TOKEN_COOKIE_NAME,
            rawToken,
            REFRESH_COOKIE_OPTIONS
        );

        return res.json({
            accessToken,
            user: {
                id: user.id,
                userName: user.name,
                phoneNo: user.phoneNo,
                role: user.permissionSections,
                accountRole: user.userRole,
            },
        });

    } catch (error) {
        console.error("[login]", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

/* -------------------------------------------------------------------------- */
/*                                   REFRESH                                  */
/* -------------------------------------------------------------------------- */

export async function refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!rawToken || typeof rawToken !== "string") {
        return res.status(401).json({
            message: "No refresh token provided",
        });
    }

    const tokenHash = hashRefreshToken(rawToken);

    try {
        /*
         * Always validate refresh tokens from PostgreSQL.
         */
        const stored = await prisma.refreshToken.findUnique({
            where: {
                tokenHash,
            },
            select: {
                id: true,
                userId: true,
                revoked: true,
                expiresAt: true,
            },
        });

        if (!stored) {
            clearRefreshCookie(res);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        /*
         * Revoked token reuse detection.
         */
        if (stored.revoked) {
            await revokeAllUserRefreshTokens(stored.userId);

            clearRefreshCookie(res);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        const now = new Date();

        if (stored.expiresAt <= now) {
            await prisma.refreshToken.updateMany({
                where: {
                    id: stored.id,
                    revoked: false,
                },
                data: {
                    revoked: true,
                },
            });

            clearRefreshCookie(res);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        /*
         * Load current permissions and account status from PostgreSQL.
         */
        const session = await loadUserSession(stored.userId);

        if (!session || session.isActive === false) {
            await prisma.refreshToken.updateMany({
                where: {
                    id: stored.id,
                    revoked: false,
                },
                data: {
                    revoked: true,
                },
            });

            clearRefreshCookie(res);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        const {
            rawToken: newRawToken,
            tokenHash: newTokenHash,
            expiresAt,
        } = generateRefreshToken();

        /*
         * Database compare-and-swap.
         *
         * Only one request can revoke the old token.
         */
        const rotationSucceeded = await prisma.$transaction(
            async (tx) => {
                const result = await tx.refreshToken.updateMany({
                    where: {
                        id: stored.id,
                        tokenHash,
                        userId: stored.userId,
                        revoked: false,
                        expiresAt: {
                            gt: now,
                        },
                    },
                    data: {
                        revoked: true,
                    },
                });

                if (result.count !== 1) {
                    return false;
                }

                await tx.refreshToken.create({
                    data: {
                        userId: stored.userId,
                        tokenHash: newTokenHash,
                        expiresAt,
                    },
                });

                return true;
            }
        );

        if (!rotationSucceeded) {
            return res.status(409).json({
                message: "Refresh already processed. Please retry.",
            });
        }

        const accessToken = signAccessToken({
            userId: String(session.id),
            role: permittedSectionNames(session),
            workingStation: String(session.workingStation),
        });

        res.cookie(
            REFRESH_TOKEN_COOKIE_NAME,
            newRawToken,
            REFRESH_COOKIE_OPTIONS
        );

        return res.json({
            accessToken,
        });

    } catch (error) {
        console.error("[refresh]", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

/* -------------------------------------------------------------------------- */
/*                                    LOGOUT                                  */
/* -------------------------------------------------------------------------- */

export async function logout(req: Request, res: Response) {
    try {
        const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

        if (rawToken && typeof rawToken === "string") {
            const tokenHash = hashRefreshToken(rawToken);

            await prisma.refreshToken.updateMany({
                where: {
                    tokenHash,
                    revoked: false,
                },
                data: {
                    revoked: true,
                },
            });
        }

        clearRefreshCookie(res);

        return res.status(204).send();

    } catch (error) {
        console.error("[logout]", error);

        clearRefreshCookie(res);

        return res.status(503).json({
            message: "Logout could not be completed. Please try again.",
        });
    }
}

/* -------------------------------------------------------------------------- */
/*                                    GET ME                                  */
/* -------------------------------------------------------------------------- */

export async function getMe(req: Request, res: Response) {
    try {
        const userId = Number(req.user?.userId);

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }

        const foundUser = await getUserSession(userId);

        if (!foundUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (foundUser.isActive === false) {
            return res.status(403).json({
                message: "User is not active",
            });
        }

        return res.json({
            id: foundUser.id,
            workingStation: foundUser.workingStation,
            name: foundUser.name,
            userRole: foundUser.permissionSections,
            accountRole: foundUser.userRole,
        });

    } catch (error) {
        console.error("[getMe]", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
