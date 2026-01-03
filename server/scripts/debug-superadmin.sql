-- Debug SuperAdmin User - Check Database State
-- Run this to see exactly what's in your database

-- 1. Check if user exists in users table
SELECT 
  'Users Table Check' as check_name,
  id, 
  email, 
  name, 
  role, 
  companyId, 
  status, 
  isActive
FROM users 
WHERE email = 'adrian.stanca1@gmail.com';

-- 2. Check memberships
SELECT 
  'Memberships Check' as check_name,
  m.id,
  m.userId,
  m.companyId,
  m.role,
  m.status,
  u.email
FROM memberships m
JOIN users u ON m.userId = u.id
WHERE u.email = 'adrian.stanca1@gmail.com';

-- 3. Check if platform-admin company exists
SELECT 
  'Company Check' as check_name,
  id,
  name,
  status
FROM companies
WHERE id = 'platform-admin';

-- 4. Count all users (to see if table is populated)
SELECT 
  'Total Users Count' as check_name,
  COUNT(*) as total_users
FROM users;
