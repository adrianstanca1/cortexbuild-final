-- Rollback Migration: Enterprise Super Admin Schema
-- Version: 001_rollback
-- Description: Rollback all changes from migration 001
-- Date: 2025-12-28

-- WARNING: This will drop tables and remove columns. Data will be lost!

-- ============================================================================
-- Rollback in reverse order of creation
-- ============================================================================

-- 8. Drop feature_definitions table
DROP TABLE IF EXISTS feature_definitions CASCADE;

-- 7. Drop permission_policies table
DROP TABLE IF EXISTS permission_policies CASCADE;

-- 6. Drop impersonation_sessions table
DROP TABLE IF NOT EXISTS impersonation_sessions CASCADE;

-- 5. Remove enhanced audit_logs columns
ALTER TABLE audit_logs 
DROP COLUMN IF EXISTS actor_type,
DROP COLUMN IF EXISTS target_type,
DROP COLUMN IF EXISTS target_id,
DROP COLUMN IF EXISTS reason,
DROP COLUMN IF EXISTS before_state,
DROP COLUMN IF EXISTS after_state,
DROP COLUMN IF EXISTS correlation_id,
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS ip_address,
DROP COLUMN IF EXISTS user_agent;

-- 4. Drop user_invitations table
DROP TABLE IF EXISTS user_invitations CASCADE;

-- 3. Drop company_limits table
DROP TABLE IF EXISTS company_limits CASCADE;

-- 2. Drop company_features table
DROP TABLE IF EXISTS company_features CASCADE;

-- 1. Remove columns from companies table
ALTER TABLE companies 
DROP COLUMN IF EXISTS slug,
DROP COLUMN IF EXISTS legal_name,
DROP COLUMN IF EXISTS industry,
DROP COLUMN IF EXISTS region,
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS security_profile,
DROP COLUMN IF EXISTS last_activity_at,
DROP COLUMN IF EXISTS archived_at,
DROP COLUMN IF EXISTS metadata;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback 001 completed successfully!';
END $$;
