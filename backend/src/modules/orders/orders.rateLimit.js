const rateLimit = require("express-rate-limit");

/**
 * Website intake limiter (more strict than global).
 * You can tune numbers later based on traffic.
 */
const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30, // 30 intakes per 15 min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Try again later.",
    },
  },
});

module.exports = { intakeLimiter };
