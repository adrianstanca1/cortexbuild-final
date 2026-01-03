import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
    /**
     * Required permission to access this route
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
     * Fallback component or path when access is denied
     */
    fallback?: React.ReactNode | string;

    /**
     * Children to render if authorized
     */
    children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Conditionally renders children based on permissions and roles
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    permission,
    permissions,
    anyPermission,
    minRole,
    role,
    requireSuperadmin,
    fallback = '/unauthorized',
    children,
}) => {
    const { can, canAll, canAny } = usePermissions();
    const { isRole, isAtLeast, isSuperadmin } = useRoleCheck();

    // Check superadmin requirement
    if (requireSuperadmin && !isSuperadmin) {
        return renderFallback(fallback);
    }

    // Check specific role
    if (role && !isRole(role)) {
        return renderFallback(fallback);
    }

    // Check minimum role level
    if (minRole && !isAtLeast(minRole)) {
        return renderFallback(fallback);
    }

    // Check single permission
    if (permission && !can(permission)) {
        return renderFallback(fallback);
    }

    // Check all permissions
    if (permissions && !canAll(permissions)) {
        return renderFallback(fallback);
    }

    // Check any permission
    if (anyPermission && !canAny(anyPermission)) {
        return renderFallback(fallback);
    }

    // All checks passed, render children
    return <>{children}</>;
};

/**
 * Helper to render fallback
 */
function renderFallback(fallback: React.ReactNode | string): React.ReactElement {
    if (typeof fallback === 'string') {
        return <Navigate to={fallback} replace />;
    }
    return <>{fallback}</>;
}

export default ProtectedRoute;
