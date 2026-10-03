const rateLimit = require("express-rate-limit");

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });

module.exports = {
  apiLimiter: limiter(1, 300, "Too many requests. Please slow down."),
  authLimiter: limiter(15, 20, "Too many login attempts. Please try again in 15 minutes."),
  publicWriteLimiter: limiter(15, 40, "Too many submissions. Please try again later."),
};
