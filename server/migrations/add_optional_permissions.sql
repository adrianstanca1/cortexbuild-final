-- Optional Permissions System Migration
-- Adds support for granular optional permissions and break-glass access

-- Optional Permissions Table
CREATE TABLE IF NOT EXISTS optional_permissions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  companyId VARCHAR(36) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  grantedBy VARCHAR(36) NOT NULL,
  grantedAt DATETIME NOT NULL,
  expiresAt DATETIME,
  constraints JSON,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES users(id),
  INDEX idx_user_permission (userId, permission),
  INDEX idx_company (companyId),
  INDEX idx_expiry (expiresAt)
);

-- Add severity column to audit_logs if not exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';

-- Create index on audit_logs for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Ensure emergency_access table exists (from previous migration)
CREATE TABLE IF NOT EXISTS emergency_access (
  id VARCHAR(36) PRIMARY KEY,
  adminId VARCHAR(36) NOT NULL,
  targetCompanyId VARCHAR(36) NOT NULL,
  justification TEXT NOT NULL,
  grantedAt DATETIME NOT NULL,
  expiresAt DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  FOREIGN KEY (adminId) REFERENCES users(id),
  FOREIGN KEY (targetCompanyId) REFERENCES companies(id),
  INDEX idx_admin (adminId),
  INDEX idx_target_company (targetCompanyId),
  INDEX idx_status (status),
  INDEX idx_expiry (expiresAt)
);

-- Insert common optional permissions
INSERT INTO optional_permissions (id, userId, companyId, permission, grantedBy, grantedAt, expiresAt, constraints)
SELECT 
  CONCAT('perm-', UUID()),
  'system',
  'system',
  permission_name,
  'system',
  NOW(),
  NULL,
  NULL
FROM (
  SELECT 'invite_users' AS permission_name
  UNION SELECT 'manage_roles'
  UNION SELECT 'access_documents'
  UNION SELECT 'view_audit_logs'
  UNION SELECT 'upload_documents'
  UNION SELECT 'download_documents'
) AS permissions
WHERE NOT EXISTS (
  SELECT 1 FROM optional_permissions 
  WHERE userId = 'system' AND companyId = 'system'
);
