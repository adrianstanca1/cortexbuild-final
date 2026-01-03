import { Response, NextFunction } from 'express';
import { permissionService } from '../services/permissionService.js';
import { UserRole } from '../types/rbac.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (allowedRoles: string[]) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId, role } = req.context || {};

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!role || !allowedRoles.includes(role)) {
                return res.status(403).json({
                    error: 'Insufficient role permissions',
                    required: allowedRoles,
                    current: role
                });
            }

            next();
        } catch (error) {
            logger.error('requireRole middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};

/**
 * Middleware to check resource-level permissions
 * Unified to use permissionService and req.context
 */
export const requirePermission = (
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId, isSuperadmin: contextSuperadmin } = req.context || {};

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // In dev mode with demo user, bypass permission checks if context says superadmin
            if (contextSuperadmin) {
                return next();
            }

            const permission = `${resource}.${action}`;
            const hasAccess = await permissionService.hasPermission(userId, permission, tenantId);

            if (!hasAccess) {
                logger.warn(`Permission denied: User ${userId} attempted ${action} on ${resource} in tenant ${tenantId}`);
                return res.status(403).json({
                    error: `Permission denied: ${action} on ${resource}`
                });
            }

            next();
        } catch (error) {
            logger.error('requirePermission middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};

/**
 * Middleware to check if user is SUPERADMIN
 */
export const requireSuperAdmin = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { userId, role } = req.context || {};

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (role !== UserRole.SUPERADMIN) {
            logger.warn(`SUPERADMIN access denied: User ${userId} with role ${role} attempted to access SUPERADMIN resource`);
            return res.status(403).json({
                error: 'SUPERADMIN access required',
                current: role
            });
        }

        next();
    } catch (error) {
        logger.error('requireSuperAdmin middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

