import { UserRole } from '../types.js';
import { getDb } from '../database.js';
import crypto from 'crypto';

interface OptionalPermission {
    id: string;
    userId: string;
    companyId: string;
    permission: string;
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date | null;
    constraints?: Record<string, any>;
}

interface BreakGlassAccess {
    id: string;
    adminId: string;
    targetCompanyId: string;
    justification: string;
    grantedAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired' | 'revoked';
}

/**
 * Permission Service - Granular RBAC checks based on permission matrix
 */
class PermissionService {
    /**
     * Platform Administration Permissions
     */

    canCreateCompany(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    canProvisionDatabase(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    canInviteCompanyAdmin(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    canBroadcastMessages(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    canViewPlatformLogs(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    /**
     * Tenant User Management Permissions
     */

    async canInviteTenantUsers(
        role: UserRole,
        userId: string,
        companyId: string
    ): Promise<boolean> {
        if (role === UserRole.COMPANY_ADMIN) return true;
        if (role === UserRole.SUPERADMIN) return false;
        if (role === UserRole.SUPERVISOR) {
            return await this.hasOptionalPermission(userId, companyId, 'invite_users');
        }
        return false;
    }

    async canManageTenantRoles(
        role: UserRole,
        userId: string,
        companyId: string,
        isBreakGlass: boolean = false
    ): Promise<boolean> {
        if (role === UserRole.COMPANY_ADMIN) return true;
        if (role === UserRole.SUPERADMIN && isBreakGlass) {
            return await this.hasActiveBreakGlassAccess(userId, companyId);
        }
        if (role === UserRole.SUPERVISOR) {
            return await this.hasOptionalPermission(userId, companyId, 'manage_roles');
        }
        return false;
    }

    /**
     * Document Access Permissions
     */

    async canAccessDocuments(
        role: UserRole,
        userId: string,
        companyId: string,
        documentCompanyId: string,
        isBreakGlass: boolean = false
    ): Promise<boolean> {
        if (role === UserRole.COMPANY_ADMIN && companyId === documentCompanyId) {
            return true;
        }
        if (role === UserRole.SUPERADMIN && isBreakGlass) {
            return await this.hasActiveBreakGlassAccess(userId, documentCompanyId);
        }
        if ([UserRole.SUPERVISOR, UserRole.OPERATIVE].includes(role)) {
            return await this.hasOptionalPermission(userId, companyId, 'access_documents');
        }
        return false;
    }

    /**
     * Suspension Permissions
     */

    canSuspendUser(role: UserRole, targetCompanyId: string, userCompanyId: string): boolean {
        if (role === UserRole.SUPERADMIN) return true;
        if (role === UserRole.COMPANY_ADMIN && targetCompanyId === userCompanyId) return true;
        return false;
    }

    canSuspendCompany(role: UserRole): boolean {
        return role === UserRole.SUPERADMIN;
    }

    /**
     * Audit Log Permissions
     */

    async canViewTenantAuditLogs(
        role: UserRole,
        userId: string,
        targetCompanyId: string,
        userCompanyId: string
    ): Promise<boolean> {
        if (role === UserRole.SUPERADMIN) {
            return await this.hasOptionalPermission(userId, targetCompanyId, 'view_audit_logs');
        }
        if (role === UserRole.COMPANY_ADMIN && targetCompanyId === userCompanyId) return true;
        if (role === UserRole.SUPERVISOR) {
            return await this.hasOptionalPermission(userId, targetCompanyId, 'view_audit_logs');
        }
        return false;
    }

    /**
     * Optional Permissions System
     */

    async hasOptionalPermission(userId: string, companyId: string, permission: string): Promise<boolean> {
        const db = await getDb();
        const result = await db.get<OptionalPermission>(
            `SELECT * FROM optional_permissions 
       WHERE userId = ? AND companyId = ? AND permission = ?
       AND (expiresAt IS NULL OR expiresAt > datetime('now'))`,
            [userId, companyId, permission]
        );
        return !!result;
    }

    async grantOptionalPermission(
        userId: string,
        companyId: string,
        permission: string,
        grantedBy: string,
        expiresAt?: Date,
        constraints?: Record<string, any>
    ): Promise<OptionalPermission> {
        const db = await getDb();
        const permissionId = crypto.randomUUID();
        const now = new Date();

        await db.run(
            `INSERT INTO optional_permissions 
       (id, userId, companyId, permission, grantedBy, grantedAt, expiresAt, constraints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                permissionId,
                userId,
                companyId,
                permission,
                grantedBy,
                now.toISOString(),
                expiresAt?.toISOString() || null,
                constraints ? JSON.stringify(constraints) : null
            ]
        );

        return {
            id: permissionId,
            userId,
            companyId,
            permission,
            grantedBy,
            grantedAt: now,
            expiresAt: expiresAt || null,
            constraints
        };
    }

    async revokeOptionalPermission(permissionId: string, revokedBy: string): Promise<void> {
        const db = await getDb();
        const permission = await db.get<OptionalPermission>(
            'SELECT * FROM optional_permissions WHERE id = ?',
            [permissionId]
        );

        if (!permission) throw new Error('Permission not found');

        await db.run('DELETE FROM optional_permissions WHERE id = ?', [permissionId]);
    }

    async getUserOptionalPermissions(userId: string, companyId: string): Promise<OptionalPermission[]> {
        const db = await getDb();
        const permissions = await db.all<OptionalPermission>(
            `SELECT * FROM optional_permissions 
       WHERE userId = ? AND companyId = ?
       AND (expiresAt IS NULL OR expiresAt > datetime('now'))
       ORDER BY grantedAt DESC`,
            [userId, companyId]
        );
        return permissions;
    }

    /**
     * Break-glass Access System
     */

    async requestBreakGlassAccess(
        adminId: string,
        targetCompanyId: string,
        justification: string,
        durationMinutes: number = 60
    ): Promise<BreakGlassAccess> {
        const db = await getDb();
        const accessId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

        await db.run(
            `INSERT INTO emergency_access 
       (id, adminId, targetCompanyId, justification, grantedAt, expiresAt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [accessId, adminId, targetCompanyId, justification, now.toISOString(), expiresAt.toISOString(), 'active']
        );

        return {
            id: accessId,
            adminId,
            targetCompanyId,
            justification,
            grantedAt: now,
            expiresAt,
            status: 'active'
        };
    }

    async hasActiveBreakGlassAccess(adminId: string, targetCompanyId: string): Promise<boolean> {
        const db = await getDb();
        const access = await db.get<BreakGlassAccess>(
            `SELECT * FROM emergency_access 
       WHERE adminId = ? AND targetCompanyId = ? AND status = 'active'
       AND expiresAt > datetime('now')
       ORDER BY grantedAt DESC LIMIT 1`,
            [adminId, targetCompanyId]
        );
        return !!access;
    }

    async revokeBreakGlassAccess(accessId: string, revokedBy: string): Promise<void> {
        const db = await getDb();
        await db.run(`UPDATE emergency_access SET status = 'revoked' WHERE id = ?`, [accessId]);
    }

    async cleanupExpiredPermissions(): Promise<void> {
        const db = await getDb();
        await db.run(
            `DELETE FROM optional_permissions 
       WHERE expiresAt IS NOT NULL AND expiresAt < datetime('now')`
        );
        await db.run(
            `UPDATE emergency_access SET status = 'expired' 
       WHERE status = 'active' AND expiresAt < datetime('now')`
        );
    }

    // Legacy compatibility methods
    async hasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> {
        if (!tenantId) return false;
        return await this.hasOptionalPermission(userId, tenantId, permission);
    }

    async getUserGlobalRole(userId: string): Promise<string | null> {
        const db = await getDb();
        const membership = await db.get(
            `SELECT role FROM memberships WHERE userId = ? AND role = 'SUPERADMIN' LIMIT 1`,
            [userId]
        );
        return membership ? 'SUPERADMIN' : null;
    }

    async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
        const permissions = await this.getUserOptionalPermissions(userId, tenantId);
        return permissions.map(p => p.permission);
    }

    async getPermissions(): Promise<any[]> {
        return [
            { name: 'invite_users', description: 'Invite users to tenant' },
            { name: 'manage_roles', description: 'Manage user roles' },
            { name: 'access_documents', description: 'Access documents' },
            { name: 'view_audit_logs', description: 'View audit logs' },
            { name: 'upload_documents', description: 'Upload documents' },
            { name: 'download_documents', description: 'Download documents' }
        ];
    }

    async getRolePermissions(role: UserRole): Promise<string[]> {
        const rolePermissions: Record<string, string[]> = {
            [UserRole.SUPERADMIN]: ['*'],
            [UserRole.COMPANY_ADMIN]: ['invite_users', 'manage_roles', 'access_documents', 'view_audit_logs'],
            [UserRole.SUPERVISOR]: ['access_documents'],
            [UserRole.OPERATIVE]: ['access_documents']
        };
        return rolePermissions[role] || [];
    }

    async hasAnyPermission(userId: string, permissions: string[], tenantId?: string): Promise<boolean> {
        for (const permission of permissions) {
            const hasOpt = await this.hasOptionalPermission(userId, tenantId || '', permission);
            if (hasOpt) return true;
        }
        return false;
    }

    async hasAllPermissions(userId: string, permissions: string[], tenantId?: string): Promise<boolean> {
        for (const permission of permissions) {
            const hasOpt = await this.hasOptionalPermission(userId, tenantId || '', permission);
            if (!hasOpt) return false;
        }
        return true;
    }
}

export const permissionService = new PermissionService();
export { PermissionService };
export type { OptionalPermission, BreakGlassAccess };
