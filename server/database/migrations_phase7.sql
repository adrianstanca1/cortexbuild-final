-- Migration for Phase 7: Security Controls
-- Adds impersonation sessions tracking

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id TEXT PRIMARY KEY,
  adminId TEXT NOT NULL,
  targetUserId TEXT NOT NULL,
  companyId TEXT NOT NULL, -- The company context for the impersonation
  reason TEXT,
  token TEXT UNIQUE NOT NULL, -- The specific token for this session
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'revoked'
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  completedAt TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  FOREIGN KEY (adminId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (targetUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- Index for active sessions lookup
CREATE INDEX IF NOT EXISTS idx_impersonation_active_token ON impersonation_sessions(token) WHERE status = 'active';
