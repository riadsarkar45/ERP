
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
import redis from "../../redis/connect.redis";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SEC = 15 * 60;

const SESSION_CACHE_TTL_SEC = 5 * 60;

const REFRESH_TTL_SEC = Math.ceil(
    REFRESH_TOKEN_MAX_AGE_MS / 1000
);

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
/*                                REDIS KEYS                                  */
/* -------------------------------------------------------------------------- */

const K = {
    loginFails: (ip: string, phoneNo: string) =>
        `auth:login:fails:${ip}:${phoneNo}`,

    session: (userId: number) =>
        `auth:session:${userId}`,

    refresh: (hash: string) =>
        `auth:rt:${hash}`,

    revoked: (hash: string) =>
        `auth:rt:revoked:${hash}`,

    userTokens: (userId: number) =>
        `auth:user:${userId}:rts`,
};

/* -------------------------------------------------------------------------- */
/*                              ERROR HELPERS                                 */
/* -------------------------------------------------------------------------- */

function logRedisError(operation: string, error: unknown) {
    console.error(
        `[Redis:${operation}]`,
        error instanceof Error ? error.message : error
    );
}

async function safe<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback: T
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        logRedisError(operation, error);
        return fallback;
    }
}

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
/*                       LOGIN RATE LIMITER (REDIS)                           */
/* -------------------------------------------------------------------------- */

/**
 * Atomically reserves a login attempt.
 *
 * Five attempts are allowed within the configured window.
 * The next attempt is rejected.
 *
 * Redis failure is fail-closed: login returns 503.
 */
async function reserveLoginAttempt(key: string): Promise<{
    allowed: boolean;
    count: number;
    retryAfter: number;
}> {
    const script = `
        local current = tonumber(redis.call("GET", KEYS[1]) or "0")
        local maximum = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])

        if current >= maximum then
            local ttl = redis.call("TTL", KEYS[1])

            if ttl < 1 then
                ttl = window
            end

            return {0, current, ttl}
        end

        local count = redis.call("INCR", KEYS[1])

        if count == 1 then
            redis.call("EXPIRE", KEYS[1], window)
        end

        local ttl = redis.call("TTL", KEYS[1])

        return {1, count, ttl}
    `;

    const result = await redis.eval(
        script,
        1,
        key,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_WINDOW_SEC
    ) as number[];

    const allowed = Number(result[0]) === 1;
    const count = Number(result[1]);
    const retryAfter = Math.max(Number(result[2]), 1);

    return {
        allowed,
        count,
        retryAfter,
    };
}

/* -------------------------------------------------------------------------- */
/*                              SESSION CACHE                                 */
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
 * Redis read-through cache.
 * PostgreSQL is the source of truth.
 */
async function getUserSession(
    userId: number
): Promise<SessionUser | null> {
    const cached = await safe(
        "session:get",
        () => redis.get(K.session(userId)),
        null
    );

    if (cached) {
        try {
            return JSON.parse(cached) as SessionUser;
        } catch {
            await safe(
                "session:delete-invalid",
                () => redis.del(K.session(userId)),
                0
            );
        }
    }

    const user = await loadUserSession(userId);

    if (!user) {
        return null;
    }

    await safe(
        "session:set",
        () =>
            redis.set(
                K.session(userId),
                JSON.stringify(user),
                "EX",
                SESSION_CACHE_TTL_SEC
            ),
        null
    );

    return user;
}

/**
 * Call after changing permissions, role, station or active status.
 */
export async function invalidateUserSession(userId: number) {
    await safe(
        "session:invalidate",
        () => redis.del(K.session(userId)),
        0
    );
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
/*                          REFRESH TOKEN CACHE                               */
/* -------------------------------------------------------------------------- */

async function cacheRefreshToken(
    userId: number,
    tokenHash: string
): Promise<void> {
    await safe(
        "refresh:cache",
        async () => {
            await redis
                .multi()
                .set(
                    K.refresh(tokenHash),
                    String(userId),
                    "EX",
                    REFRESH_TTL_SEC
                )
                .sadd(K.userTokens(userId), tokenHash)
                .expire(K.userTokens(userId), REFRESH_TTL_SEC)
                .exec();
        },
        undefined
    );
}

async function markRefreshTokenRevoked(
    userId: number,
    tokenHash: string
): Promise<void> {
    await safe(
        "refresh:revoke-cache",
        async () => {
            await redis
                .multi()
                .del(K.refresh(tokenHash))
                .srem(K.userTokens(userId), tokenHash)
                .set(
                    K.revoked(tokenHash),
                    String(userId),
                    "EX",
                    REFRESH_TTL_SEC
                )
                .exec();
        },
        undefined
    );
}

/**
 * Revoke every refresh token belonging to a user.
 *
 * PostgreSQL update happens first.
 * Redis cleanup is best-effort.
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

    await safe(
        "refresh:revoke-all-cache",
        async () => {
            const hashes = await redis.smembers(
                K.userTokens(userId)
            );

            const pipeline = redis.multi();

            for (const hash of hashes) {
                pipeline.del(K.refresh(hash));

                pipeline.set(
                    K.revoked(hash),
                    String(userId),
                    "EX",
                    REFRESH_TTL_SEC
                );
            }

            pipeline.del(K.userTokens(userId));

            await pipeline.exec();
        },
        undefined
    );
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
                name: "normalizedName",

                // Public registration cannot assign privileged roles.
                userRole: "AUDITOR",

                // Replace the previous constant username.
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
        const ip = req.ip || "unknown";

        const failKey = K.loginFails(
            ip,
            normalizedPhone
        );

        /*
         * Reserve the attempt atomically before checking credentials.
         * This prevents concurrent requests bypassing the limit.
         */
        let attempt: {
            allowed: boolean;
            count: number;
            retryAfter: number;
        };

        try {
            attempt = await reserveLoginAttempt(failKey);
        } catch (error) {
            logRedisError("login:rate-limit", error);

            return res.status(503).json({
                message: "Authentication service temporarily unavailable. Please try again.",
            });
        }

        if (!attempt.allowed) {
            res.setHeader(
                "Retry-After",
                String(attempt.retryAfter)
            );

            return res.status(429).json({
                message: "Too many login attempts. Try again later.",
            });
        }

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
            if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
                res.setHeader(
                    "Retry-After",
                    String(attempt.retryAfter)
                );
            }

            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        // Credentials are valid. Reset the failed-attempt counter.
        await safe(
            "login:reset-counter",
            () => redis.del(failKey),
            0
        );

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

        // Persist token in PostgreSQL before returning it.
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        // Redis is only a cache.
        await cacheRefreshToken(user.id, tokenHash);

        await safe(
            "session:warm",
            () =>
                redis.set(
                    K.session(user.id),
                    JSON.stringify(sessionUser),
                    "EX",
                    SESSION_CACHE_TTL_SEC
                ),
            null
        );

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
         * Redis cache alone cannot authorize token rotation.
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
         * A revoked token presented again indicates possible reuse.
         * Revoke all active refresh tokens for that user.
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

            await markRefreshTokenRevoked(
                stored.userId,
                tokenHash
            );

            clearRefreshCookie(res);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        /*
         * Load current permissions and account status from DB.
         * Do not use potentially stale session cache for rotation.
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

            await markRefreshTokenRevoked(
                stored.userId,
                tokenHash
            );

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
         * A concurrent request gets count = 0.
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
            /*
             * Another concurrent request already rotated this token.
             * Do not clear the cookie here: the successful response
             * may be setting the replacement cookie.
             */
            return res.status(409).json({
                message: "Refresh already processed. Please retry.",
            });
        }

        // Database rotation succeeded. Redis cleanup is best-effort.
        await markRefreshTokenRevoked(
            stored.userId,
            tokenHash
        );

        await cacheRefreshToken(
            stored.userId,
            newTokenHash
        );

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

            const stored = await prisma.refreshToken.findUnique({
                where: {
                    tokenHash,
                },
                select: {
                    userId: true,
                },
            });

            await prisma.refreshToken.updateMany({
                where: {
                    tokenHash,
                    revoked: false,
                },
                data: {
                    revoked: true,
                },
            });

            if (stored) {
                await markRefreshTokenRevoked(
                    stored.userId,
                    tokenHash
                );
            }
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
        });
    } catch (error) {
        console.error("[getMe]", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
