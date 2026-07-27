import rateLimit from "express-rate-limit";

/**
 * General rate limiter applied to all API routes.
 * 300 requests per minute per IP — generous enough for normal use but
 * blocks runaway clients and brute-force enumeration attempts.
 * The /healthz route is excluded so uptime monitors are never throttled.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
  message: { error: "Too many requests. Please slow down and try again shortly." },
  statusCode: 429,
});

/**
 * Rate limiter for the login endpoint.
 * Allows up to 5 failed attempts per IP per 15-minute window.
 * Successful logins (2xx) are excluded from the count.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,                  // max 5 failed attempts per window
  skipSuccessfulRequests: true, // only count non-2xx responses
  standardHeaders: "draft-7", // emit RateLimit-* headers per RFC draft 7
  legacyHeaders: false,
  message: {
    error:
      "Too many login attempts. Please wait 15 minutes before trying again.",
  },
  statusCode: 429,
});

/**
 * Rate limiter for the forgot-password endpoint.
 * Allows up to 5 requests per IP per 15-minute window.
 * Prevents email bombing and token-generation abuse.
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many password reset requests. Please wait 15 minutes before trying again.",
  },
  statusCode: 429,
});
