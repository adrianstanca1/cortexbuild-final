import { Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { checkTenantLimits } from '../services/tenantService.js';
import crypto from 'crypto';

interface ValidationResult {
    valid: boolean;
    reason?: string;
    severity?: 'info' | 'warning' | 'critical';
}

/**
 * API Validation Middleware
 * Comprehensive request validation for tenant isolation and security
 */

/**
 * Validate that a resource belongs to the user's tenant
 */
export const validateResourceOwnership = (resourceTable: string, resourceIdParam: string = 'id') => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId, role, isSuperadmin } = req.context || {};
            const resourceId = req.params[resourceIdParam];

            if (!userId || !resourceId) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // SUPERADMIN bypass (with audit)
            if (isSuperadmin) {
                await auditSecurityEvent(req, 'SUPERADMIN_RESOURCE_ACCESS', 'warning', {
                    resourceTable,
                    resourceId,
                    tenantId
                });
                return next();
            }

            // Validate resource ownership
            const db = await getDb();
            const resource = await db.get(
                `SELECT companyId FROM ${resourceTable} WHERE id = ?`,
                [resourceId]
            );

            if (!resource) {
                await auditSecurityEvent(req, 'RESOURCE_NOT_FOUND', 'info', {
                    resourceTable,
                    resourceId
                });
                return res.status(404).json({ error: 'Resource not found' });
            }

            if (resource.companyId !== tenantId) {
                logger.debug(`Resource ownership mismatch: resource=${resource.companyId} tenant=${tenantId} id=${resourceId}`);
                await auditSecurityEvent(req, 'CROSS_TENANT_ACCESS_ATTEMPT', 'critical', {
                    resourceTable,
                    resourceId,
                    resourceCompanyId: resource.companyId,
                    userTenantId: tenantId
                });
                return res.status(403).json({ error: 'Access denied: Resource belongs to different tenant' });
            }

            next();
        } catch (error) {
            logger.error('Resource ownership validation error:', error);
            res.status(500).json({ error: 'Validation error' });
        }
    };
};

/**
 * Validate tenant membership is active
 */
export const validateActiveMembership = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId, isSuperadmin } = req.context || {};

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // SUPERADMIN bypass
        if (isSuperadmin) {
            return next();
        }

        const db = await getDb();
        const membership = await db.get(
            `SELECT status FROM memberships WHERE userId = ? AND companyId = ? AND status = 'active'`,
            [userId, tenantId]
        );

        if (!membership) {
            await auditSecurityEvent(req, 'INACTIVE_MEMBERSHIP_ACCESS', 'warning', {
                userId,
                tenantId
            });
            return res.status(403).json({ error: 'No active membership in this tenant' });
        }

        next();
    } catch (error) {
        logger.error('Membership validation error:', error);
        res.status(500).json({ error: 'Validation error' });
    }
};

/**
 * Prevent ID enumeration attacks
 */
export const preventIdEnumeration = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.context || {};
        const requestedIds = extractIdsFromRequest(req);

        // Track ID access patterns
        const db = await getDb();
        const recentAttempts = await db.get(
            `SELECT COUNT(*) as count FROM audit_logs 
       WHERE userId = ? 
       AND action = 'ID_ENUMERATION_ATTEMPT'
       AND createdAt > datetime('now', '-5 minutes')`,
            [userId]
        );

        if (recentAttempts && recentAttempts.count > 50) {
            await auditSecurityEvent(req, 'SUSPICIOUS_ID_ENUMERATION', 'critical', {
                attemptCount: recentAttempts.count,
                requestedIds
            });
            return res.status(429).json({ error: 'Too many requests' });
        }

        next();
    } catch (error) {
        logger.error('ID enumeration prevention error:', error);
        next(); // Don't block on error
    }
};

/**
 * Validate request body doesn't contain cross-tenant references
 */
export const validateRequestBody = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { tenantId, isSuperadmin } = req.context || {};
        const body = req.body;

        if (!body || isSuperadmin) {
            return next();
        }

        // Check for companyId in body
        if (body.companyId && body.companyId !== tenantId) {
            await auditSecurityEvent(req, 'CROSS_TENANT_BODY_INJECTION', 'critical', {
                providedCompanyId: body.companyId,
                userTenantId: tenantId
            });

            // Auto-correct to user's tenant
            body.companyId = tenantId;
            logger.warn(`Auto-corrected companyId in request body for user ${req.context.userId}`);
        }

        next();
    } catch (error) {
        logger.error('Request body validation error:', error);
        next();
    }
};

/**
 * Rate limiting per tenant
 */
const tenantRateLimits = new Map<string, { count: number; resetAt: number }>();

export const tenantRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { tenantId } = req.context || {};

            if (!tenantId) {
                return next();
            }

            const now = Date.now();
            const limit = tenantRateLimits.get(tenantId);

            if (!limit || now > limit.resetAt) {
                tenantRateLimits.set(tenantId, { count: 1, resetAt: now + windowMs });
                return next();
            }

            if (limit.count >= maxRequests) {
                await auditSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', 'warning', {
                    tenantId,
                    limit: maxRequests,
                    window: windowMs
                });
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((limit.resetAt - now) / 1000)
                });
            }

            limit.count++;
            next();
        } catch (error) {
            logger.error('Rate limit error:', error);
            next();
        }
    };
};

/**
 * Helper: Audit security events
 */
async function auditSecurityEvent(
    req: any,
    action: string,
    severity: 'info' | 'warning' | 'critical',
    metadata: Record<string, any>
) {
    try {
        const db = await getDb();
        await db.run(
            `INSERT INTO audit_logs (id, userId, companyId, action, resource, details, severity, ipAddress, userAgent, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crypto.randomUUID(),
                req.context?.userId || 'anonymous',
                req.context?.tenantId || 'system',
                action,
                'security',
                JSON.stringify(metadata),
                severity,
                req.ip,
                req.headers['user-agent'],
                new Date().toISOString()
            ]
        );
    } catch (error) {
        logger.error('Audit logging error:', error);
    }
}

/**
 * Helper: Extract IDs from request
 */
function extractIdsFromRequest(req: any): string[] {
    const ids: string[] = [];

    // From params
    Object.values(req.params).forEach((value: any) => {
        if (typeof value === 'string' && value.match(/^[a-f0-9-]{36}$/i)) {
            ids.push(value);
        }
    });

    // From query
    Object.values(req.query).forEach((value: any) => {
        if (typeof value === 'string' && value.match(/^[a-f0-9-]{36}$/i)) {
            ids.push(value);
        }
    });

    return ids;
}

/**
 * Validate tenant resource limits
 */
export const validateTenantLimits = (resourceType: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { tenantId, isSuperadmin } = req.context || {};

            if (!tenantId || isSuperadmin) {
                return next();
            }

            const { allowed, current, limit } = await checkTenantLimits(tenantId, resourceType as any);

            if (!allowed) {
                await auditSecurityEvent(req, 'TENANT_LIMIT_EXCEEDED', 'warning', {
                    resourceType,
                    current,
                    limit
                });
                return res.status(403).json({ error: `${resourceType} limit exceeded (${current}/${limit})` });
            }

            next();
        } catch (error) {
            logger.error('Tenant limit validation error:', error);
            // Fail safe: Allow if check fails? Or block?
            // Blocking is safer for quotas.
            res.status(500).json({ error: 'Validation error' });
        }
    };
};

/**
 * Composite validation middleware for protected routes
 */
export const protectTenantResource = (resourceTable: string, resourceIdParam: string = 'id') => {
    return [
        validateActiveMembership,
        validateResourceOwnership(resourceTable, resourceIdParam),
        preventIdEnumeration
    ];
};
