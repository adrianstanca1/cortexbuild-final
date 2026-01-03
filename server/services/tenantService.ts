import { BaseTenantService } from './baseTenantService.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { isSuperadmin, type TenantContext, type UserRole } from '../types/rbac.js';
import { membershipService } from './membershipService.js';
import { permissionService } from './permissionService.js';

// ============================================================================
// EXISTING TYPES (Preserved)
// ============================================================================

export interface TenantUsage {
    tenantId: string;
    currentUsers: number;
    currentProjects: number;
    currentStorage: number;
    currentApiCalls: number;
    period: string;
    limit: {
        users: number;
        projects: number;
        storage: number;
        apiCalls: number;
    };
}

export interface TenantAnalytics {
    usage: TenantUsage;
    trends: {
        usersGrowth: number;
        projectsGrowth: number;
        apiCallsGrowth: number;
    };
    topResources: Array<{
        type: string;
        count: number;
    }>;
}

// ============================================================================
// RBAC TENANT SERVICE (New)
// ============================================================================

/**
 * TenantService
 * Manages tenant (company) operations and access validation
 */
export class TenantService extends BaseTenantService {
    constructor() {
        super('TenantService');
    }

    /**
     * Validate that a user has access to a tenant
     */
    async validateTenantAccess(userId: string, tenantId: string): Promise<void> {
        try {
            const membership = await membershipService.getMembership(userId, tenantId);
            if (!membership || membership.status !== 'active') {
                throw new AppError('No active membership in this tenant', 403);
            }
        } catch (error) {
            logger.error(`Tenant access validation failed: ${error}`);
            throw error;
        }
    }

    /**
     * Get tenant context for a user
     */
    async getTenantContext(userId: string, tenantId: string): Promise<TenantContext> {
        // Platform level context support (Multi-tenant global view)
        if (tenantId === 'platform-admin') {
            const db = this.getDb();
            const user = await db.get('SELECT name, role FROM users WHERE id = ?', [userId]);

            if (!user) {
                throw new AppError('User not found', 404);
            }

            if (!isSuperadmin(user.role as UserRole)) {
                throw new AppError('Unauthorized: Platform context requires SUPERADMIN level', 403);
            }

            return {
                tenantId: 'platform-admin',
                userId,
                userName: user.name,
                role: user.role as UserRole,
                permissions: ['*'], // Full access for platform admins
                isSuperadmin: true,
            };
        }

        const membership = await membershipService.getMembership(userId, tenantId);

        if (!membership || membership.status !== 'active') {
            throw new AppError('No active membership in this tenant', 403);
        }

        const permissions = await permissionService.getUserPermissions(userId, tenantId);

        // Fetch user name
        const db = this.getDb();
        const user = await db.get('SELECT name FROM users WHERE id = ?', [userId]);

        return {
            tenantId,
            userId,
            userName: user?.name,
            role: membership.role as UserRole,
            permissions,
            isSuperadmin: isSuperadmin(membership.role as UserRole),
        };
    }

    /**
     * Get all tenants for a user
     */
    async getUserTenants(userId: string) {
        const db = this.getDb();

        const rows = await db.all(
            `SELECT c.* 
       FROM companies c
       JOIN memberships m ON c.id = m.companyId
       WHERE m.userId = ? AND m.status = 'active'
       ORDER BY c.name`,
            [userId]
        );

        return rows.map(row => ({
            ...row,
            settings: row.settings ? JSON.parse(row.settings) : {},
            subscription: row.subscription ? JSON.parse(row.subscription) : {},
            features: row.features ? JSON.parse(row.features) : [],
        }));
    }

    /**
     * Get tenant by ID
     */
    async getTenant(id: string) {
        const db = this.getDb();

        const row = await db.get('SELECT * FROM companies WHERE id = ?', [id]);

        if (!row) {
            return null;
        }

        return {
            ...row,
            settings: row.settings ? JSON.parse(row.settings) : {},
            subscription: row.subscription ? JSON.parse(row.subscription) : {},
            features: row.features ? JSON.parse(row.features) : [],
        };
    }

    /**
     * Create a new tenant (Superadmin only)
     */
    async createTenant(data: any) {
        const db = this.getDb();

        const id = data.id || uuidv4();
        const now = new Date().toISOString();

        const settings = data.settings ? JSON.stringify(data.settings) : '{}';
        const subscription = data.subscription ? JSON.stringify(data.subscription) : '{}';
        const features = data.features ? JSON.stringify(data.features) : '[]';

        await db.run(
            `INSERT INTO companies (
        id, name, plan, status, users, projects, mrr, joinedDate,
        description, logo, website, email, phone, address, city, state, zipCode, country,
        settings, subscription, features, maxUsers, maxProjects, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, data.name, data.plan, data.status, data.users || 0, data.projects || 0,
                data.mrr || 0, data.joinedDate || now, data.description, data.logo,
                data.website, data.email, data.phone, data.address, data.city, data.state,
                data.zipCode, data.country, settings, subscription, features,
                data.maxUsers || 1000, data.maxProjects || 1000, now, now
            ]
        );

        // For tenant creation, we use the tenantId as the companyId itself
        await this.auditAction(db, 'createTenant', 'system', id, 'companies', id, { name: data.name }); // Use system for now as actor

        logger.info(`Tenant created: ${data.name} (${id})`);

        return this.getTenant(id);
    }

    /**
     * Update tenant
     */
    async updateTenant(id: string, updates: any) {
        const db = this.getDb();
        const now = new Date().toISOString();

        const fields: string[] = [];
        const values: any[] = [];

        // Handle JSON fields
        if (updates.settings) {
            updates.settings = JSON.stringify(updates.settings);
        }
        if (updates.subscription) {
            updates.subscription = JSON.stringify(updates.subscription);
        }
        if (updates.features) {
            updates.features = JSON.stringify(updates.features);
        }

        // Build update query
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        fields.push('updatedAt = ?');
        values.push(now);
        values.push(id);

        await db.run(
            `UPDATE companies SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        await this.auditAction(db, 'updateTenant', 'system', id, 'companies', id, updates);

        logger.info(`Tenant updated: ${id}`);

        return this.getTenant(id);
    }

    /**
     * Suspend a tenant
     */
    async suspendTenant(id: string): Promise<void> {
        await this.updateTenant(id, { status: 'Suspended' });
        logger.info(`Tenant suspended: ${id}`);
    }

    /**
     * Delete a tenant (Superadmin only)
     */
    async deleteTenant(id: string): Promise<void> {
        const db = this.getDb();

        const result = await db.run('DELETE FROM companies WHERE id = ?', [id]);

        if (result.changes === 0) {
            throw new AppError('Tenant not found', 404);
        }

        await this.auditAction(db, 'deleteTenant', 'system', id, 'companies', id);

        logger.info(`Tenant deleted: ${id}`);
    }

    /**
     * Reactivate a suspended tenant
     */
    async reactivateTenant(id: string): Promise<void> {
        await this.updateTenant(id, { status: 'Active' });
        logger.info(`Tenant reactivated: ${id}`);
    }

    /**
     * Update tenant resource limits (Superadmin only)
     */
    async updateTenantLimits(id: string, limits: { maxUsers?: number; maxProjects?: number; plan?: string }): Promise<void> {
        await this.updateTenant(id, limits);
        logger.info(`Tenant limits updated: ${id} - ${JSON.stringify(limits)}`);
    }
}

// ============================================================================
// EXISTING USAGE FUNCTIONS (Preserved)
// ============================================================================

/**
 * Get current usage for a tenant
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
    const db = getDb();

    // Get tenant limits
    const companies = await db.all('SELECT * FROM companies WHERE id = ?', [tenantId]);
    if (companies.length === 0) {
        throw new Error('Tenant not found');
    }
    const company = companies[0];

    // Count current resources
    const projectsCount = await db.all(
        'SELECT COUNT(*) as count FROM projects WHERE companyId = ?',
        [tenantId]
    );
    const usersCount = await db.all(
        'SELECT COUNT(*) as count FROM team WHERE companyId = ?',
        [tenantId]
    );

    // Get API calls for current period
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const apiCallsCount = await db.all(
        `SELECT SUM(amount) as count FROM tenant_usage_logs 
     WHERE companyId = ? AND createdAt LIKE ?`,
        [tenantId, `${currentPeriod}%`]
    );

    // Get storage usage
    const storageCount = await db.all(
        `SELECT SUM(amount) as count FROM tenant_usage_logs 
     WHERE companyId = ? AND resourceType = 'storage'`,
        [tenantId]
    );

    return {
        tenantId,
        currentUsers: usersCount[0].count || 0,
        currentProjects: projectsCount[0].count || 0,
        currentStorage: storageCount[0]?.count || 0,
        currentApiCalls: apiCallsCount[0]?.count || 0,
        period: currentPeriod,
        limit: {
            users: 1000,
            projects: 1000,
            storage: 100 * 1024 * 1024 * 1024, // 100GB
            apiCalls: 1000000
        }
    };
}

/**
 * Log resource usage
 */
export async function logUsage(
    tenantId: string,
    resourceType: 'api_call' | 'storage' | 'user' | 'project',
    amount: number = 1,
    metadata?: any
): Promise<void> {
    const db = getDb();
    const id = uuidv4();

    await db.run(
        `INSERT INTO tenant_usage_logs (id, companyId, resourceType, amount, createdAt, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [
            id,
            tenantId,
            resourceType,
            amount,
            new Date().toISOString(),
            metadata ? JSON.stringify(metadata) : null
        ]
    );
}

/**
 * Check if tenant has exceeded limits
 */
export async function checkTenantLimits(
    tenantId: string,
    resourceType: 'users' | 'projects' | 'storage' | 'apiCalls'
): Promise<{ allowed: boolean; current: number; limit: number }> {
    const usage = await getTenantUsage(tenantId);

    const current = usage[`current${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}` as keyof TenantUsage] as number;
    const limit = usage.limit[resourceType];

    return {
        allowed: current < limit,
        current,
        limit
    };
}

/**
 * Get tenant analytics with trends
 */
export async function getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    const db = getDb();
    const usage = await getTenantUsage(tenantId);

    // Calculate growth trends (compare to previous period)
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevPeriod = prevDate.toISOString().substring(0, 7);

    const prevApiCalls = await db.all(
        `SELECT SUM(amount) as count FROM tenant_usage_logs 
     WHERE companyId = ? AND resourceType = 'api_call' 
     AND createdAt LIKE ?`,
        [tenantId, `${prevPeriod}%`]
    );

    const apiCallsGrowth = prevApiCalls[0]?.count
        ? ((usage.currentApiCalls - prevApiCalls[0].count) / prevApiCalls[0].count) * 100
        : 0;

    // Get top resource types
    const topResources = await db.all(
        `SELECT resourceType as type, COUNT(*) as count 
     FROM tenant_usage_logs 
     WHERE companyId = ? 
     GROUP BY resourceType 
     ORDER BY count DESC 
     LIMIT 5`,
        [tenantId]
    );

    return {
        usage,
        trends: {
            usersGrowth: 0, // Would need historical data
            projectsGrowth: 0, // Would need historical data
            apiCallsGrowth
        },
        topResources
    };
}

// Export singleton instance and legacy functions
export const tenantService = new TenantService();

export default {
    getTenantUsage,
    logUsage,
    checkTenantLimits,
    getTenantAnalytics,
    tenantService
};
