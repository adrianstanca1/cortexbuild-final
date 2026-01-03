import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

/**
 * Permission check hook
 * Provides methods to check user permissions based on RBAC matrix
 */
export const usePermissions = () => {
    const { user } = useAuth();

    const role = user?.role as UserRole;

    /**
     * Check if user has a specific permission
     */
    const can = (permission: string): boolean => {
        if (!user) return false;

        // Superadmin override
        if (user.permissions?.includes('*')) return true;

        // Check exact permission
        if (user.permissions?.includes(permission)) return true;

        // Check wildcard permissions (e.g., 'projects.*' matches 'projects.create')
        const [resource] = permission.split('.');
        if (user.permissions?.includes(`${resource}.*`)) return true;

        return false;
    };

    /**
     * Check if user has ANY of the specified permissions
     */
    const canAny = (permissionList: string[]): boolean => {
        return permissionList.some(permission => can(permission));
    };

    /**
     * Check if user has ALL of the specified permissions
     */
    const canAll = (permissionList: string[]): boolean => {
        return permissionList.every(permission => can(permission));
    };

    /**
     * Check if user cannot perform an action
     */
    const cannot = (permission: string): boolean => {
        return !can(permission);
    };

    // RBAC Matrix-based permissions
    const isSuperAdmin = role === UserRole.SUPERADMIN;
    const isCompanyAdmin = role === UserRole.COMPANY_ADMIN;
    const isSupervisor = role === UserRole.SUPERVISOR;
    const isOperative = role === UserRole.OPERATIVE;

    // Platform Administration
    const canCreateCompany = isSuperAdmin;
    const canProvisionDatabase = isSuperAdmin;
    const canInviteCompanyAdmin = isSuperAdmin;
    const canBroadcastMessages = isSuperAdmin;
    const canViewPlatformLogs = isSuperAdmin;

    // Tenant User Management
    const canInviteTenantUsers = isCompanyAdmin || isSupervisor;
    const canManageTenantRoles = isCompanyAdmin;

    // Document Access
    const canAccessDocuments = isCompanyAdmin || isSupervisor || isOperative;
    const canUploadDocuments = isCompanyAdmin || isSupervisor || isOperative;
    const canDownloadDocuments = isCompanyAdmin || isSupervisor || isOperative;

    // Suspension
    const canSuspendUser = isSuperAdmin || isCompanyAdmin;
    const canSuspendCompany = isSuperAdmin;

    // Audit Logs
    const canViewTenantAuditLogs = isSuperAdmin || isCompanyAdmin || isSupervisor;

    return {
        permissions: user?.permissions || [],
        can,
        canAny,
        canAll,
        cannot,

        // RBAC Matrix permissions
        isSuperAdmin,
        isCompanyAdmin,
        isSupervisor,
        isOperative,
        canCreateCompany,
        canProvisionDatabase,
        canInviteCompanyAdmin,
        canBroadcastMessages,
        canViewPlatformLogs,
        canInviteTenantUsers,
        canManageTenantRoles,
        canAccessDocuments,
        canUploadDocuments,
        canDownloadDocuments,
        canSuspendUser,
        canSuspendCompany,
        canViewTenantAuditLogs,
    };
};

/**
 * Alias for usePermissions
 */
export const useAbility = usePermissions;

