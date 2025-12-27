const rateLimit = require("express-rate-limit");

// Global limiter (protects API, not too aggressive to avoid hurting operations)
const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300, // 300 req/min per IP (adjust later if needed)
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

module.exports = { rateLimiter };
