/**
 * Tenant Isolation Service
 * Enforces strict multi-tenant isolation at the application layer
 */

import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export class TenantIsolationService {
    /**
     * Validate that a query is properly scoped to a tenant
     */
    static validateTenantScope(companyId: string | null, role: string, operation: string) {
        // Superadmin can access any tenant (with audit)
        if (role === 'SUPERADMIN') {
            logger.warn(`SUPERADMIN cross-tenant access: ${operation}`, { companyId });
            return true;
        }

        // All other roles must have a companyId
        if (!companyId) {
            throw new AppError('Tenant scope required for this operation', 403);
        }

        return true;
    }

    /**
     * Ensure all database queries include companyId filter
     */
    static async setTenantContext(companyId: string, userId: string) {
        const db = getDb();

        // For PostgreSQL with RLS
        if (process.env.DATABASE_TYPE === 'postgres') {
            await db.run(`
        SET LOCAL app.current_tenant = $1;
        SET LOCAL app.current_user = $2;
      `, [companyId, userId]);
        }

        // For MySQL/SQLite - validate all queries manually
    }

    /**
     * Audit cross-tenant access attempts
     */
    static async auditCrossTenantAccess(params: {
        userId: string;
        userCompanyId: string;
        targetCompanyId: string;
        action: string;
        resource: string;
        justification?: string;
    }) {
        const db = getDb();

        await db.run(`
      INSERT INTO audit_logs (
        id, companyId, userId, action, resource, resourceId, 
        changes, status, createdAt, ipAddress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            crypto.randomUUID(),
            'PLATFORM',
            params.userId,
            'CROSS_TENANT_ACCESS',
            params.resource,
            params.targetCompanyId,
            JSON.stringify({
                userCompany: params.userCompanyId,
                targetCompany: params.targetCompanyId,
                action: params.action,
                justification: params.justification
            }),
            'success',
            new Date().toISOString(),
            'system'
        ]);

        logger.warn('Cross-tenant access logged', params);
    }

    /**
     * Validate that a resource belongs to the tenant
     */
    static async validateResourceOwnership(
        resourceType: string,
        resourceId: string,
        companyId: string
    ): Promise<boolean> {
        const db = getDb();

        const tableName = this.getTableName(resourceType);
        const result = await db.get(
            `SELECT id FROM ${tableName} WHERE id = ? AND companyId = ?`,
            [resourceId, companyId]
        );

        return !!result;
    }

    /**
     * Prevent enumeration attacks
     */
    static validateResourceAccess(resource: any, companyId: string) {
        if (!resource) {
            // Return 404 instead of 403 to prevent enumeration
            throw new AppError('Resource not found', 404);
        }

        if (resource.companyId !== companyId) {
            // Return 404 instead of 403 to prevent enumeration
            throw new AppError('Resource not found', 404);
        }

        return true;
    }

    /**
     * Get table name for resource type
     */
    private static getTableName(resourceType: string): string {
        const mapping: Record<string, string> = {
            project: 'projects',
            task: 'tasks',
            document: 'documents',
            user: 'users',
            team_member: 'team',
            client: 'clients',
            // ... add all resource types
        };

        return mapping[resourceType] || resourceType;
    }

    /**
     * Emergency break-glass access (Superadmin only)
     */
    static async grantEmergencyAccess(params: {
        superadminId: string;
        targetCompanyId: string;
        justification: string;
        duration: number; // minutes
    }) {
        const db = getDb();

        // Create emergency access record
        const emergencyId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + params.duration * 60 * 1000);

        await db.run(`
      INSERT INTO emergency_access (
        id, superadminId, companyId, justification, expiresAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
            emergencyId,
            params.superadminId,
            params.targetCompanyId,
            params.justification,
            expiresAt.toISOString(),
            new Date().toISOString()
        ]);

        // Audit the emergency access
        await this.auditCrossTenantAccess({
            userId: params.superadminId,
            userCompanyId: 'PLATFORM',
            targetCompanyId: params.targetCompanyId,
            action: 'EMERGENCY_ACCESS_GRANTED',
            resource: 'COMPANY',
            justification: params.justification
        });

        logger.error('EMERGENCY ACCESS GRANTED', params);

        return emergencyId;
    }
}

export const tenantIsolationService = new TenantIsolationService();
