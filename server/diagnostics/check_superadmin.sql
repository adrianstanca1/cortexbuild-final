-- Diagnostic Script: Check SuperAdmin Access
-- This script verifies user permissions and fixes common authorization issues

-- 1. Check current user memberships
SELECT 
    u.id,
    u.email,
    u.name,
    u.status as user_status,
    m.role,
    m.companyId,
    m.status as membership_status,
    c.name as company_name
FROM users u
LEFT JOIN memberships m ON u.id = m.userId
LEFT JOIN companies c ON m.companyId = c.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
ORDER BY m.role DESC;

-- 2. Check if SUPERADMIN role exists in any membership
SELECT COUNT(*) as superadmin_count
FROM memberships m
JOIN users u ON m.userId = u.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND m.role = 'SUPERADMIN';

-- 3. If no SUPERADMIN role found, create one
-- Note: You'll need to replace {USER_ID} and {COMPANY_ID} with actual values from query #1

-- INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
-- VALUES (
--     lower(hex(randomblob(16))),  -- For SQLite
--     '{USER_ID}',
--     '{COMPANY_ID}',
--     'SUPERADMIN',
--     'active',
--     datetime('now'),
--     datetime('now')
-- );

-- For MySQL, use:
-- INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
-- VALUES (
--     UUID(),
--     '{USER_ID}',
--     '{COMPANY_ID}',
--     'SUPERADMIN',
--     'active',
--     NOW(),
--     NOW()
-- );

-- 4. Verify the fix
SELECT 
    u.email,
    m.role,
    c.name as company_name
FROM users u
JOIN memberships m ON u.id = m.userId
JOIN companies c ON m.companyId = c.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND m.role = 'SUPERADMIN';

-- 5. Check all companies (to get a company ID if needed)
SELECT id, name, slug, status
FROM companies
ORDER BY createdAt DESC
LIMIT 10;
