-- Seed Data: Permission Policies
-- Description: Default RBAC permission policies for all roles
-- Date: 2025-12-28

-- ============================================================================
-- SUPERADMIN Role - System-wide permissions
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Company management
('SUPERADMIN', 'company', 'create', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'company', 'read', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'company', 'update', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'company', 'suspend', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'company', 'archive', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'company', 'delete', 'SYSTEM', 'ALLOW'),

-- Feature management
('SUPERADMIN', 'feature', 'read', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'feature', 'set', 'SYSTEM', 'ALLOW'),

-- Limit management
('SUPERADMIN', 'limit', 'read', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'limit', 'set', 'SYSTEM', 'ALLOW'),

-- User management (all companies)
('SUPERADMIN', 'user', 'create', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'user', 'read', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'user', 'update', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'user', 'suspend', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'user', 'delete', 'SYSTEM', 'ALLOW'),

-- Impersonation
('SUPERADMIN', 'impersonation', 'start', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'impersonation', 'end', 'SYSTEM', 'ALLOW'),

-- Audit
('SUPERADMIN', 'audit', 'read', 'SYSTEM', 'ALLOW'),
('SUPERADMIN', 'audit', 'export', 'SYSTEM', 'ALLOW')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- SUPPORT_ADMIN Role - Limited system operations
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Read-only company access
('SUPPORT_ADMIN', 'company', 'read', 'SYSTEM', 'ALLOW'),

-- Read-only user access
('SUPPORT_ADMIN', 'user', 'read', 'SYSTEM', 'ALLOW'),

-- Audit access
('SUPPORT_ADMIN', 'audit', 'read', 'SYSTEM', 'ALLOW'),

-- Explicit denials for destructive actions
('SUPPORT_ADMIN', 'company', 'delete', 'SYSTEM', 'DENY'),
('SUPPORT_ADMIN', 'company', 'archive', 'SYSTEM', 'DENY'),
('SUPPORT_ADMIN', 'user', 'delete', 'SYSTEM', 'DENY')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- COMPANY_OWNER Role - Full tenant administration
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Company management (own tenant only)
('COMPANY_OWNER', 'company', 'read', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'company', 'update', 'TENANT', 'ALLOW'),

-- User management (tenant scope)
('COMPANY_OWNER', 'user', 'invite', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'user', 'read', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'user', 'update', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'user', 'suspend', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'user', 'delete', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'user', 'role:assign', 'TENANT', 'ALLOW'),

-- Project management
('COMPANY_OWNER', 'project', 'create', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'project', 'read', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'project', 'update', 'TENANT', 'ALLOW'),
('COMPANY_OWNER', 'project', 'delete', 'TENANT', 'ALLOW'),

-- Feature viewing (cannot modify)
('COMPANY_OWNER', 'feature', 'read', 'TENANT', 'ALLOW'),

-- Audit logs
('COMPANY_OWNER', 'audit', 'read', 'TENANT', 'ALLOW')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- COMPANY_ADMIN Role - Tenant admin without sensitive actions
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- User management (limited)
('COMPANY_ADMIN', 'user', 'invite', 'TENANT', 'ALLOW'),
('COMPANY_ADMIN', 'user', 'read', 'TENANT', 'ALLOW'),
('COMPANY_ADMIN', 'user', 'update', 'TENANT', 'ALLOW'),

-- Project management
('COMPANY_ADMIN', 'project', 'create', 'TENANT', 'ALLOW'),
('COMPANY_ADMIN', 'project', 'read', 'TENANT', 'ALLOW'),
('COMPANY_ADMIN', 'project', 'update', 'TENANT', 'ALLOW'),
('COMPANY_ADMIN', 'project', 'delete', 'TENANT', 'ALLOW'),

-- Read-only on features
('COMPANY_ADMIN', 'feature', 'read', 'TENANT', 'ALLOW'),

-- Explicit denials
('COMPANY_ADMIN', 'user', 'delete', 'TENANT', 'DENY'),
('COMPANY_ADMIN', 'user', 'role:assign', 'TENANT', 'DENY'),
('COMPANY_ADMIN', 'company', 'update', 'TENANT', 'DENY')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- MANAGER Role - Project and team management
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Project management
('MANAGER', 'project', 'create', 'TENANT', 'ALLOW'),
('MANAGER', 'project', 'read', 'TENANT', 'ALLOW'),
('MANAGER', 'project', 'update', 'TENANT', 'ALLOW'),

-- Team member viewing
('MANAGER', 'user', 'read', 'TENANT', 'ALLOW'),

-- Tasks
('MANAGER', 'task', 'create', 'TENANT', 'ALLOW'),
('MANAGER', 'task', 'read', 'TENANT', 'ALLOW'),
('MANAGER', 'task', 'update', 'TENANT', 'ALLOW'),
('MANAGER', 'task', 'assign', 'TENANT', 'ALLOW')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- USER Role - Basic permissions
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Project viewing
('USER', 'project', 'read', 'TENANT', 'ALLOW'),

-- Task management (assigned tasks)
('USER', 'task', 'read', 'RESOURCE', 'ALLOW'),
('USER', 'task', 'update', 'RESOURCE', 'ALLOW'),

-- Own profile
('USER', 'user', 'read', 'RESOURCE', 'ALLOW'),
('USER', 'user', 'update', 'RESOURCE', 'ALLOW')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- ============================================================================
-- AUDITOR Role - Read-only compliance access
-- ============================================================================
INSERT INTO permissionpolicies (role, resource, action, scope, effect) VALUES
-- Audit logs
('AUDITOR', 'audit', 'read', 'SYSTEM', 'ALLOW'),
('AUDITOR', 'audit', 'export', 'SYSTEM', 'ALLOW'),

-- Read-only company access
('AUDITOR', 'company', 'read', 'SYSTEM', 'ALLOW'),

-- Read-only user access
('AUDITOR', 'user', 'read', 'SYSTEM', 'ALLOW'),

-- Read-only project access
('AUDITOR', 'project', 'read', 'SYSTEM', 'ALLOW'),

-- Explicit denials (redundant but explicit)
('AUDITOR', 'company', 'update', 'SYSTEM', 'DENY'),
('AUDITOR', 'company', 'delete', 'SYSTEM', 'DENY'),
('AUDITOR', 'user', 'update', 'SYSTEM', 'DENY'),
('AUDITOR', 'user', 'delete', 'SYSTEM', 'DENY')

ON CONFLICT (role, resource, action, scope) DO NOTHING;

-- Log seed completion
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM permissionpolicies;
  RAISE NOTICE 'Permission policies seeded successfully! Total policies: %', policy_count;
END $$;
