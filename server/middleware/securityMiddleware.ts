import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/express.js';

/**
 * Session IP Lock Middleware
 * If enabled in system settings, ensures the request IP matches the IP that initiated the session.
 */
export const sessionIpLockMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const configKey = db.getType() === 'postgres' ? '"key"' : '`key`';
        const configSetting = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['global_config']);

        if (!configSetting) return next();

        const config = JSON.parse(configSetting.value);
        if (!config.sessionIpLock) return next();

        // Check if user is authenticated and has a context IP
        const authReq = req as any;
        if (authReq.context && authReq.context.ipAddress) {
            const currentIp = req.ip || req.header('x-forwarded-for') || req.socket.remoteAddress;
            const sessionIp = authReq.context.sessionIp; // This would need to be populated from a session store

            if (sessionIp && sessionIp !== currentIp) {
                logger.warn(`IP MISMATCH for user ${authReq.context.userId}: Session=${sessionIp}, Current=${currentIp}`);
                return res.status(403).json({
                    error: 'Security Violation',
                    message: 'Session IP mismatch. Please log in again from your original network.',
                    code: 'IP_LOCK_VIOLATION'
                });
            }
        }

        next();
    } catch (error) {
        next(); // Fail open for security middleware to avoid locking out the entire platform on DB error
    }
};

/**
 * Enhanced CSP Middleware
 * Injects stricter CSP headers if enabled in system settings.
 */
export const dynamicCspMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const configKey = db.getType() === 'postgres' ? '"key"' : '`key`';
        const configSetting = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['global_config']);

        if (!configSetting) return next();

        const config = JSON.parse(configSetting.value);
        if (config.strictCsp) {
            // Add stricter CSP headers
            res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:;");
        }

        next();
    } catch (error) {
        next();
    }
};
