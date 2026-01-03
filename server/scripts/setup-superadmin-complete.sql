-- =============================================================================
-- COMPLETE SUPERADMIN USER SETUP FOR MYSQL DATABASE
-- =============================================================================
-- This script creates the complete user structure with proper access levels
-- Run this in phpMyAdmin on database: u875310796_cortexbuildpro
-- =============================================================================

-- Step 1: Create platform-admin company (System Administration Company)
-- =============================================================================
INSERT INTO companies (id, name, slug, status, plan, subscriptionTier, maxProjects, maxUsers, createdAt, updatedAt, isActive)
VALUES (
  'platform-admin',
  'Platform Administration',
  'platform-admin',
  'ACTIVE',
  'ENTERPRISE',
  'ENTERPRISE',
  9999,
  9999,
  NOW(),
  NOW(),
  1
)
ON DUPLICATE KEY UPDATE
  name = 'Platform Administration',
  status = 'ACTIVE',
  plan = 'ENTERPRISE',
  subscriptionTier = 'ENTERPRISE',
  maxProjects = 9999,
  maxUsers = 9999,
  isActive = 1,
  updatedAt = NOW();

-- Step 2: Create/Update SuperAdmin User
-- =============================================================================
-- IMPORTANT: Using the Supabase UUID from your account
-- Password hash for 'Cumparavinde1@' (bcrypt, cost=12)
-- =============================================================================
INSERT INTO users (
  id,
  email,
  password,
  name,
  role,
  companyId,
  status,
  isActive,
  createdAt,
  updatedAt
)
VALUES (
  '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f',  -- Your Supabase UUID
  'adrian.stanca1@gmail.com',
  '$2b$12$oGrgRHE5NROfqQ7jkIb5h.GWrX6eXasExudl0Oxn6CTCaoNwbiNvi',
  'Adrian Stanca',
  'SUPERADMIN',
  'platform-admin',
  'active',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  email = 'adrian.stanca1@gmail.com',
  name = 'Adrian Stanca',
  role = 'SUPERADMIN',
  companyId = 'platform-admin',
  status = 'active',
  isActive = 1,
  updatedAt = NOW();

-- Step 3: Create SUPERADMIN Membership
-- =============================================================================
INSERT INTO memberships (
  id,
  userId,
  companyId,
  role,
  status,
  createdAt,
  updatedAt
)
VALUES (
  UUID(),
  '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f',
  'platform-admin',
  'SUPERADMIN',
  'active',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  role = 'SUPERADMIN',
  status = 'active',
  updatedAt = NOW();

-- Step 4: Grant All Permissions to SUPERADMIN Role
-- =============================================================================
-- First, ensure basic permissions exist
INSERT IGNORE INTO permissions (id, name, resource, action, description, createdAt)
VALUES
  (UUID(), '*', '*', '*', 'Full system access', NOW()),
  (UUID(), 'companies.manage', 'companies', 'manage', 'Manage all companies', NOW()),
  (UUID(), 'users.manage', 'users', 'manage', 'Manage all users', NOW()),
  (UUID(), 'platform.admin', 'platform', 'admin', 'Platform administration', NOW());

-- Grant wildcard permission to SUPERADMIN role
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'SUPERADMIN', id
FROM permissions
WHERE name = '*'
ON DUPLICATE KEY UPDATE roleId = 'SUPERADMIN';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify everything is set up correctly

-- Check 1: User exists with correct role
SELECT 
  '✓ User Check' as Status,
  id,
  email,
  name,
  role,
  companyId,
  status,
  isActive
FROM users
WHERE id = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

-- Check 2: Membership exists
SELECT 
  '✓ Membership Check' as Status,
  m.id,
  m.userId,
  m.companyId,
  m.role,
  m.status
FROM memberships m
WHERE m.userId = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

-- Check 3: Company exists
SELECT 
  '✓ Company Check' as Status,
  id,
  name,
  status,
  plan
FROM companies
WHERE id = 'platform-admin';

-- Check 4: Permissions granted
SELECT 
  '✓ Permissions Check' as Status,
  COUNT(*) as total_permissions
FROM role_permissions
WHERE roleId = 'SUPERADMIN';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
SELECT '🎉 SuperAdmin setup complete! Log out and log back in to activate.' as Message;
