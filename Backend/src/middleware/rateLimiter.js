const rateLimit = require('express-rate-limit');

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false
});

// Rate limiter for message routes
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute
  message: {
    error: 'Too many messages sent, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  messageLimiter,
  apiLimiter
};
