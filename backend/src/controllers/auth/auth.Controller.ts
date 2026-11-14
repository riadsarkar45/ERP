import { Request, Response } from "express";

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

const isProd = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd, // requires HTTPS in prod
    sameSite: isProd ? ("none" as const) : ("lax" as const), // "none" for cross-site frontend/backend
    path: "/api/auth", // scope cookie to auth routes only
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

/* -------------------------------------------------------------------------- */
/*                               Redis constants                              */
/* -------------------------------------------------------------------------- */

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SEC = 15 * 60;
const SESSION_CACHE_TTL_SEC = 5 * 60;
const REFRESH_TTL_SEC = Math.ceil(REFRESH_TOKEN_MAX_AGE_MS / 1000);
const REFRESH_LOCK_TTL_SEC = 10;

const K = {
    loginFails: (ip: string, phoneNo: string) => `auth:login:fails:${ip}:${phoneNo}`,
    session: (userId: number) => `auth:session:${userId}`,
    refresh: (hash: string) => `auth:rt:${hash}`,
    revoked: (hash: string) => `auth:rt:revoked:${hash}`,
    userTokens: (userId: number) => `auth:user:${userId}:rts`,
    lock: (hash: string) => `auth:rt:lock:${hash}`,
};

/** Redis must never take auth down: on error, log and fall back to the DB. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        console.error("[redis]", err);
        return fallback;
    }
}

/* -------------------------------------------------------------------------- */
/*                          Cached user session (profile)                     */
/* -------------------------------------------------------------------------- */

async function loadUserSession(userId: number) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            phoneNo: true,
            workingStation: true,
            userRole: true,
            isActive: true,
            permissionSections: {
                select: { permittedSection: true, isPermitted: true },
            },
        },
    });
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof loadUserSession>>>;

/** Read-through cache: Redis first, DB on miss, then populate Redis. */
async function getUserSession(userId: number): Promise<SessionUser | null> {
    const cached = await safe(() => redis.get(K.session(userId)), null);
    if (cached) {
        try {
            return JSON.parse(cached) as SessionUser;
        } catch {
            await safe(() => redis.del(K.session(userId)), 0);
        }
    }

    const user = await loadUserSession(userId);
    if (!user) return null;

    await safe(
        () => redis.set(K.session(userId), JSON.stringify(user), "EX", SESSION_CACHE_TTL_SEC),
        null
    );
    return user;
}

/**
 * Call this from any admin route that changes a user's permissions, role,
 * station or active status. Otherwise changes show up only after the TTL.
 */
export async function invalidateUserSession(userId: number) {
    await safe(() => redis.del(K.session(userId)), 0);
}

/** Only the sections the user is actually allowed to access. */
function permittedSectionNames(user: Pick<SessionUser, "permissionSections">): string {
    return user.permissionSections
        .filter((p) => p.isPermitted)
        .map((p) => String(p.permittedSection))
        .join(",");
}

/* -------------------------------------------------------------------------- */
/*                           Refresh token helpers                            */
/* -------------------------------------------------------------------------- */

async function cacheRefreshToken(userId: number, tokenHash: string) {
    await safe(async () => {
        await redis
            .multi()
            .set(K.refresh(tokenHash), String(userId), "EX", REFRESH_TTL_SEC)
            .sadd(K.userTokens(userId), tokenHash)
            .expire(K.userTokens(userId), REFRESH_TTL_SEC)
            .exec();
    }, undefined);
}

/** Drop a token from the active cache and leave a marker so reuse can be detected. */
async function markRefreshTokenRevoked(userId: number, tokenHash: string) {
    await safe(async () => {
        await redis
            .multi()
            .del(K.refresh(tokenHash))
            .srem(K.userTokens(userId), tokenHash)
            .set(K.revoked(tokenHash), String(userId), "EX", REFRESH_TTL_SEC)
            .exec();
    }, undefined);
}

/** Kill every session of a user (used when token reuse is detected). */
async function revokeAllUserRefreshTokens(userId: number) {
    await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
    });

    await safe(async () => {
        const hashes = await redis.smembers(K.userTokens(userId));
        const pipeline = redis.multi();
        for (const h of hashes) {
            pipeline.del(K.refresh(h));
            pipeline.set(K.revoked(h), String(userId), "EX", REFRESH_TTL_SEC);
        }
        pipeline.del(K.userTokens(userId));
        await pipeline.exec();
    }, undefined);
}

function clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/api/auth" });
}

/* -------------------------------------------------------------------------- */
/*                                  Handlers                                  */
/* -------------------------------------------------------------------------- */

export async function register(req: Request, res: Response) {
    try {
        const { phoneNo, name, password, userRole, workStation } = req.body;
        if (!phoneNo || !password) {
            return res.status(400).json({ message: "Phone number and password are required" });
        }

        const existing = await prisma.user.findUnique({ where: { phoneNo } });
        if (existing) {
            return res.status(409).json({ message: "Phone number is already registered" });
        }

        const hashed = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                password: hashed,
                name,
                userRole: userRole ?? "AUDITOR", // ADJUST default role to match your app
                userName: "username",
                phoneNo,
                workingStation: workStation,
            },
        });

        return res.status(201).json({ id: user.id, role: user.userRole });
    } catch (err) {
        console.error("[register]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { phoneNo, password } = req.body;
        if (!phoneNo || !password) {
            return res.status(400).json({ message: "Phone number and password are required" });
        }

        // ---- Brute-force protection (per IP + phone) ----
        const failKey = K.loginFails(req.ip ?? "unknown", String(phoneNo));
        const fails = Number((await safe(() => redis.get(failKey), null)) ?? 0);
        if (fails >= LOGIN_MAX_ATTEMPTS) {
            const retryAfter = await safe(() => redis.ttl(failKey), LOGIN_WINDOW_SEC);
            res.setHeader("Retry-After", String(Math.max(retryAfter, 1)));
            return res.status(429).json({ message: "Too many failed attempts. Try again later." });
        }

        const user = await prisma.user.findUnique({
            where: { phoneNo },
            select: {
                password: true,
                phoneNo: true,
                id: true,
                userRole: true,
                workingStation: true,
                name: true,
                isActive: true,
                permissionSections: {
                    select: { permittedSection: true, isPermitted: true },
                },
            },
        });

        const valid = user ? await comparePassword(password, user.password) : false;
        if (!user || !valid) {
            await safe(async () => {
                const count = await redis.incr(failKey);
                if (count === 1) await redis.expire(failKey, LOGIN_WINDOW_SEC);
            }, undefined);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.isActive === false) {
            return res.status(400).json({ message: "User not active yet. Please contact the admin." });
        }

        // Successful login -> reset the failure counter
        await safe(() => redis.del(failKey), 0);

        const { password: _pw, ...sessionUser } = user;

        const accessToken = signAccessToken({
            userId: String(user.id),
            workingStation: String(user.workingStation),
            role: permittedSectionNames(sessionUser),
        });

        const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

        await prisma.refreshToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });
        await cacheRefreshToken(user.id, tokenHash);

        // Warm the session cache so the first /me call is a hit
        await safe(
            () => redis.set(K.session(user.id), JSON.stringify(sessionUser), "EX", SESSION_CACHE_TTL_SEC),
            null
        );

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawToken, REFRESH_COOKIE_OPTIONS);

        return res.json({
            accessToken,
            user: {
                id: user.id,
                userName: user.name,
                phoneNo: user.phoneNo,
                role: user.permissionSections,
            },
        });
    } catch (err) {
        console.error("[login]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (!rawToken) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    const tokenHash = hashRefreshToken(rawToken);
    let lockAcquired = false;

    try {
        // 1. Reuse detection: this token was already rotated or revoked
        const reusedBy = await safe(() => redis.get(K.revoked(tokenHash)), null);
        if (reusedBy) {
            await revokeAllUserRefreshTokens(Number(reusedBy));
            clearRefreshCookie(res);
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        // 2. Lock so two parallel refreshes (e.g. two tabs) don't trip reuse detection
        const lock = await safe(
            () => redis.set(K.lock(tokenHash), "1", "EX", REFRESH_LOCK_TTL_SEC, "NX"),
            "OK" // Redis down -> proceed without a lock
        );
        if (lock !== "OK") {
            return res.status(409).json({ message: "Refresh already in progress, retry shortly" });
        }
        lockAcquired = true;

        // 3. Validate token: Redis fast path, DB fallback
        let userId: number;
        const cachedUserId = await safe(() => redis.get(K.refresh(tokenHash)), null);

        if (cachedUserId) {
            userId = Number(cachedUserId);
        } else {
            const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

            if (!stored || stored.revoked || stored.expiresAt < new Date()) {
                if (stored && stored.revoked) {
                    // Revoked token presented again (Redis marker lost) -> treat as reuse
                    await revokeAllUserRefreshTokens(stored.userId);
                } else if (stored) {
                    await prisma.refreshToken.update({
                        where: { id: stored.id },
                        data: { revoked: true },
                    });
                }
                clearRefreshCookie(res);
                return res.status(401).json({ message: "Invalid or expired refresh token" });
            }
            userId = stored.userId;
        }

        // 4. User must still exist and be active (cached read)
        const session = await getUserSession(userId);
        if (!session || session.isActive === false) {
            await prisma.refreshToken.updateMany({
                where: { tokenHash },
                data: { revoked: true },
            });
            await markRefreshTokenRevoked(userId, tokenHash);
            clearRefreshCookie(res);
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        // 5. Rotate: revoke old, issue new
        const { rawToken: newRawToken, tokenHash: newTokenHash, expiresAt } = generateRefreshToken();

        await prisma.$transaction([
            prisma.refreshToken.updateMany({
                where: { tokenHash, revoked: false },
                data: { revoked: true },
            }),
            prisma.refreshToken.create({
                data: { userId, tokenHash: newTokenHash, expiresAt },
            }),
        ]);

        await markRefreshTokenRevoked(userId, tokenHash);
        await cacheRefreshToken(userId, newTokenHash);

        const accessToken = signAccessToken({
            userId: String(session.id),
            role: permittedSectionNames(session),
            workingStation: String(session.workingStation),
        });

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRawToken, REFRESH_COOKIE_OPTIONS);
        return res.json({ accessToken });
    } catch (err) {
        console.error("[refresh]", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        if (lockAcquired) {
            await safe(() => redis.del(K.lock(tokenHash)), 0);
        }
    }
}

export async function logout(req: Request, res: Response) {
    try {
        const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

        if (rawToken) {
            const tokenHash = hashRefreshToken(rawToken);

            const stored = await prisma.refreshToken.findUnique({
                where: { tokenHash },
                select: { userId: true },
            });

            await prisma.refreshToken.updateMany({
                where: { tokenHash },
                data: { revoked: true },
            });

            if (stored) {
                await markRefreshTokenRevoked(stored.userId, tokenHash);
            }
        }

        clearRefreshCookie(res);
        return res.status(204).send();
    } catch (err) {
        console.error("[logout]", err);
        clearRefreshCookie(res);
        return res.status(204).send();
    }
}

export async function getMe(req: Request, res: Response) {
    // req.user is set by the `authenticate` middleware (see auth.routes.ts).
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const foundUser = await getUserSession(Number(userId));
        if (!foundUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (foundUser.isActive === false) {
            return res.status(403).json({ message: "User is not active" });
        }

        return res.json({
            id: foundUser.id,
            workingStation: foundUser.workingStation,
            name: foundUser.name,
            userRole: foundUser.permissionSections,
        });
    } catch (err) {
        console.error("[getMe]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}