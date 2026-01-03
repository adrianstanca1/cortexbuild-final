-- Migration: Enterprise Super Admin Schema
-- Version: 001
-- Description: Add comprehensive multi-tenant management tables and enhance existing schema
-- Date: 2025-12-28

-- ============================================================================
-- 1. Enhance companies table with additional enterprise fields
-- ============================================================================
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS legalname VARCHAR(500),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS securityprofile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS lastactivityat TIMESTAMP,
ADD COLUMN IF NOT EXISTS archivedat TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);

-- Update status column to support full lifecycle
COMMENT ON COLUMN companies.status IS 'Company lifecycle status: DRAFT, ACTIVE, SUSPENDED, ARCHIVED';

-- ============================================================================
-- 2. Create company_features table for feature entitlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS companyfeatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companyid TEXT NOT NULL,
  featurename VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW(),
  createdby TEXT,
  UNIQUE(companyid, featurename),
  FOREIGN KEY (companyid) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_companyfeatures_company ON companyfeatures(companyid);
CREATE INDEX IF NOT EXISTS idx_companyfeatures_name ON companyfeatures(featurename);

-- ============================================================================
-- 3. Create company_limits table for resource quotas
-- ============================================================================
CREATE TABLE IF NOT EXISTS companylimits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companyid TEXT NOT NULL,
  limittype VARCHAR(100) NOT NULL,
  limitvalue INTEGER NOT NULL,
  currentusage INTEGER DEFAULT 0,
  softlimitthreshold DECIMAL(3,2) DEFAULT 0.80,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW(),
  UNIQUE(companyid, limittype),
  FOREIGN KEY (companyid) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_companylimits_company ON companylimits(companyid);
CREATE INDEX IF NOT EXISTS idx_companylimits_type ON companylimits(limittype);

COMMENT ON TABLE companylimits IS 'Resource quotas and usage tracking per company';
COMMENT ON COLUMN companylimits.limittype IS 'Types: user_seats, projects, storage_gb, api_calls_per_day, etc.';
COMMENT ON COLUMN companylimits.softlimitthreshold IS 'Alert threshold as decimal (0.80 = 80%)';

-- ============================================================================
-- 4. Create user_invitations table for invitation management
-- ============================================================================
CREATE TABLE IF NOT EXISTS userinvitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  companyid TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  invitedby TEXT,
  token VARCHAR(255) UNIQUE NOT NULL,
  expiresat TIMESTAMP NOT NULL,
  acceptedat TIMESTAMP,
  status VARCHAR(50) DEFAULT 'PENDING',
  metadata JSONB DEFAULT '{}'::jsonb,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (companyid) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON userinvitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON userinvitations(companyid);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON userinvitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON userinvitations(status);

COMMENT ON TABLE userinvitations IS 'User invitation lifecycle management';
COMMENT ON COLUMN userinvitations.status IS 'Status: PENDING, ACCEPTED, EXPIRED, REVOKED';

-- ============================================================================
-- 5. Enhance audit_logs table with additional enterprise fields
-- ============================================================================
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS actortype VARCHAR(50),
ADD COLUMN IF NOT EXISTS targettype VARCHAR(100),
ADD COLUMN IF NOT EXISTS targetid VARCHAR(255),
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS beforestate JSONB,
ADD COLUMN IF NOT EXISTS afterstate JSONB,
ADD COLUMN IF NOT EXISTS correlationid UUID,
ADD COLUMN IF NOT EXISTS sessionid VARCHAR(255),
ADD COLUMN IF NOT EXISTS ipaddress VARCHAR(50),
ADD COLUMN IF NOT EXISTS useragent TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actortype ON audit_logs(actortype);
CREATE INDEX IF NOT EXISTS idx_audit_logs_targettype ON audit_logs(targettype);
CREATE INDEX IF NOT EXISTS idx_audit_logs_targetid ON audit_logs(targetid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlationid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(companyid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

COMMENT ON COLUMN audit_logs.actortype IS 'Actor type: SUPERADMIN, COMPANY_ADMIN, SYSTEM, etc.';
COMMENT ON COLUMN audit_logs.targettype IS 'Target resource: COMPANY, USER, FEATURE, LIMIT, etc.';

-- ============================================================================
-- 6. Create impersonation_sessions table for break-glass auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS impersonationsessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadminid TEXT NOT NULL,
  targetuserid TEXT,
  companyid TEXT,
  reason TEXT NOT NULL,
  startedat TIMESTAMP DEFAULT NOW(),
  expiresat TIMESTAMP NOT NULL,
  endedat TIMESTAMP,
  ipaddress VARCHAR(50),
  useragent TEXT,
  actionsperformed JSONB DEFAULT '[]'::jsonb,
  FOREIGN KEY (companyid) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_impersonation_superadmin ON impersonationsessions(superadminid);
CREATE INDEX IF NOT EXISTS idx_impersonation_company ON impersonationsessions(companyid);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonationsessions(endedat) WHERE endedat IS NULL;

COMMENT ON TABLE impersonationsessions IS 'Audit trail for Super Admin impersonation (break-glass)';
COMMENT ON COLUMN impersonationsessions.reason IS 'Required justification for impersonation';

-- ============================================================================
-- 7. Create permission_policies table for platform RBAC
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissionpolicies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  effect VARCHAR(20) DEFAULT 'ALLOW',
  conditions JSONB DEFAULT '{}'::jsonb,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, resource, action, scope)
);

CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissionpolicies(role);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissionpolicies(resource, action);

COMMENT ON TABLE permissionpolicies IS 'RBAC permission policies with scope-based access control';
COMMENT ON COLUMN permissionpolicies.scope IS 'Access scope: SYSTEM, TENANT, RESOURCE';
COMMENT ON COLUMN permissionpolicies.effect IS 'Effect: ALLOW, DENY (DENY overrides ALLOW)';

-- ============================================================================
-- 8. Create feature_definitions table for feature registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS featuredefinitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  displayname VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
 defaultenabled BOOLEAN DEFAULT false,
  requiresfeatures VARCHAR(255)[],
  configschema JSONB DEFAULT '{}'::jsonb,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_name ON featuredefinitions(name);
CREATE INDEX IF NOT EXISTS idx_features_category ON featuredefinitions(category);

COMMENT ON TABLE featuredefinitions IS 'Global feature catalog and definitions';
COMMENT ON COLUMN featuredefinitions.category IS 'Feature category: BILLING, REPORTS, INTEGRATIONS, ADVANCED_RBAC, etc.';
COMMENT ON COLUMN featuredefinitions.requiresfeatures IS 'Feature dependencies (array of feature names)';

-- ============================================================================
-- Migration validation
-- ============================================================================
-- Verify critical tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companyfeatures') THEN
    RAISE EXCEPTION 'Migration failed: companyfeatures table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companylimits') THEN
    RAISE EXCEPTION 'Migration failed: companylimits table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'userinvitations') THEN
    RAISE EXCEPTION 'Migration failed: userinvitations table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'impersonationsessions') THEN
    RAISE EXCEPTION 'Migration failed: impersonationsessions table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissionpolicies') THEN
    RAISE EXCEPTION 'Migration failed: permissionpolicies table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featuredefinitions') THEN
    RAISE EXCEPTION 'Migration failed: featuredefinitions table not created';
  END IF;
  
  RAISE NOTICE 'Migration 001 completed successfully!';
END $$;
