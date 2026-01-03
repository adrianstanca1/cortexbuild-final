-- Row-Level Security (RLS) Policies for Tenant Isolation
-- Phase 7: Security & Compliance
-- IMPORTANT: Review and test in development before applying to production

-- Enable RLS on tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY projects_superadmin_access ON projects
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Tasks RLS Policies
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY tasks_superadmin_access ON tasks
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Documents RLS Policies
CREATE POLICY documents_tenant_isolation ON documents
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY documents_superadmin_access ON documents
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Daily Logs RLS Policies
CREATE POLICY daily_logs_tenant_isolation ON daily_logs
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY daily_logs_superadmin_access ON daily_logs
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- RFIs RLS Policies
CREATE POLICY rfis_tenant_isolation ON rfis
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY rfis_superadmin_access ON rfis
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Safety Incidents RLS Policies
CREATE POLICY safety_incidents_tenant_isolation ON safety_incidents
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY safety_incidents_superadmin_access ON safety_incidents
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Client Portals RLS Policies
CREATE POLICY client_portals_tenant_isolation ON client_portals
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY client_portals_superadmin_access ON client_portals
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Invoices RLS Policies
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (companyId = current_setting('app.current_tenant_id', true));

CREATE POLICY invoices_superadmin_access ON invoices
  FOR ALL
  USING (current_setting('app.is_superadmin', true)::boolean = true);

-- Validation Triggers
-- Ensure companyId cannot be changed to different tenant

CREATE OR REPLACE FUNCTION validate_company_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.companyId != NEW.companyId THEN
    RAISE EXCEPTION 'Cannot change companyId to different tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_validate_company_update
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_id_update();

CREATE TRIGGER tasks_validate_company_update
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_id_update();

CREATE TRIGGER documents_validate_company_update
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_id_update();

-- Audit RLS Policy Changes
INSERT INTO audit_logs (id, userId, companyId, action, resource, severity, createdAt)
VALUES (
  uuid_generate_v4(),
  'system',
  'system',
  'RLS_POLICIES_ENABLED',
  'database_security',
  'critical',
  NOW()
);

-- NOTE: To use RLS policies, the application must set session variables:
-- SET app.current_tenant_id = 'company-id';
-- SET app.is_superadmin = 'true' or 'false';
