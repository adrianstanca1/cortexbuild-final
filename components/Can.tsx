import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoleCheck, UserRole } from '@/hooks/useRoleCheck';

interface CanProps {
    /**
     * Required permission
     */
    permission?: string;

    /**
     * Required permissions (user must have ALL)
     */
    permissions?: string[];

    /**
     * Required permissions (user must have ANY)
     */
    anyPermission?: string[];

    /**
     * Minimum required role
     */
    minRole?: UserRole;

    /**
     * Specific role required
     */
    role?: UserRole;

    /**
     * Require superadmin access
     */
    requireSuperadmin?: boolean;

    /**
     * Fallback to render when access is denied
     */
    fallback?: React.ReactNode;

    /**
     * Children to render if authorized
     */
    children: React.ReactNode;
}

/**
 * Can Component
 * Conditionally renders children based on permissions and roles
 * 
 * @example
 * <Can permission="projects.create">
 *   <button>Create Project</button>
 * </Can>
 * 
 * @example
 * <Can minRole={UserRole.PROJECT_MANAGER} fallback={<ReadOnlyView />}>
 *   <EditableView />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({
    permission,
    permissions,
    anyPermission,
    minRole,
    role,
    requireSuperadmin,
    fallback = null,
    children,
}) => {
    const { can, canAll, canAny } = usePermissions();
    const { isRole, isAtLeast, isSuperadmin } = useRoleCheck();

    // Check superadmin requirement
    if (requireSuperadmin && !isSuperadmin) {
        return <>{fallback}</>;
    }

    // Check specific role
    if (role && !isRole(role)) {
        return <>{fallback}</>;
    }

    // Check minimum role level
    if (minRole && !isAtLeast(minRole)) {
        return <>{fallback}</>;
    }

    // Check single permission
    if (permission && !can(permission)) {
        return <>{fallback}</>;
    }

    // Check all permissions
    if (permissions && !canAll(permissions)) {
        return <>{fallback}</>;
    }

    // Check any permission
    if (anyPermission && !canAny(anyPermission)) {
        return <>{fallback}</>;
    }

    // All checks passed, render children
    return <>{children}</>;
};

/**
 * Cannot Component
 * Inverse of Can - renders children when user LACKS permission
 */
export const Cannot: React.FC<CanProps> = ({
    permission,
    permissions,
    anyPermission,
    minRole,
    role,
    requireSuperadmin,
    fallback = null,
    children,
}) => {
    const { can, canAll, canAny } = usePermissions();
    const { isRole, isAtLeast, isSuperadmin } = useRoleCheck();

    // Inverse logic - render children when checks FAIL

    if (requireSuperadmin && isSuperadmin) {
        return <>{fallback}</>;
    }

    if (role && isRole(role)) {
        return <>{fallback}</>;
    }

    if (minRole && isAtLeast(minRole)) {
        return <>{fallback}</>;
    }

    if (permission && can(permission)) {
        return <>{fallback}</>;
    }

    if (permissions && canAll(permissions)) {
        return <>{fallback}</>;
    }

    if (anyPermission && canAny(anyPermission)) {
        return <>{fallback}</>;
    }

    // All checks failed (user lacks permission), render children
    return <>{children}</>;
};

export default Can;
