import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload, verifyAccessToken } from "../utils/auth/token.util";
import prisma from "../database/prismaClient/prisma";

// Extend Express's Request type so req.user is typed everywhere.
// Put this augmentation in a shared .d.ts if you already have one.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Missing or malformed authorization header",
    });
  }

  const token = authHeader.slice("Bearer ".length);

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }

  const userId = Number(payload?.userId);
  if (!Number.isInteger(userId)) {
    return res.status(401).json({ message: "Invalid access token" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User not found or deactivated",
      });
    }

    req.user = payload;
    next();
  } catch (err) {
    next(err); // DB failure -> 500 via your error handler
  }
}

/** Optional role-gate. Usage: authorize("admin") or authorize("admin", "manager") */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}