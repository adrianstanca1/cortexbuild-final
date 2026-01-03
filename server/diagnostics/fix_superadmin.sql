-- Quick fix: Ensure SuperAdmin role for user
-- Run this SQL on your production database

-- First, check current memberships
SELECT m.id, m.userId, m.companyId, m.role, m.status, u.email
FROM memberships m
JOIN users u ON m.userId = u.id
WHERE u.email = 'adrian@ascladdingltd.co.uk';

-- If user has no SUPERADMIN membership, create one
-- Get user ID and any company ID first:
-- SELECT id FROM users WHERE email = 'adrian@ascladdingltd.co.uk';
-- SELECT id FROM companies LIMIT 1;

-- For MySQL (Production):
INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
SELECT 
    UUID() as id,
    u.id as userId,
    (SELECT id FROM companies LIMIT 1) as companyId,
    'SUPERADMIN' as role,
    'active' as status,
    NOW() as createdAt,
    NOW() as updatedAt
FROM users u
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND NOT EXISTS (
    SELECT 1 FROM memberships m2 
    WHERE m2.userId = u.id 
    AND m2.role = 'SUPERADMIN'
);

-- Verify the fix
SELECT m.role, c.name as company_name, u.email
FROM memberships m
JOIN users u ON m.userId = u.id
LEFT JOIN companies c ON m.companyId = c.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND m.role = 'SUPERADMIN';
