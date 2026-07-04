import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,

  message: {
    message: "Too many login attempts. Try again later.",
  },

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => req.body?.email || "unknown",
});