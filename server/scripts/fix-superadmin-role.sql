-- Fix SuperAdmin Role for Existing User
-- This updates both the database user and syncs with Supabase metadata

-- First, verify the current user state
SELECT 
  id, 
  email, 
  name, 
  role, 
  companyId, 
  status, 
  isActive,
  createdAt
FROM users 
WHERE email = 'adrian.stanca1@gmail.com';

-- Update the user role to SUPERADMIN if it's not already
UPDATE users 
SET 
  role = 'SUPERADMIN',
  companyId = 'platform-admin',
  status = 'active',
  isActive = 1,
  updatedAt = NOW()
WHERE email = 'adrian.stanca1@gmail.com';

-- Ensure SUPERADMIN membership exists
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
  AND NOT EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.userId = u.id AND m.role = 'SUPERADMIN'
  );

-- Verify the fix
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role as user_role,
  u.companyId,
  m.role as membership_role,
  m.companyId as membership_company
FROM users u
LEFT JOIN memberships m ON u.id = m.userId
WHERE u.email = 'adrian.stanca1@gmail.com';
