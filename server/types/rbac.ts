// Multi-Tenant Architecture & RBAC Types
// Created: 2025-12-22

/**
 * User roles in hierarchical order (lowest to highest privilege)
 */
export enum UserRole {
    READ_ONLY = 'READ_ONLY',
    OPERATIVE = 'OPERATIVE',
    SUPERVISOR = 'SUPERVISOR',
    FINANCE = 'FINANCE',
    PROJECT_MANAGER = 'PROJECT_MANAGER',
    COMPANY_ADMIN = 'COMPANY_ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}

/**
 * Role hierarchy for privilege comparison
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.READ_ONLY]: 0,
    [UserRole.OPERATIVE]: 1,
    [UserRole.SUPERVISOR]: 2,
    [UserRole.FINANCE]: 3,
    [UserRole.PROJECT_MANAGER]: 4,
    [UserRole.COMPANY_ADMIN]: 5,
    [UserRole.SUPERADMIN]: 6,
};

/**
 * Membership status
 */
export enum MembershipStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    INVITED = 'invited',
    INACTIVE = 'inactive',
}

/**
 * Membership linking a user to a company with a role
 */
export interface Membership {
    id: string;
    userId: string;
    companyId: string;
    role: UserRole;
    permissions?: string[]; // Explicit permission overrides
    status: MembershipStatus;
    joinedAt?: string;
    invitedBy?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Permission definition
 */
export interface Permission {
    id: string;
    name: string; // e.g., 'projects.create'
    resource: string; // e.g., 'projects'
    action: string; // e.g., 'create'
    description?: string;
    createdAt: string;
}

/**
 * Role-Permission mapping
 */
export interface RolePermission {
    roleId: string;
    permissionId: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
    id: string;
    userId?: string;
    companyId?: string;
    action: string; // e.g., 'company.created', 'user.suspended'
    resource?: string; // e.g., 'companies', 'projects'
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

/**
 * Tenant context for request scoping
 */
export interface TenantContext {
    tenantId: string;
    userId: string;
    userName?: string; // Enhanced context
    role: UserRole;
    permissions: string[];
    isSuperadmin: boolean;
}

/**
 * DTOs for service methods
 */
export interface CreateMembershipDto {
    userId: string;
    companyId: string;
    role: UserRole;
    permissions?: string[];
    invitedBy?: string;
}

export interface UpdateMembershipDto {
    role?: UserRole;
    permissions?: string[];
    status?: MembershipStatus;
}

export interface AuditEventDto {
    userId?: string;
    userName?: string;
    companyId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditFilters {
    userId?: string;
    companyId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Helper to check if a role has at least the required privilege level
 */
export function hasRolePrivilege(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Helper to check if user is superadmin
 */
export function isSuperadmin(role: string | UserRole): boolean {
    if (!role) return false;
    const normalized = role.toString().toUpperCase();
    return normalized === UserRole.SUPERADMIN || normalized === 'SUPER_ADMIN';
}
