import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface RateLimitConfig {
    windowMs: number;
    max: number;
    message?: string;
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter middleware
 */
export const rateLimit = (options: RateLimitConfig) => {
    const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const key = `${req.path}:${ip}`;
        const now = Date.now();

        const record = memoryStore.get(key);

        if (!record || now > record.resetTime) {
            // New window
            memoryStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        record.count++;

        if (record.count > max) {
            logger.warn(`Rate limit exceeded for IP ${ip} on path ${req.path}`);
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message,
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    };
};

// Periodic cleanup of the memory store
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
        if (now > record.resetTime) {
            memoryStore.delete(key);
        }
    }
}, 300000); // Every 5 minutes
