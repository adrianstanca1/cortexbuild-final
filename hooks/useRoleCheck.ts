import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_HIERARCHY } from '@/types';
export { UserRole };

/**
 * Role check hook
 * Provides methods to check user roles and hierarchy
 */
export const useRoleCheck = () => {
    const { user } = useAuth();
    const userRole = user?.role || UserRole.READ_ONLY;

    const isSuperadmin = userRole === UserRole.SUPERADMIN;

    /**
     * Check if user has a specific role
     */
    const isRole = (role: UserRole): boolean => {
        return userRole === role;
    };

    /**
     * Check if user has at least the specified role level
     */
    const isAtLeast = (minRole: UserRole): boolean => {
        return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
    };

    /**
     * Check if user has higher privilege than specified role
     */
    const isHigherThan = (role: UserRole): boolean => {
        return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[role];
    };

    /**
     * Check if user has any of the specified roles
     */
    const hasAnyRole = (roles: UserRole[]): boolean => {
        return roles.some(role => isRole(role));
    };

    /**
     * Check if user can manage another role
     * (user must be at least one level higher)
     */
    const canManageRole = (targetRole: UserRole): boolean => {
        return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
    };

    return {
        userRole,
        isSuperadmin,
        isRole,
        isAtLeast,
        isHigherThan,
        hasAnyRole,
        canManageRole,
    };
};
