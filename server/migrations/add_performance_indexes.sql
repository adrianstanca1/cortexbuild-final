-- Performance Optimization: Add Indexes for High-Traffic Tables
-- Migration: add_performance_indexes.sql
-- Created: 2026-01-03
-- Purpose: Improve query performance for frequently accessed tables

-- ============================================
-- Audit Logs Performance Indexes
-- ============================================

-- Index for company-scoped timeline queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_timestamp 
ON audit_logs(companyId, timestamp DESC);

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(userId, timestamp DESC);

-- Index for resource-based audit trail lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource, resourceId);

-- ============================================
-- Activity Feed Performance Indexes
-- ============================================

-- Index for company-wide activity feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_company_timestamp 
ON activity_feed(companyId, timestamp DESC);

-- Index for project-specific activity feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_project_timestamp 
ON activity_feed(projectId, timestamp DESC);

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_activity_feed_user 
ON activity_feed(userId, timestamp DESC);

-- ============================================
-- Tasks Performance Indexes
-- ============================================

-- Composite index for project tasks with status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(projectId, status, dueDate);

-- Index for assignee-based task queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee 
ON tasks(assignedTo, status, dueDate);

-- Index for company-wide task queries
CREATE INDEX IF NOT EXISTS idx_tasks_company 
ON tasks(companyId, status);

-- ============================================
-- Documents Performance Indexes
-- ============================================

-- Index for project documents with category filtering
CREATE INDEX IF NOT EXISTS idx_documents_project_category 
ON documents(projectId, category, uploadedAt DESC);

-- Index for company-wide document searches
CREATE INDEX IF NOT EXISTS idx_documents_company 
ON documents(companyId, uploadedAt DESC);

-- ============================================
-- Team Members Performance Indexes
-- ============================================

-- Index for company team lookups with role filtering
CREATE INDEX IF NOT EXISTS idx_team_company_role 
ON team(companyId, role);

-- Index for email-based lookups (login, invitations)
CREATE INDEX IF NOT EXISTS idx_team_email 
ON team(email);

-- ============================================
-- RFIs Performance Indexes
-- ============================================

-- Index for project RFIs with status filtering
CREATE INDEX IF NOT EXISTS idx_rfis_project_status 
ON rfis(projectId, status, createdAt DESC);

-- Index for company-wide RFI queries
CREATE INDEX IF NOT EXISTS idx_rfis_company 
ON rfis(companyId, status);

-- ============================================
-- Daily Logs Performance Indexes
-- ============================================

-- Index for project daily logs by date
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date 
ON daily_logs(projectId, logDate DESC);

-- Index for company-wide daily logs
CREATE INDEX IF NOT EXISTS idx_daily_logs_company 
ON daily_logs(companyId, logDate DESC);

-- ============================================
-- Safety Incidents Performance Indexes
-- ============================================

-- Index for project safety incidents
CREATE INDEX IF NOT EXISTS idx_safety_incidents_project 
ON safety_incidents(projectId, severity DESC, reportedAt DESC);

-- Index for company-wide safety tracking
CREATE INDEX IF NOT EXISTS idx_safety_incidents_company 
ON safety_incidents(companyId, severity DESC, reportedAt DESC);

-- ============================================
-- Inventory Performance Indexes
-- ============================================

-- Index for company inventory lookups
CREATE INDEX IF NOT EXISTS idx_inventory_company 
ON inventory(companyId, status);

-- Index for project-specific inventory
CREATE INDEX IF NOT EXISTS idx_inventory_project 
ON inventory(projectId, status);

-- ============================================
-- Timesheets Performance Indexes
-- ============================================

-- Index for user timesheets by period
CREATE INDEX IF NOT EXISTS idx_timesheets_user_period 
ON timesheets(userId, workDate DESC);

-- Index for company timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_company 
ON timesheets(companyId, workDate DESC);

-- ============================================
-- Projects Performance Indexes
-- ============================================

-- Index for company projects
CREATE INDEX IF NOT EXISTS idx_projects_company 
ON projects(companyId, status, startDate DESC);

-- ============================================
-- Users/Authentication Performance Indexes
-- ============================================

-- Index for email-based authentication (already exists in most DBs, but ensuring)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index for company user lookups
CREATE INDEX IF NOT EXISTS idx_users_company 
ON users(companyId, role);

-- ============================================
-- Companies Performance Indexes
-- ============================================

-- Index for company lookups by status (for platform admin)
CREATE INDEX IF NOT EXISTS idx_companies_status 
ON companies(status, createdAt DESC);

-- ============================================
-- Invitations Performance Indexes  
-- ============================================

-- Index for email-based invitation lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email 
ON invitations(email, status);

-- Index for company invitations
CREATE INDEX IF NOT EXISTS idx_invitations_company 
ON invitations(companyId, status);

-- ============================================
-- Performance Notes
-- ============================================
-- These indexes are designed to optimize:
-- 1. Timeline queries (DESC timestamp ordering)
-- 2. Company/Project-scoped filtering (multi-tenant architecture)
-- 3. Status-based filtering (common in task management)
-- 4. User-specific queries (activity tracking, assignments)
--
-- Index maintenance:
-- - SQLite: Indexes are automatically maintained
-- - PostgreSQL: Run ANALYZE periodically
-- - MySQL: Run OPTIMIZE TABLE periodically
--
-- Monitoring:
-- - Track query performance before/after
-- - Monitor index usage with database-specific tools
-- - Adjust indexes based on actual query patterns
