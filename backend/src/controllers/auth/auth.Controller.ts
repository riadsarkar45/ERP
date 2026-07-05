import { Request, Response } from "express";

import prisma from "../../database/prismaClient/prisma";
import { comparePassword, hashPassword } from "../../utils/auth/password.util";
import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_MAX_AGE_MS, signAccessToken } from "../../utils/auth/token.util";

const isProd = process.env.NODE_ENV === "production";
console.log(isProd, "isProd");
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd, // requires HTTPS in prod (Render gives you this)
    sameSite: isProd ? ("none" as const) : ("lax" as const), // use "none" if frontend (Vercel) and backend (Render) are on different domains and you need cross-site cookies
    path: "/api/auth", // scope cookie to auth routes only
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};


export async function register(req: Request, res: Response) {
    const { phoneNo, name, password, role } = req.body;
    if (!phoneNo || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { phoneNo } });
    if (existing) {
        return res.status(409).json({ message: "Email is already registered" });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            password: hashed,
            name,
            userRole: role ?? "AUDITOR", // ADJUST default role to match your app
            userName: "username",
            phoneNo: phoneNo,
        },
    });

    return res.status(201).json({
        id: user.id,
        role: user.userRole
    });
}

export async function login(req: Request, res: Response) {
    const { phoneNo, password } = req.body;
    console.log(req.body, "body");
    if (!phoneNo || !password) {
        return res.status(400).json({ message: "Phone number and password are required" });
    }

    const user = await prisma.user.findUnique({
        where: { phoneNo: phoneNo },
        select: {
            password: true,
            phoneNo: true,
            id: true,
            userRole: true,
            name: true,
        }
    });
    console.log(user, "ussssser");
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken({ userId: String(user.id), role: String(user.userRole) });
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
        accessToken,
        user: { id: user.id, userName: user.name, phoneNo: user.phoneNo, role: user.userRole },
    });
}

export async function refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    // console.log(rawToken, "raaaaaaaaaaw toooooooooken");
    if (!rawToken) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    const tokenHash = hashRefreshToken(rawToken);

    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
        // If it exists but is invalid, revoke it defensively (handles reuse-of-stolen-token case)
        if (stored && !stored.revoked) {
            await prisma.refreshToken.update({
                where: { id: stored.id },
                data: { revoked: true },
            });
        }
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/api/auth" });
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Rotate: revoke the old token, issue a new one
    const { rawToken: newRawToken, tokenHash: newTokenHash, expiresAt } =
        generateRefreshToken();

    await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revoked: true },
        }),
        prisma.refreshToken.create({
            data: { userId: stored.userId, tokenHash: newTokenHash, expiresAt },
        }),
    ]);

    const accessToken = signAccessToken({
        userId: String(stored.user.id),
        role: String(stored.user.userRole),
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRawToken, REFRESH_COOKIE_OPTIONS);

    return res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (rawToken) {
        const tokenHash = hashRefreshToken(rawToken);
        await prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { revoked: true },
        });
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/api/auth" });
    return res.status(204).send();
}

export async function getMe(req: Request, res: Response) {
    // req.user is set by the `authenticate` middleware — this route must be
    // mounted with `authenticate` in front of it (see auth.routes.ts).
    const userId = req.user?.userId;
    console.log(req.user, "nonoooooo");
    if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const foundUser = await prisma.user.findUnique({ where: { id: Number(userId) } });

    if (!foundUser) {
        return res.status(404).json({ message: "User not found" });
    }

    console.log(foundUser, "found user");

    return res.json({
        id: foundUser.id,
        userName: foundUser.userName,
        name: foundUser.name,
        phoneNo: foundUser.phoneNo,
        userRole: foundUser.userRole,
        // workStation: foundUser.workStation, // uncomment once that column exists on `user`
    });
}