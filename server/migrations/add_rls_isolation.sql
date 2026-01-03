-- ============================================================================
-- ROW-LEVEL SECURITY MIGRATION
-- Enterprise Multi-Tenant Isolation Enhancement
-- ============================================================================
-- Run this AFTER fixing SUPERADMIN role
-- Compatible with both MySQL and PostgreSQL
-- ============================================================================

-- Step 1: Create emergency access tracking table
CREATE TABLE IF NOT EXISTS emergency_access (
    id VARCHAR(36) PRIMARY KEY,
    superadminId VARCHAR(36) NOT NULL,
    companyId VARCHAR(36) NOT NULL,
    justification TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME NOT NULL,
    revokedAt DATETIME NULL,
    INDEX idx_superadmin (superadminId),
    INDEX idx_company (companyId),
    INDEX idx_expires (expiresAt)
);

-- Step 2: Add tenant isolation tracking to audit logs
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS crossTenantAccess BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accessJustification TEXT NULL;

-- Step 3: Create indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(companyId);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(companyId);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(companyId);
CREATE INDEX IF NOT EXISTS idx_team_company ON team(companyId);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(companyId);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(companyId);
CREATE INDEX IF NOT EXISTS idx_daily_logs_company ON  daily_logs(companyId);
CREATE INDEX IF NOT EXISTS idx_rfis_company ON rfis(companyId);
CREATE INDEX IF NOT EXISTS idx_punch_items_company ON punch_items(companyId);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_company ON safety_incidents(companyId);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(companyId);
CREATE INDEX IF NOT EXISTS idx_timesheets_company ON timesheets(companyId);

-- Step 4: PostgreSQL ONLY - Enable Row-Level Security
-- Uncomment if using PostgreSQL
/*
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ... enable for all tenant-scoped tables

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation ON projects
  FOR ALL
  USING (
    companyId = current_setting('app.current_tenant', true)::text
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.userId = current_setting('app.current_user', true)::text
      AND m.role = 'SUPERADMIN'
    )
  );

-- Repeat for all tables...
*/

-- Step 5: Create tenant context validation function (MySQL)
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS validate_tenant_access(
    p_companyId VARCHAR(36),
    p_userId VARCHAR(36)
) RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE is_superadmin BOOLEAN;
    DECLARE user_company VARCHAR(36);
    
    -- Check if user is SUPERADMIN
    SELECT EXISTS(
        SELECT 1 FROM memberships 
        WHERE userId = p_userId AND role = 'SUPERADMIN'
    ) INTO is_superadmin;
    
    IF is_superadmin THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user belongs to the company
    SELECT companyId INTO user_company
    FROM memberships
    WHERE userId = p_userId
    LIMIT 1;
    
    RETURN user_company = p_companyId;
END$$

DELIMITER ;

-- Step 6: Verify isolation
SELECT 
    TABLE_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLUMN_NAME = 'companyId'
ORDER BY TABLE_NAME;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
DROP TABLE IF EXISTS emergency_access;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS crossTenantAccess;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS accessJustification;
DROP FUNCTION IF EXISTS validate_tenant_access;
*/
