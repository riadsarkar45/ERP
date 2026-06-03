import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../../lib/redis";

export const apiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    store: new RedisStore({
      sendCommand: (...args: string[]) =>
        redisClient.sendCommand(args),
    }),

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
};