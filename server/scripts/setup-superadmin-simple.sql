-- SIMPLIFIED SuperAdmin Setup Script
-- This version checks for existing data and handles edge cases
-- Run this in phpMyAdmin on database: u875310796_cortexbuildpro

-- =============================================================================
-- Step 1: Create platform-admin company (if not exists)
-- =============================================================================
INSERT INTO companies (id, name, slug, status, plan, subscriptionTier, maxProjects, maxUsers, createdAt, updatedAt, isActive)
SELECT 
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
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = 'platform-admin');

-- =============================================================================
-- Step 2: Check if user already exists
-- =============================================================================
SELECT 
  'Checking existing user...' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE id = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f') 
    THEN 'User EXISTS - will UPDATE'
    ELSE 'User NOT FOUND - will CREATE'
  END as status;

-- =============================================================================
-- Step 3: Create or Update SuperAdmin User
-- =============================================================================
-- Delete existing user first if they have wrong data
DELETE FROM users WHERE email = 'adrian.stanca1@gmail.com' AND id != '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

-- Insert or update user
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
  '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f',
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

-- =============================================================================
-- Step 4: Create SUPERADMIN Membership (safe version)
-- =============================================================================
-- First delete any conflicting memberships
DELETE FROM memberships 
WHERE userId = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f' 
  AND companyId = 'platform-admin';

-- Now insert fresh membership
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
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check 1: User exists and has correct role
SELECT 
  '✓ User Verification' as Check_Type,
  id,
  email,
  name,
  role,
  companyId,
  status
FROM users
WHERE id = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

-- Check 2: Membership exists
SELECT 
  '✓ Membership Verification' as Check_Type,
  m.id,
  m.userId,
  m.companyId,
  m.role,
  m.status,
  u.email
FROM memberships m
JOIN users u ON m.userId = u.id
WHERE m.userId = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

-- Check 3: Company exists
SELECT 
  '✓ Company Verification' as Check_Type,
  id,
  name,
  status,
  plan
FROM companies
WHERE id = 'platform-admin';

-- Success message
SELECT '🎉 SuperAdmin setup complete! Log out and log back in to activate.' as Result;
