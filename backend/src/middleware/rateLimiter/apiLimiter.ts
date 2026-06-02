import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 15 minutes
  limit: 2, // 100 requests

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded",
      retryAfter: (req as any).rateLimit?.resetTime,
    });
  },
});