import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { tenantService } from '../services/tenantService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * contextMiddleware
 * Populates req.context with full TenantContext (tenantId, userId, role, permissions)
 * This becomes the single source of truth for all downstream logic
 */
export const contextMiddleware = async (req: any, res: Response, next: NextFunction) => {
    // List of public paths that don't require context/auth
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/users/forgot-password',
        '/api/users/reset-password-confirm',
        '/api/invitations/accept',
        '/api/invitations/verify',
        '/api/health',
        '/api/live',
        '/live'
    ];

    if (publicPaths.some(path => req.originalUrl?.startsWith(path)) || req.originalUrl?.includes('/api/client-portal/shared/')) {
        return next();
    }

    try {
        const tenantId = req.tenantId;
        const userId = req.userId;

        const isSuperAdmin = req.user?.user_metadata?.role === 'super_admin' || req.user?.user_metadata?.role === 'SUPERADMIN';

        if ((!tenantId && !isSuperAdmin) || !userId || userId === 'anonymous' || userId === 'demo-user') {
            // STRICT MODE: Only allow implicit demo context in development
            // Check environment (default to development if missing/undefined in local)
            const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.ENABLE_DEMO_AUTH === 'true';

            if (isDev) {
                req.context = {
                    tenantId: tenantId || 'c1',
                    userId: userId || 'demo-user',
                    role: isSuperAdmin ? 'SUPERADMIN' : 'OPERATIVE',
                    permissions: ['*'],
                    isSuperadmin: isSuperAdmin
                };
                return next();
            }

            // In production, incomplete context is a 403
            return res.status(403).json({ error: 'Valid security context required' });
        }

        // Fetch full context from services
        const context = await tenantService.getTenantContext(userId, tenantId);
        req.context = context;

        next();
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger.error('Failed to populate tenant context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
