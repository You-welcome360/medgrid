import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests

  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    // Rate limit based on IP or email body key if present
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return email ? `${ip}_${email}` : ip;
  },
});
