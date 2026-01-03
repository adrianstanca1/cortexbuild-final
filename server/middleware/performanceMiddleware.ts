import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Response caching middleware for GET requests
 * Adds Cache-Control headers based on route type
 */
export const responseCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const path = req.path;

    // Static asset paths - cache for 1 year
    if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return next();
    }

    // Health check - no cache
    if (path.includes('/health')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return next();
    }

    // Public routes (e.g., documentation) - cache for 5 minutes
    if (path.includes('/public') || path.includes('/docs')) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        return next();
    }

    // User-specific data - use ETag for conditional requests but no cache
    if (path.includes('/user/me') || path.includes('/notifications')) {
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        return next();
    }

    // List endpoints (projects, tasks) - short cache with revalidation
    if (path.match(/\/(projects|tasks|teams|companies)$/)) {
        res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
        return next();
    }

    // Default - no cache for authenticated API requests
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    next();
};

/**
 * Connection health monitoring middleware
 * Tracks and logs connection metrics
 */
export const connectionHealthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Track response completion
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Log slow requests (> 1 second)
        if (duration > 1000) {
            logger.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
        }

        // Log error responses
        if (res.statusCode >= 500) {
            logger.error(`Server error: ${req.method} ${req.path} returned ${res.statusCode}`);
        }
    });

    next();
};
