import { Request, Response, NextFunction } from 'express';
import { permissionService } from '../services/permissionService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { hasRolePrivilege, type UserRole } from '../types/rbac.js';

// Extend Request type to include tenantId
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            tenantId?: string;
            user?: any;
        }
    }
}

/**
 * Permission Middleware
 * Protects routes based on permissions and roles
 */

/**
 * Require a specific permission
 */
export const requirePermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const tenantId = req.tenantId;

            if (!user) {
                throw new AppError('Authentication required', 401);
            }

            const hasPermission = await permissionService.hasPermission(
                user.id,
                permission,
                tenantId
            );

            if (!hasPermission) {
                logger.warn(`Permission denied: ${user.id} lacks ${permission} in tenant ${tenantId}`);
                throw new AppError(`Permission denied: ${permission}`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Require any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const tenantId = req.tenantId;

            if (!user) {
                throw new AppError('Authentication required', 401);
            }

            const hasAny = await permissionService.hasAnyPermission(
                user.id,
                permissions,
                tenantId
            );

            if (!hasAny) {
                logger.warn(`Permission denied: ${user.id} lacks any of [${permissions.join(', ')}]`);
                throw new AppError(`Permission denied: requires one of ${permissions.join(', ')}`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Require all of the specified permissions
 */
export const requireAllPermissions = (permissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const tenantId = req.tenantId;

            if (!user) {
                throw new AppError('Authentication required', 401);
            }

            const hasAll = await permissionService.hasAllPermissions(
                user.id,
                permissions,
                tenantId
            );

            if (!hasAll) {
                logger.warn(`Permission denied: ${user.id} lacks all of [${permissions.join(', ')}]`);
                throw new AppError(`Permission denied: requires all of ${permissions.join(', ')}`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Require a minimum role level
 */
export const requireRole = (minRole: UserRole) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const tenantId = req.tenantId;

            if (!user) {
                throw new AppError('Authentication required', 401);
            }

            if (!tenantId) {
                throw new AppError('Tenant context required', 400);
            }

            // Get user's role in this tenant
            const { membershipService } = await import('../services/membershipService.js');
            const membership = await membershipService.getMembership(user.id, tenantId);

            if (!membership || membership.status !== 'active') {
                throw new AppError('No active membership in this tenant', 403);
            }

            if (!hasRolePrivilege(membership.role as UserRole, minRole)) {
                logger.warn(`Role check failed: ${user.id} has ${membership.role}, requires ${minRole}`);
                throw new AppError(`Insufficient role: requires ${minRole} or higher`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Require Superadmin role
 */
export const requireSuperadmin = requireRole('SUPERADMIN' as UserRole);

/**
 * Require Company Admin role or higher
 */
export const requireCompanyAdmin = requireRole('COMPANY_ADMIN' as UserRole);

/**
 * Require Project Manager role or higher
 */
export const requireProjectManager = requireRole('PROJECT_MANAGER' as UserRole);
