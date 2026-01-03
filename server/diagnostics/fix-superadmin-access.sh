#!/bin/bash
# Script to fix SuperAdmin access and verify database connectivity
# Usage: ./fix-superadmin-access.sh

set -e

echo "🔍 Checking SuperAdmin Access..."

# Database credentials from .env.production
DB_HOST="srv1374.hstgr.io"
DB_USER="u875310796_admin"
DB_PASSWORD="Cumparavinde1@"
DB_NAME="u875310796_cortexbuildpro"
DB_PORT="3306"

# User email to fix
USER_EMAIL="adrian@ascladdingltd.co.uk"

echo "📊 Running diagnostic queries..."

# Check current memberships
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
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
WHERE u.email = '$USER_EMAIL';
EOF

echo ""
echo "🔧 Fixing SuperAdmin access..."

# Add SUPERADMIN membership if not exists
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
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
WHERE u.email = '$USER_EMAIL'
AND NOT EXISTS (
    SELECT 1 FROM memberships m2 
    WHERE m2.userId = u.id 
    AND m2.role = 'SUPERADMIN'
);
EOF

echo ""
echo "✅ Verifying fix..."

# Verify SUPERADMIN role
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" - p"$DB_PASSWORD" "$DB_NAME" <<EOF
SELECT 
    u.email,
    m.role,
    m.status,
    c.name as company_name
FROM users u
JOIN memberships m ON u.id = m.userId
JOIN companies c ON m.companyId = c.id
WHERE u.email = '$USER_EMAIL'
AND m.role = 'SUPERADMIN';
EOF

echo ""
echo "🎉 SuperAdmin access fixed! Please log out and log back in for changes to take effect."
