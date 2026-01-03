import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Limit each IP to 10000 requests per windowMs (increased from 1000)
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 60 // 1 minute retry for better UX
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
    legacyHeaders: false,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit uploads
    message: {
        error: 'Too many file uploads, please try again later.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Webhook rate limiter
export const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: {
        error: 'Webhook rate limit exceeded.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});
