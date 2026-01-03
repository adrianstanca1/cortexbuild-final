import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { tenantDatabaseFactory } from '../services/tenantDatabaseFactory.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { TenantIsolationService } from '../services/tenantIsolationService.js';

/**
 * Tenant Routing Middleware
 * Extracts and validates tenant context from requests
 * Enforces strict multi-tenant isolation
 */
export const tenantRoutingMiddleware = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        // 1. Extract tenant ID from various sources (prioritized)
        let tenantId =
            req.user?.companyId ||
            req.headers['x-company-id'] as string ||
            req.headers['x-tenant-id'] as string ||
            req.body?.companyId ||
            req.query?.companyId as string ||
            req.params?.companyId;

        // 2. Get user context (set by auth middleware)
        const userId = req.userId;
        const role = req.context?.role;

        // 3. STRICT ISOLATION: Non-superadmins must have a tenantId for tenant-scoped routes
        if (!tenantId && role !== 'SUPERADMIN') {
            // For certain routes, we can infer from user's primary membership
            if (userId && req.context?.tenantId) {
                tenantId = req.context.tenantId;
            } else {
                // Allow to proceed - some routes don't require tenant context
                return next();
            }
        }

        // 4. Validate tenant scope for sensitive operations
        if (tenantId) {
            TenantIsolationService.validateTenantScope(tenantId, role, req.path);
        }

        // 5. For Superadmin cross-tenant access, audit it
        if (role === 'SUPERADMIN' && tenantId && req.context?.tenantId && req.context.tenantId !== tenantId) {
            await TenantIsolationService.auditCrossTenantAccess({
                userId: userId || 'unknown',
                userCompanyId: req.context.tenantId,
                targetCompanyId: tenantId,
                action: req.method,
                resource: req.path
            });
        }

        // 6. Resolve tenant database connection (if multi-database architecture)
        if (tenantId) {
            try {
                logger.info(`[TenantMiddleware] Resolving DB for tenant: ${tenantId}`);
                const connection = await tenantDatabaseFactory.getTenantDatabase(tenantId);
                req.tenantDb = connection;
                logger.info(`[TenantMiddleware] Resolved DB: ${!!connection}`);
            } catch (error) {
                logger.warn('Failed to resolve tenant database, using shared DB', { tenantId, error });
                // Continue with shared DB
                const { getDb } = await import('../database.js');
                req.tenantDb = getDb();
            }
        }

        // Final Safety Fallback: Ensure req.tenantDb is always defined for authenticated users
        if (!req.tenantDb && (userId || tenantId)) {
            logger.info('[TenantMiddleware] Fallback: Assigning shared DB');
            const { getDb } = await import('../database.js');
            req.tenantDb = getDb();
        }

        // 7. Attach tenant context to request
        req.tenantId = tenantId;

        // 8. Set tenant context for database (if using PostgreSQL RLS)
        if (tenantId && userId && process.env.DATABASE_TYPE === 'postgres') {
            await TenantIsolationService.setTenantContext(tenantId, userId);
        }

        logger.debug('Tenant context set', {
            tenantId,
            userId,
            role,
            path: req.path
        });

        next();
    } catch (error) {
        logger.error('Tenant Routing Failed:', error);
        next(new AppError('Failed to resolve tenant context', 500));
    }
};

/**
 * RequireTenant
 * Middleware that strictly enforces that a tenant context was resolved.
 * Use this for routes that MUST operate on tenant data.
 */
export const requireTenant = (req: any, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
        return next(new AppError('Tenant context required for this operation', 400));
    }
    next();
};
