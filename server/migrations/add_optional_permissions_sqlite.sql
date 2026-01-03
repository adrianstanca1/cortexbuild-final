-- Optional Permissions System Migration (SQLite Compatible)
-- Adds support for granular optional permissions and break-glass access

-- Optional Permissions Table
CREATE TABLE IF NOT EXISTS optional_permissions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  companyId TEXT NOT NULL,
  permission TEXT NOT NULL,
  grantedBy TEXT NOT NULL,
  grantedAt TEXT NOT NULL,
  expiresAt TEXT,
  constraints TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_opt_perm_user_permission ON optional_permissions(userId, permission);
CREATE INDEX IF NOT EXISTS idx_opt_perm_company ON optional_permissions(companyId);
CREATE INDEX IF NOT EXISTS idx_opt_perm_expiry ON optional_permissions(expiresAt);

-- Ensure emergency_access table exists
CREATE TABLE IF NOT EXISTS emergency_access (
  id TEXT PRIMARY KEY,
  adminId TEXT NOT NULL,
  targetCompanyId TEXT NOT NULL,
  justification TEXT NOT NULL,
  grantedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (adminId) REFERENCES users(id),
  FOREIGN KEY (targetCompanyId) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_emerg_admin ON emergency_access(adminId);
CREATE INDEX IF NOT EXISTS idx_emerg_target_company ON emergency_access(targetCompanyId);
CREATE INDEX IF NOT EXISTS idx_emerg_status ON emergency_access(status);
CREATE INDEX IF NOT EXISTS idx_emerg_expiry ON emergency_access(expiresAt);

-- Add severity column to audit_logs if table exists
-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we check first
-- This will fail silently if column already exists
