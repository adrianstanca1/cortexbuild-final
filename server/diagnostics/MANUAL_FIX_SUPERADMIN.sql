-- ============================================================================
-- SUPERADMIN ROLE FIX - RUN THIS MANUALLY IN YOUR DATABASE
-- ============================================================================
-- Database: u875310796_cortexbuildpro (Hostinger MySQL)
-- User Email: adrian@ascladdingltd.co.uk
-- ============================================================================

-- STEP 1: Check current memberships
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    m.id as membership_id,
    m.role,
    m.status,
    c.name as company_name
FROM users u
LEFT JOIN memberships m ON u.id = m.userId
LEFT JOIN companies c ON m.companyId = c.id
WHERE u.email = 'adrian@ascladdingltd.co.uk';

-- STEP 2: Check if SUPERADMIN role exists
SELECT COUNT(*) as superadmin_count
FROM memberships m
JOIN users u ON m.userId = u.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND m.role = 'SUPERADMIN';

-- STEP 3: Add SUPERADMIN membership if not exists
INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
SELECT 
    UUID() as id,
    u.id as userId,
    (SELECT id FROM companies ORDER BY createdAt ASC LIMIT 1) as companyId,
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

-- STEP 4: Verify the fix
SELECT 
    u.email,
    m.role,
    m.status,
    c.name as company_name,
    m.createdAt
FROM users u
JOIN memberships m ON u.id = m.userId
LEFT JOIN companies c ON m.companyId = c.id
WHERE u.email = 'adrian@ascladdingltd.co.uk'
AND m.role = 'SUPERADMIN';

-- STEP 5: After running, log out and log back in to refresh your session

-- ============================================================================
-- ADDITIONAL: If you need to create a platform administrative company
-- ============================================================================
/*
INSERT INTO companies (
    id, name, slug, status, plan, region, 
    maxUsers, maxProjects, storageQuotaGB, createdAt, updatedAt
) VALUES (
    UUID(),
    'Platform Administration',
    'platform-admin',
    'ACTIVE',
    'enterprise',
    'global',
    999999,
    999999,
    999999,
    NOW(),
    NOW()
);
*/
