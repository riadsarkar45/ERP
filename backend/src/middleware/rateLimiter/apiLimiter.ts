import rateLimit from "express-rate-limit";
import { Request } from "express";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  keyGenerator: (req: Request): string => {
    const forwarded = req.headers["x-forwarded-for"];

    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ??
      req.socket.remoteAddress ??
      "unknown";

    return ip.trim();
  },

  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime as Date | undefined;

    const retryAfterSeconds = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : null;

    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      retryAfter: retryAfterSeconds,
    });
  },
});