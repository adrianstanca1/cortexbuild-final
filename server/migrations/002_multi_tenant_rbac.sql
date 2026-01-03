-- Multi-Tenant Architecture & RBAC Schema
-- Migration: 002_multi_tenant_rbac.sql
-- Created: 2025-12-22

-- ============================================================================
-- MEMBERSHIPS TABLE
-- Links users to companies with roles and permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  companyId TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SUPERADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER', 'FINANCE', 'SUPERVISOR', 'OPERATIVE', 'READ_ONLY')),
  permissions TEXT, -- JSON array of explicit permission overrides
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'invited', 'inactive')),
  joinedAt TEXT,
  invitedBy TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(userId, companyId)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(userId);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON memberships(companyId);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- ============================================================================
-- PERMISSIONS TABLE
-- Defines all available permissions in the system
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- e.g., 'projects.create', 'finance.export'
  resource TEXT NOT NULL, -- projects, tasks, finance, team, etc.
  action TEXT NOT NULL, -- create, read, update, delete, export, approve
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE
-- Maps roles to their default permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  roleId TEXT NOT NULL,
  permissionId TEXT NOT NULL,
  PRIMARY KEY (roleId, permissionId),
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(roleId);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- Tracks all critical actions for compliance and security
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  companyId TEXT,
  action TEXT NOT NULL, -- e.g., 'company.created', 'user.suspended', 'project.deleted'
  resource TEXT, -- e.g., 'companies', 'projects', 'users'
  resourceId TEXT,
  metadata TEXT, -- JSON with additional context
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(companyId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(createdAt);

-- ============================================================================
-- SEED DATA: Base Permissions
-- ============================================================================

-- Projects Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_projects_create', 'projects.create', 'projects', 'create', 'Create new projects'),
  ('perm_projects_read', 'projects.read', 'projects', 'read', 'View projects'),
  ('perm_projects_update', 'projects.update', 'projects', 'update', 'Edit project details'),
  ('perm_projects_delete', 'projects.delete', 'projects', 'delete', 'Delete projects'),
  ('perm_projects_export', 'projects.export', 'projects', 'export', 'Export project data');

-- Tasks Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_tasks_create', 'tasks.create', 'tasks', 'create', 'Create new tasks'),
  ('perm_tasks_read', 'tasks.read', 'tasks', 'read', 'View tasks'),
  ('perm_tasks_update', 'tasks.update', 'tasks', 'update', 'Edit task details'),
  ('perm_tasks_delete', 'tasks.delete', 'tasks', 'delete', 'Delete tasks'),
  ('perm_tasks_assign', 'tasks.assign', 'tasks', 'assign', 'Assign tasks to team members');

-- Finance Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_finance_create', 'finance.create', 'finance', 'create', 'Create financial records'),
  ('perm_finance_read', 'finance.read', 'finance', 'read', 'View financial data'),
  ('perm_finance_update', 'finance.update', 'finance', 'update', 'Edit financial records'),
  ('perm_finance_delete', 'finance.delete', 'finance', 'delete', 'Delete financial records'),
  ('perm_finance_export', 'finance.export', 'finance', 'export', 'Export financial data'),
  ('perm_finance_approve', 'finance.approve', 'finance', 'approve', 'Approve invoices and expenses');

-- Team Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_team_create', 'team.create', 'team', 'create', 'Add team members'),
  ('perm_team_read', 'team.read', 'team', 'read', 'View team members'),
  ('perm_team_update', 'team.update', 'team', 'update', 'Edit team member details'),
  ('perm_team_delete', 'team.delete', 'team', 'delete', 'Remove team members'),
  ('perm_team_roles', 'team.roles', 'team', 'roles', 'Manage team member roles');

-- Documents Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_documents_create', 'documents.create', 'documents', 'create', 'Upload documents'),
  ('perm_documents_read', 'documents.read', 'documents', 'read', 'View documents'),
  ('perm_documents_update', 'documents.update', 'documents', 'update', 'Edit document details'),
  ('perm_documents_delete', 'documents.delete', 'documents', 'delete', 'Delete documents');

-- Reports Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_reports_read', 'reports.read', 'reports', 'read', 'View reports'),
  ('perm_reports_export', 'reports.export', 'reports', 'export', 'Export reports');

-- Settings Permissions
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_settings_read', 'settings.read', 'settings', 'read', 'View company settings'),
  ('perm_settings_update', 'settings.update', 'settings', 'update', 'Modify company settings');

-- Platform Permissions (Superadmin only)
INSERT IGNORE INTO permissions (id, name, resource, action, description) VALUES
  ('perm_platform_companies', 'platform.companies', 'platform', 'companies', 'Manage all companies'),
  ('perm_platform_users', 'platform.users', 'platform', 'users', 'Manage all users'),
  ('perm_platform_settings', 'platform.settings', 'platform', 'settings', 'Manage platform settings'),
  ('perm_platform_audit', 'platform.audit', 'platform', 'audit', 'View all audit logs');

-- ============================================================================
-- SEED DATA: Role Permissions Mapping
-- ============================================================================

-- SUPERADMIN: All permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'SUPERADMIN', id FROM permissions;

-- COMPANY_ADMIN: All tenant-level permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'COMPANY_ADMIN', id FROM permissions WHERE resource != 'platform';

-- PROJECT_MANAGER: Project, task, team, document, report permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'PROJECT_MANAGER', id FROM permissions 
WHERE resource IN ('projects', 'tasks', 'team', 'documents', 'reports')
  AND action IN ('create', 'read', 'update', 'delete', 'assign', 'export');

-- FINANCE: Finance and report permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'FINANCE', id FROM permissions 
WHERE resource IN ('finance', 'reports', 'projects', 'tasks')
  AND action IN ('create', 'read', 'update', 'export', 'approve');

-- SUPERVISOR: Project, task, team read/update permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'SUPERVISOR', id FROM permissions 
WHERE resource IN ('projects', 'tasks', 'team', 'documents')
  AND action IN ('read', 'update', 'create');

-- OPERATIVE: Read permissions + task updates
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'OPERATIVE', id FROM permissions 
WHERE (resource IN ('projects', 'tasks', 'documents', 'reports') AND action = 'read')
   OR (resource = 'tasks' AND action = 'update')
   OR (resource = 'documents' AND action = 'create');

-- READ_ONLY: Only read permissions
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT 'READ_ONLY', id FROM permissions WHERE action = 'read';
