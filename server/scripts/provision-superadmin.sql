-- SuperAdmin Provisioning SQL Script
-- This script adds adrian.stanca1@gmail.com as a SuperAdmin user
-- Run this script directly on the Hostinger MySQL database

-- Step 1: Create platform-admin company if it doesn't exist
INSERT IGNORE INTO companies (id, name, slug, status, plan, subscriptionTier, maxProjects, maxUsers, createdAt, updatedAt, isActive)
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
);

-- Step 2: Insert SuperAdmin user
-- Password hash for 'Cumparavinde1@' generated with bcrypt (cost=12)
INSERT INTO users (id, email, password, name, role, companyId, status, isActive, createdAt, updatedAt)
VALUES (
  UUID(),
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
  password = '$2b$12$oGr gRHE5NROfqQ7jkIb5h.GWrX6eXasExudl0Oxn6CTCaoNwbiNvi',
  role = 'SUPERADMIN',
  companyId = 'platform-admin',
  status = 'active',
  isActive = 1,
  updatedAt = NOW();

-- Step 3: Add SUPERADMIN membership
INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
SELECT 
  UUID(),
  u.id,
  'platform-admin',
  'SUPERADMIN',
  'active',
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'adrian.stanca1@gmail.com'
ON DUPLICATE KEY UPDATE
  role = 'SUPERADMIN',
  status = 'active',
  updatedAt = NOW();

-- Verify the user was created
SELECT id, email, name, role, companyId, status, isActive
FROM users
WHERE email = 'adrian.stanca1@gmail.com';
