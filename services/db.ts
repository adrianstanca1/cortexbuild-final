/// <reference types="vite/client" />
import { Project, Task, TeamMember, ProjectDocument, Client, InventoryItem, RFI, PunchItem, DailyLog, Daywork, SafetyIncident, SafetyHazard, Equipment, Timesheet, Tenant, Transaction, TenantUsage, TenantAuditLog, TenantAnalytics, Defect, ProjectRisk, PurchaseOrder, Invoice, ExpenseClaim, CostCode, SystemHealth, MLModel, MLPrediction } from '@/types';
import { supabase } from './supabaseClient';


const API_URL = (import.meta.env?.VITE_API_URL || 'https://api.cortexbuildpro.com/api') + '/v1';
console.log('[DB Service] Initialized with API_URL:', API_URL);

class DatabaseService {
  private useMock = false;
  private tenantId: string | null = null;
  private headerCache: { headers: Record<string, string>; expires: number } | null = null;
  private readonly CACHE_TTL = 2000; // 2 seconds

  constructor() {
    // Health check removed from constructor to prevent unauthenticated 401 calls on landing page
  }

  setTenantId(id: string | null) {
    if (this.tenantId !== id) {
      this.tenantId = id;
      this.headerCache = null; // Invalidate cache on tenant change
    }
  }

  private get healthUrl(): string {
    // API_URL is https://api.cortexbuildpro.com/api/v1
    // We want https://api.cortexbuildpro.com/api/health
    return API_URL.replace(/\/v\d+$/, '') + '/health';
  }

  private async checkHealth() {
    try {
      // Use the PUBLIC /health endpoint (no auth required)
      // Previously used /projects which returns 401 for unauthenticated users,
      // incorrectly triggering mock mode
      const res = await fetch(this.healthUrl, { method: 'GET' });
      if (!res.ok) throw new Error("API Unreachable");
      const data = await res.json();
      console.log(`[DB Service] Connected to Backend API - Status: ${data.status}, DB: ${data.database?.status}`);
    } catch (e) {
      console.error("[DB Service] Backend API unreachable. Application will degrade.", e);
      this.useMock = true;
    }
  }



  private async getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const now = Date.now();
    // Cache only applies if no extra headers are requested (most common case)
    if (this.headerCache && this.headerCache.expires > now && Object.keys(extra).length === 0) {
      return this.headerCache.headers;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.tenantId) headers['x-company-id'] = this.tenantId;

    try {
      // Get current session. getSession() is cached and handles token refresh automatically
      // when needed. Calling refreshSession() here on every request was hitting rate limits.
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
        console.debug('[DB Service] Auth token attached to request');
      } else {
        // Fallback: Check for dev token in localStorage (for dev backdoor auth)
        const devToken = localStorage.getItem('dev_auth_token');
        if (devToken) {
          headers['Authorization'] = `Bearer ${devToken}`;
          console.log('[DB Service] Using dev token from localStorage');
        } else {
          console.warn('[DB Service] No active session found - API calls will fail with 401');
        }
      }
    } catch (e) {
      console.error('[DB Service] Error getting auth headers:', e);
    }

    // Cache the result for next time (only if no extra headers)
    if (Object.keys(extra).length === 0) {
      this.headerCache = {
        headers: { ...headers },
        expires: now + this.CACHE_TTL
      };
    }

    return headers;
  }

  // --- Generic Helpers ---
  async fetch<T>(endpoint: string): Promise<T[]> {
    if (this.useMock) {
      console.log(`[MockDB] Fetching ${endpoint}`);
      return [];
    }

    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        headers: await this.getHeaders()
      });

      if (!res.ok) {
        console.error(`[API Error] Fetch failed for ${endpoint}: ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items = data.data || data;

      if (!Array.isArray(items)) {
        console.warn(`[API Warning] Expected array from ${endpoint}, got ${typeof items}`);
        return [];
      }

      return items;
    } catch (e: any) {
      console.error(`[API Error] Fetch exception for ${endpoint}:`, {
        message: e.message,
        type: e.name,
        apiUrl: API_URL
      });
      return []; // Return empty array on network errors too
    }
  }

  private async getSingle<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    if (this.useMock) {
      console.log(`[MockDB] Fetching Single ${endpoint}`);
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          ...(await this.getHeaders()), // Await the promise here
          ...options.headers,
        },
      });

      if (!res.ok) {
        console.error(`[API Error] Fetch failed for ${endpoint}: ${res.status} ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data.data || data; // Handle wrapped response { data: T } or direct T
    } catch (error) {
      console.error(`[API Error] Exception fetching ${endpoint}:`, error);
      return null;
    }
  }

  private async post<T>(endpoint: string, data: T): Promise<T | null> {
    if (this.useMock) {
      console.log(`[MockDB] POST ${endpoint}`, data);
      return { ...data, id: 'mock-id-' + Date.now() } as any;
    }
    try {
      const headers = await this.getHeaders({ 'Content-Type': 'application/json' });

      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[API] Error response:`, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Failed to post to ${endpoint} (${res.status})`);
      }

      const result = await res.json();
      console.log(`[API] Success response:`, result);
      return result;
    } catch (e) {
      console.error(`[API] Exception in POST ${endpoint}:`, e);
      throw e;
    }
  }

  private async put<T>(endpoint: string, id: string, data: Partial<T>): Promise<void> {
    if (this.useMock) {
      console.log(`[MockDB] PUT ${endpoint}/${id}`, data);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${endpoint}/${id}`, {
        method: 'PUT',
        headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Failed to update ${endpoint}/${id}`);
    } catch (e) {
      console.error(`API Error (${endpoint}):`, e);
    }
  }

  private async delete(endpoint: string, id: string): Promise<void> {
    if (this.useMock) {
      console.log(`[MockDB] DELETE ${endpoint}/${id}`);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: await this.getHeaders()
      });
      if (!res.ok) throw new Error(`Failed to delete ${endpoint}/${id}`);
    } catch (e) {
      console.error(`API Error (${endpoint}):`, e);
    }
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    return this.fetch<Project>('projects');
  }
  async addProject(p: Project) {
    await this.post('projects', p);
  }
  async updateProject(id: string, p: Partial<Project>) {
    await this.put('projects', id, p);
  }
  async deleteProject(id: string) {
    await this.delete('projects', id);
  }

  // --- Tasks ---
  async getTasks(projectId?: string): Promise<Task[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.fetch<Task>(`tasks${query}`);
  }
  async addTask(t: Task) {
    await this.post('tasks', t);
  }
  async updateTask(id: string, t: Partial<Task>) {
    await this.put('tasks', id, t);
  }
  async getCriticalPath(projectId: string): Promise<any[]> {
    const data = await this.getSingle<any>(`tasks/analysis/critical-path?projectId=${projectId}`);
    return (data as any)?.data || [];
  }

  // --- Automations (Phase 14) ---
  async getAutomations(): Promise<any[]> {
    const data = await this.getSingle<any>('automations');
    return (data as any)?.data || [];
  }

  async createAutomation(a: any): Promise<any> {
    const data = await this.post<any>('automations', a);
    return (data as any)?.data;
  }

  // --- Predictive Intelligence (Phase 14) ---
  async getPredictiveAnalysis(projectId: string): Promise<any> {
    const data = await this.getSingle<any>(`predictive/${projectId}`);
    return (data as any)?.data;
  }

  async getBulkPredictiveAnalysis(): Promise<any[]> {
    const data = await this.getSingle<any>('predictive/all');
    return (data as any)?.data || [];
  }

  // --- AI Assets (Phase 6) ---
  async getAIAssets(type?: 'IMAGE' | 'VIDEO' | 'ANALYSIS', limit: number = 50): Promise<any[]> {
    const query = new URLSearchParams({ type: type || '', limit: limit.toString() }).toString();
    const data = await this.getSingle<any>(`ai/assets?${query}`);
    return (data as any)?.data || [];
  }

  async saveAIAsset(asset: { type: string; url: string; prompt?: string; projectId?: string; metadata?: any }): Promise<any> {
    const data = await this.post<any>('ai/assets', asset);
    return (data as any)?.data;
  }

  async deleteAIAsset(id: string): Promise<void> {
    await this.delete('ai/assets', id);
  }

  // --- OCR (Phase 14) ---
  async extractOcrData(file: File, type: string = 'general'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers = await this.getHeaders();
    delete headers['Content-Type']; // Multipart handled by browser

    const res = await fetch(`${API_URL}/ocr/extract`, {
      method: "POST",
      headers,
      body: formData
    });
    if (!res.ok) throw new Error("Failed to extract OCR data");
    const data = await res.json();
    return data.data;
  }

  // --- Team ---
  async getTeam(): Promise<TeamMember[]> {
    return this.fetch<TeamMember>('team');
  }
  async addTeamMember(m: TeamMember) {
    await this.post('team', m);
  }

  // --- Vendors ---
  async getVendors(): Promise<any[]> {
    return this.fetch('vendors');
  }
  async addVendor(v: any) {
    await this.post('vendors', v);
  }
  async updateVendor(id: string, updates: Partial<any>) {
    await this.put('vendors', id, updates);
  }

  // --- Documents ---
  async getDocuments(): Promise<ProjectDocument[]> {
    return this.fetch<ProjectDocument>('documents');
  }
  async addDocument(d: Partial<ProjectDocument>) {
    await this.post('documents', d);
  }
  async updateDocument(id: string, d: Partial<ProjectDocument>) {
    await this.put('documents', id, d);
  }

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    return this.fetch<Client>('clients');
  }
  async addClient(c: Client) {
    await this.post('clients', c);
  }

  // --- Inventory ---
  async getInventory(): Promise<InventoryItem[]> {
    return this.fetch<InventoryItem>('inventory');
  }
  async addInventoryItem(i: InventoryItem) {
    await this.post('inventory', i);
  }
  async updateInventoryItem(id: string, i: Partial<InventoryItem>) {
    await this.put('inventory', id, i);
  }

  // --- RFIs ---
  async getRFIs(): Promise<RFI[]> {
    return this.fetch<RFI>('rfis');
  }
  async addRFI(item: RFI) {
    await this.post('rfis', item);
  }
  async updateRFI(id: string, updates: Partial<RFI>) {
    await this.put('rfis', id, updates);
  }
  async deleteRFI(id: string) {
    await this.delete('rfis', id);
  }

  // --- Punch Items ---
  async getPunchItems(): Promise<PunchItem[]> {
    return this.fetch<PunchItem>('punch_items');
  }
  async addPunchItem(item: PunchItem) {
    await this.post('punch_items', item);
  }

  // --- Daily Logs ---
  async getDailyLogs(): Promise<DailyLog[]> {
    return this.fetch<DailyLog>('daily_logs');
  }
  async addDailyLog(item: DailyLog) {
    await this.post('daily_logs', item);
  }
  async updateDailyLog(id: string, updates: Partial<DailyLog>) {
    await this.put('daily_logs', id, updates);
  }
  async deleteDailyLog(id: string) {
    await this.delete('daily_logs', id);
  }

  // --- Dayworks ---
  async getDayworks(): Promise<Daywork[]> {
    return this.fetch<Daywork>('dayworks');
  }
  async addDaywork(item: Daywork) {
    await this.post('dayworks', item);
  }

  // --- Safety Incidents ---
  async getSafetyIncidents(): Promise<SafetyIncident[]> {
    return this.fetch<SafetyIncident>('safety_incidents');
  }
  async addSafetyIncident(item: SafetyIncident) {
    await this.post('safety_incidents', item);
  }
  async updateSafetyIncident(id: string, u: Partial<SafetyIncident>) {
    await this.put('safety_incidents', id, u);
  }

  // --- Safety Hazards ---
  async getSafetyHazards(): Promise<SafetyHazard[]> {
    return this.fetch<SafetyHazard>('safety_hazards');
  }
  async addSafetyHazard(item: SafetyHazard) {
    await this.post('safety_hazards', item);
  }

  // --- Equipment ---
  async getEquipment(): Promise<Equipment[]> {
    return this.fetch<Equipment>('equipment');
  }
  async addEquipment(item: Equipment) {
    await this.post('equipment', item);
  }
  async updateEquipment(id: string, u: Partial<Equipment>) {
    await this.put('equipment', id, u);
  }

  // --- Timesheets ---
  async getTimesheets(): Promise<Timesheet[]> {
    return this.fetch<Timesheet>('timesheets');
  }
  async addTimesheet(item: Timesheet) {
    await this.post('timesheets', item);
  }
  async updateTimesheet(id: string, u: Partial<Timesheet>) {
    if (this.useMock) return;
    await this.put('timesheets', id, u);
  }

  // --- Transactions ---
  async getTransactions(): Promise<Transaction[]> {
    return this.fetch<Transaction>('transactions');
  }
  async addTransaction(item: Transaction) {
    await this.post('transactions', item);
  }
  async updateTransaction(id: string, updates: Partial<Transaction>) {
    await this.put('transactions', id, updates);
  }

  // --- Purchase Orders ---
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.fetch<PurchaseOrder>('purchase_orders');
  }
  async addPurchaseOrder(item: PurchaseOrder) {
    await this.post('purchase_orders', item);
  }
  async updatePurchaseOrder(id: string, u: Partial<PurchaseOrder>) {
    await this.put('purchase_orders', id, u);
  }

  // --- Channels ---
  async getChannels(): Promise<any[]> {
    return this.fetch('channels');
  }
  async addChannel(item: any) {
    await this.post('channels', item);
  }

  // --- Team Messages ---
  async getTeamMessages(): Promise<any[]> {
    return this.fetch('team_messages');
  }
  async addTeamMessage(item: any) {
    await this.post('team_messages', item);
  }

  // --- Defects ---
  async getDefects(): Promise<Defect[]> {
    return this.fetch<Defect>('defects');
  }
  async addDefect(item: Defect) {
    await this.post('defects', item);
  }
  async updateDefect(id: string, u: Partial<Defect>) {
    await this.put('defects', id, u);
  }
  async deleteDefect(id: string) {
    await this.delete('defects', id);
  }

  // --- Project Health Forecasting ---
  async getProjectRisks(): Promise<ProjectRisk[]> {
    return this.fetch<ProjectRisk>('project_risks');
  }

  async addProjectRisk(item: ProjectRisk) {
    await this.post('project_risks', item);
  }


  // --- Companies ---
  async getCompanies(): Promise<Tenant[]> {
    return this.fetch<Tenant>('companies/all');
  }
  async addCompany(item: Tenant) {
    await this.post('companies', item);
  }
  async updateCompany(id: string, updates: Partial<Tenant>) {
    await this.put('companies', id, updates);
  }
  async deleteCompany(id: string) {
    await this.delete('companies', id);
  }

  // --- Dashboards & Widgets ---
  async getDashboards(): Promise<any[]> {
    return this.fetch<any>('dashboards');
  }

  async createDashboard(data: any): Promise<any> {
    return this.post('dashboards', data);
  }

  async getDashboardWidgets(dashboardId: string): Promise<any[]> {
    return this.fetch<any>(`dashboards/${dashboardId}/widgets`);
  }

  async addWidget(dashboardId: string, widgetData: any): Promise<any> {
    return this.post(`dashboards/${dashboardId}/widgets`, widgetData);
  }

  async updateWidget(id: string, data: any): Promise<any> {
    return this.put('dashboards/widgets', id, data);
  }

  async deleteWidget(widgetId: string): Promise<void> {
    await this.delete('dashboards/widgets', widgetId);
  }

  async provisionCompany(data: any): Promise<any> {
    if (this.useMock) {
      console.log('Mock: Provisioning company', data);
      return { success: true };
    }

    console.log('[ProvisionCompany] Starting company provisioning...', { data });

    try {
      const headers = await this.getHeaders({ 'Content-Type': 'application/json' });
      console.log('[ProvisionCompany] Headers prepared:', {
        hasAuth: !!headers.Authorization,
        authPreview: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 30)}...` : 'missing'
      });

      const res = await fetch(`${API_URL}/companies`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      console.log(`[ProvisionCompany] Response: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[ProvisionCompany] API Error Response:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText
        });
        throw new Error(`Company provisioning failed: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();
      console.log('[ProvisionCompany] Success:', result);
      return result;
    } catch (error: any) {
      console.error('[ProvisionCompany] Network or Fetch Error:', {
        message: error.message,
        apiUrl: API_URL,
        endpoint: '/companies'
      });
      throw error;
    }
  }

  // --- Company Management ---
  async getAllCompanies(): Promise<any[]> {
    if (this.useMock) return [];
    return this.fetch('companies/all');
  }

  async getCompanyStats(): Promise<any> {
    const data = await this.getSingle<any>('companies/stats');
    return data || {};
  }

  // --- Tenant Analytics & Security ---
  async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    const data = await this.getSingle<TenantUsage>(`tenants/${tenantId}/usage`);
    if (!data) throw new Error("Failed to fetch usage");
    return data;
  }

  async getAuditLogs(tenantId: string): Promise<TenantAuditLog[]> {
    return this.fetch<TenantAuditLog>(`audit_logs?tenantId=${tenantId}`);
  }

  // --- Multi-Tenant Intelligence & Roles ---
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    const data = await this.getSingle<TenantAnalytics>(`tenants/${tenantId}/analytics`);
    if (!data) throw new Error("Failed to fetch analytics");
    return data;
  }

  async checkTenantLimits(tenantId: string, resourceType: string): Promise<any> {
    const data = await this.getSingle<any>(`tenants/${tenantId}/limits/${resourceType}`);
    if (!data) throw new Error("Failed to check limits");
    return data;
  }

  async getPlatformAnalytics(): Promise<any> {
    return await this.getSingle<any>('platform/analytics');
  }

  async getAdvancedMetrics(): Promise<any> {
    return await this.getSingle<any>('platform/metrics');
  }
  // --- Global Audit Logs (SuperAdmin) ---
  async getGlobalAuditLogs(params: {
    limit?: number;
    offset?: number;
    companyId?: string;
    action?: string;
    userId?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any[]> {
    const p = new URLSearchParams();
    if (params.companyId) p.append('companyId', params.companyId);
    if (params.action && params.action !== 'ALL') p.append('action', params.action);
    if (params.userId) p.append('userId', params.userId);
    if (params.resource) p.append('resource', params.resource);
    if (params.startDate) p.append('startDate', params.startDate);
    if (params.endDate) p.append('endDate', params.endDate);
    if (params.limit) p.append('limit', params.limit.toString());
    if (params.offset) p.append('offset', params.offset.toString());

    return await this.fetch<any>(`platform/audit-logs?${p.toString()}`);
  }

  // --- Platform Notifications (Phase 11) ---
  async getPlatformEvents(limit: number = 20): Promise<any[]> {
    return this.fetch(`notifications/events?limit=${limit}`);
  }

  async markPlatformEventRead(id: string): Promise<void> {
    await this.put('notifications', `${encodeURIComponent(id)}/read`, {});
  }

  async markAllPlatformEventsRead(): Promise<void> {
    await this.post('notifications/mark-all-read', {});
  }

  async getUserRoles(userId: string, companyId: string): Promise<any[]> {
    return await this.fetch<any>(`user-roles/${encodeURIComponent(userId)}/${encodeURIComponent(companyId)}`);
  }



  async getUserPermissions(): Promise<string[]> {
    const data = await this.getSingle<any>('user/permissions');
    return Array.isArray(data) ? data : [];
  }

  async getContext(): Promise<any> {
    return await this.getSingle<any>('user/me');
  }

  // --- Company Modules ---
  async getCompanyModules(): Promise<{ enabledModules: string[]; moduleDetails?: any[] }> {
    const data = await this.getSingle<{ enabledModules: string[]; moduleDetails?: any[] }>('modules/features/my-company');
    return data || { enabledModules: [] };
  }

  // --- Platform API (Super Admin) ---
  async getPlatformStats(): Promise<any> {
    const data = await this.getSingle<any>('platform/stats');
    return data || { totalCompanies: 0, totalUsers: 0, totalProjects: 0, monthlyRevenue: 0, systemStatus: 'unknown' };
  }

  async getSystemHealth(): Promise<any> {
    return await this.getSingle<any>('platform/health');
  }

  async getPlatformConfig(): Promise<any> {
    return await this.getSingle<any>('platform/config');
  }

  async updatePlatformConfig(config: any): Promise<void> {
    await this.post('platform/config', config);
  }

  async getSystemPerformanceHistory(): Promise<any[]> {
    return await this.fetch<any>('platform/performance/history');
  }

  async executeSql(query: string): Promise<any> {
    const res = await fetch(`${API_URL}/platform/sql`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "SQL execution failed");
    }
    return await res.json();
  }

  async sendTargetedBroadcast(filter: any, message: string): Promise<void> {
    await this.post('platform/broadcast/targeted', { filter, message });
  }

  async restartServices(service: string = 'all'): Promise<void> {
    await this.post('platform/restart', { service });
  }

  async flushCache(): Promise<void> {
    await this.post('platform/cache/flush', {});
  }

  async getPlatformAlerts(): Promise<any[]> {
    return await this.fetch<any>('platform/alerts');
  }

  async getSecurityStats(): Promise<any> {
    const data = await this.getSingle<any>('platform/security/stats');
    return data || { securityScore: 0, activeSessions: 0, failedLogins24h: 0 };
  }

  async scheduleMaintenance(startTime: string, duration: number): Promise<void> {
    await this.post('platform/maintenance/schedule', { startTime, duration });
  }




  async getAllPlatformUsers(companyId?: string, filters: { role?: string; status?: string; search?: string } = {}): Promise<any[]> {
    const p = new URLSearchParams();
    if (companyId) p.append('tenantId', companyId);
    if (filters.role && filters.role !== 'all') p.append('role', filters.role);
    if (filters.status && filters.status !== 'all') p.append('status', filters.status);
    if (filters.search) p.append('search', filters.search);

    return await this.fetch<any>(`platform/users?${p.toString()}`);
  }

  async suspendCompany(id: string, reason: string): Promise<void> {
    await this.post(`companies/${id}/suspend`, { reason });
  }

  async activateCompany(id: string): Promise<void> {
    await this.post(`companies/${id}/activate`, {});
  }

  async updateCompanyLimits(id: string, limits: any): Promise<void> {
    await this.put('companies', `${id}/limits`, limits);
  }

  async updateCompanyFeatures(id: string, features: any): Promise<void> {
    await this.put('companies', `${id}/features`, { features });
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await this.put('platform/users', `${id}/status`, { status });
  }

  async updatePlatformUserRole(id: string, role: string, companyId?: string): Promise<void> {
    await this.put('users', `${id}/role`, { role, companyId });
  }

  async resetUserPassword(id: string): Promise<void> {
    await this.post(`platform/users/${id}/reset-password`, {});
  }

  // --- System Settings (Admin) ---
  async getSystemSettings(): Promise<any> {
    return await this.getSingle<any>('system-settings') || {};
  }

  // --- Analytics ---
  async getKPIs(): Promise<any> {
    return await this.getSingle<any>('analytics/kpis');
  }

  async getCustomReport(params: any): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return await this.getSingle<any>(`analytics/custom-report?${query}`);
  }

  async getProjectProgress(): Promise<any[]> {
    const data = await this.getSingle<any>('analytics/project-progress');
    return (data as any)?.data || [];
  }

  async getCostVarianceTrend(): Promise<any[]> {
    const data = await this.getSingle<any>('analytics/cost-variance');
    return (data as any)?.data || [];
  }

  async getResourceUtilization(): Promise<any[]> {
    const data = await this.getSingle<any>('analytics/resource-utilization');
    return (data as any)?.data || [];
  }

  async getSafetyMetrics(): Promise<any[]> {
    const data = await this.getSingle<any>('analytics/safety-metrics');
    return (data as any)?.data || [];
  }

  async getProjectHealth(projectId: string): Promise<any> {
    const data = await this.getSingle<any>(`analytics/project-health/${projectId}`);
    return (data as any)?.data || { status: 'Unknown', score: 0 };
  }

  async updateSystemSettings(settings: any): Promise<void> {
    try {
      // Send full config object to platform controller logic
      await this.post('system-settings', settings);
    } catch (e) {
      console.warn("API update failed", e);
    }
  }

  async broadcastMessage(message: string, urgent: boolean = false): Promise<void> {
    await this.post('system-settings/broadcast', { message, urgent });
  }

  // --- User Management ---
  async createUser(userData: { name: string; email: string; role: string; password?: string }, companyId: string): Promise<any> {
    const res = await fetch(`${API_URL}/platform/users`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...userData, companyId })
    });
    if (!res.ok) throw new Error('Failed to create user');
    return await res.json();
  }

  async updateUserRole(userId: string, role: string): Promise<any> {
    const res = await fetch(`${API_URL}/platform/users/${userId}/role`, {
      method: 'PUT',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error("Failed to update user role");
    return await res.json();
  }

  async deleteUser(userId: string): Promise<void> {
    await fetch(`${API_URL}/platform/users/${userId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
  }

  async inviteCompanyAdmin(companyId: string, email: string, name: string): Promise<void> {
    if (this.useMock) {
      console.log('Mock: Inviting company admin', { companyId, email, name });
      return;
    }
    await this.post(`companies/${companyId}/admins`, { email, name, role: 'COMPANY_ADMIN' });
  }

  async getCompanyDetails(id: string): Promise<any> {
    const res = await fetch(`${API_URL}/companies/${id}/details`, { headers: await this.getHeaders() });
    if (!res.ok) return null;
    return await res.json();
  }


  async impersonateUser(userId: string, reason?: string): Promise<{ user: any; token: string }> {
    const res = await this.post('impersonation/start', { userId, reason });
    if (!res) throw new Error("Failed to impersonate user");
    return res as any;
  }

  async stopImpersonation(): Promise<void> {
    const res = await fetch(`${API_URL}/impersonation/stop`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error("Failed to stop impersonation");
  }

  async getActiveImpersonationSessions(): Promise<any[]> {
    if (this.useMock) return [];
    return this.fetch('impersonation/active-sessions');
  }



  // --- Platform Automation ---

  // --- Platform Automation ---
  async getAutomationJobs(): Promise<any[]> {
    return this.fetch('platform/automation/jobs');
  }

  async createAutomationJob(jobData: { name: string; type: string; schedule: string; config: any }): Promise<any> {
    return this.post('platform/automation/jobs', jobData);
  }

  async updateAutomationJob(jobId: string, updates: any): Promise<void> {
    const res = await fetch(`${API_URL}/platform/automation/jobs/${jobId}`, {
      method: 'PUT',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update job');
  }

  async executeAutomationJob(jobId: string): Promise<any> {
    return this.post(`platform/automation/jobs/${jobId}/execute`, {});
  }

  async deleteAutomationJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_URL}/platform/automation/jobs/${jobId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete job');
  }

  // --- Company Management ---
  async bulkSuspendCompanies(companyIds: string[], reason: string): Promise<any> {
    return this.post('platform/companies/bulk-suspend', { companyIds, reason });
  }

  async bulkActivateCompanies(companyIds: string[]): Promise<any> {
    return this.post('platform/companies/bulk-activate', { companyIds });
  }

  async getCompanyUsage(companyId: string): Promise<any> {
    return this.fetch(`platform/companies/${companyId}/usage`);
  }

  async exportCompanyData(companyId: string): Promise<any> {
    return this.fetch(`platform/companies/${companyId}/export-data`);
  }

  // --- Database Management ---
  async getDatabaseHealth(): Promise<any> {
    return this.fetch('platform/database/health');
  }

  async createDatabaseBackup(): Promise<any> {
    return this.post('platform/database/backup', {});
  }

  async listDatabaseBackups(): Promise<any> {
    return this.fetch('platform/database/backups');
  }

  async cleanupDatabase(type: string, daysToKeep: number): Promise<any> {
    return this.post('platform/database/cleanup', { type, daysToKeep });
  }

  async getLiveMetrics(): Promise<any> {
    return this.fetch('platform/database/metrics/live');
  }

  // --- API Key Management (SuperAdmin) ---
  async getAPIKeys(): Promise<any[]> {
    return await this.fetch<any>('api-management/keys');
  }

  async createAPIKey(data: { name: string; permissions: string[]; expiresInDays?: number }): Promise<any> {
    const res = await fetch(`${API_URL}/api-management/keys`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create API key");
    return await res.json();
  }

  async deleteAPIKey(id: string): Promise<void> {
    await this.delete('api-management/keys', id);
  }

  // --- Webhook Management (SuperAdmin) ---
  async getWebhooks(): Promise<any[]> {
    return await this.fetch<any>('api-management/webhooks');
  }

  async createWebhook(data: { name: string; url: string; events: string[] }): Promise<any> {
    return await this.post('api-management/webhooks', data);
  }

  async updateWebhook(id: string, data: { status?: string; events?: string[] }): Promise<void> {
    await this.put('api-management/webhooks', id, data);
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.delete('api-management/webhooks', id);
  }

  async testWebhook(id: string): Promise<any> {
    const res = await fetch(`${API_URL}/api-management/webhooks/${id}/test`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return await res.json();
  }

  // Global Search across tenants, users, projects
  async globalSearch(query: string, global: boolean = false): Promise<any> {
    if (this.useMock) {
      // Mock result
      return {
        tenants: [{ id: 'c1', name: 'Acme Corp', type: 'tenant' }],
        users: [{ id: 'u1', name: 'John Doe', type: 'user', companyName: 'Acme Corp' }],
        projects: [{ id: 'p1', name: 'St Georges Hospital', type: 'project', companyName: 'Acme Corp' }]
      };
    }
    const params = new URLSearchParams({ q: query });
    if (global) params.append('global', 'true');
    return this.fetch<any>(`platform/search?${params.toString()}`);
  }

  // Maintenance Window
  async toggleMaintenance(enabled: boolean, message?: string): Promise<any> {
    return this.post('platform/maintenance', { enabled, message });
  }
  async broadcastSystemMessage(message: string, level: string = 'info'): Promise<any> {
    return this.post('platform/broadcast', { message, level });
  }

  // --- RBAC ---
  async getRoles(): Promise<any[]> {
    return await this.fetch<any>('roles');
  }
  async getPermissions(): Promise<any[]> {
    return await this.fetch<any>('permissions');
  }
  async getRolePermissions(roleId: string): Promise<string[]> {
    return await this.fetch<string>(`roles/${roleId}/permissions`);
  }
  async createRole(role: { name: string; description: string; permissions: any[] }): Promise<any> {
    return this.post('roles', role);
  }

  async updateRolePermissions(roleId: string, permissions: any[]): Promise<void> {
    await this.put('roles', `${roleId}/permissions`, { permissions });
  }

  async getAccessLogs(): Promise<any[]> {
    return await this.fetch<any>('platform/audit-logs?action=LOGIN');
  }

  // --- Billing & Subscriptions ---
  async getSubscriptions(): Promise<any[]> {
    if (this.useMock) {
      // Mock subscriptions based on existing tenants
      const tenants = await this.getCompanies();
      return tenants.map(t => ({
        id: t.subscription?.id || `sub-${t.id}`,
        companyId: t.id,
        companyName: t.name,
        plan: t.plan,
        status: t.subscription?.status || 'active',
        mrr: t.mrr || 0,
        nextBillingDate: t.subscription?.currentPeriodEnd || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
    return this.fetch<any[]>('platform/subscriptions');
  }

  async getPlatformInvoices(companyId?: string): Promise<any[]> {
    if (this.useMock) {
      // Mock billing history
      return [
        { id: 'inv-1', companyId: 'c1', companyName: 'Acme Corp', amount: 999, status: 'Paid', date: '2025-12-01', invoiceNumber: 'INV-2025-001' },
        { id: 'inv-2', companyId: 'c2', companyName: 'Global Build', amount: 299, status: 'Paid', date: '2025-12-05', invoiceNumber: 'INV-2025-002' },
        { id: 'inv-3', companyId: 'c3', companyName: 'Urban Dev', amount: 99, status: 'Pending', date: '2025-12-20', invoiceNumber: 'INV-2025-003' },
      ].filter(inv => !companyId || inv.companyId === companyId);
    }
    const query = companyId ? `?companyId=${companyId}` : '';
    // If we're getting all invoices (no companyId), we hit the platform endpoint.
    // Otherwise we might hit a specific company endpoint.
    const endpoint = companyId ? `platform/invoices${query}` : 'platform/invoices';
    return this.fetch<any[]>(endpoint);
  }

  async updateSubscription(id: string, data: any): Promise<void> {
    if (this.useMock) return;
    await this.put('platform/subscriptions', id, data);
  }

  async bulkInviteUsers(invitations: any[], companyId: string, role: string): Promise<void> {
    if (this.useMock) {
      console.log('Bulk Inviting Users:', { invitations, companyId, role });
      return;
    }
    // Correct endpoint based on userManagementRoutes
    await this.post(`users/bulk-invite`, { invitations, companyId, role });
  }

  async updateUser(userId: string, data: any): Promise<void> {
    if (this.useMock) {
      console.log('User updated:', { userId, data });
      return;
    }
    await this.put('platform/users', userId, data);
  }


  // --- Support & System Config (Phase 9) ---
  async getTickets(companyId?: string): Promise<any[]> {
    const endpoint = companyId ? `platform/support/my-tickets?companyId=${companyId}` : 'platform/support/admin/tickets';
    return this.fetch(endpoint);
  }

  async getTicketMessages(ticketId: string): Promise<any[]> {
    return this.fetch(`platform/support/tickets/${ticketId}/messages`);
  }

  async createTicket(data: { subject: string; message: string; priority?: string; category?: string }): Promise<any> {
    return this.post('platform/support/tickets', data);
  }

  async replyToTicket(ticketId: string, message: string, isAdmin: boolean = false): Promise<any> {
    return this.post(`platform/support/tickets/${ticketId}/reply`, { message, isAdmin });
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    await this.put(`platform/support/admin/tickets`, ticketId + '/status', { status });
  }



  async addAccessLog(log: any): Promise<void> {
    // implementation handled by backend for critical actions, but client can log too
    // For now, no-op or specific endpoint
  }


  // --- Financials ---

  // --- Cost Codes ---
  async getCostCodes(): Promise<CostCode[]> {
    return this.fetch<CostCode>('financials/cost-codes');
  }
  async addCostCode(code: CostCode): Promise<CostCode> {
    return this.post<CostCode>('financials/cost-codes', code);
  }
  async updateCostCode(id: string, updates: Partial<CostCode>): Promise<void> {
    await this.put('financials/cost-codes', id, updates);
  }

  // --- Invoices ---
  // --- Invoices ---
  async getInvoices(): Promise<Invoice[]> {
    return this.fetch<Invoice>('financials/invoices');
  }
  async addInvoice(invoice: Invoice): Promise<Invoice> {
    return this.post<Invoice>('financials/invoices', invoice);
  }
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
    await this.put('financials/invoices', id, updates);
  }
  async deleteInvoice(id: string): Promise<void> {
    await this.delete('financials/invoices', id);
  }

  // --- Expenses (mapped to Financials API) ---
  // Note: expenseClaims in context seem to map here
  async getExpenseClaims(): Promise<ExpenseClaim[]> {
    return this.fetch<ExpenseClaim>('financials/expenses');
  }
  async addExpenseClaim(claim: ExpenseClaim): Promise<ExpenseClaim> {
    return this.post<ExpenseClaim>('financials/expenses', claim);
  }
  async updateExpenseClaim(id: string, updates: Partial<ExpenseClaim>): Promise<void> {
    await this.put('financials/expenses', id, updates);
  }
  // --- Client Portal ---
  async generateShareLink(projectId: string, expiresIn: number, password?: string): Promise<any> {
    const data = await this.post<any>(`client-portal/${projectId}/share`, { expiresIn, password });
    return (data as any)?.data;
  }

  async getShareLinks(projectId: string): Promise<any[]> {
    const data = await this.getSingle<any>(`client-portal/${projectId}/shares`);
    return (data as any)?.data || [];
  }

  async revokeShareLink(linkId: string): Promise<void> {
    await this.delete('client-portal/shares', linkId);
  }

  async validateShareToken(token: string, password?: string): Promise<void> {
    await this.post(`client-portal/shared/${token}/validate`, { password });
  }

  async getSharedProject(token: string, password?: string): Promise<any> {
    const data = await this.getSingle<any>(`client-portal/shared/${token}`);
    return (data as any)?.data;
  }

  async getSharedDocuments(token: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/client-portal/shared/${token}/documents`);
    if (!res.ok) throw new Error("Failed to fetch shared documents");
    const data = await res.json();
    return data.data || [];
  }

  async getSharedPhotos(token: string): Promise<any[]> {
    const data = await this.getSingle<any>(`client-portal/shared/${token}/photos`);
    return (data as any)?.data || [];
  }

  // --- Activities ---
  async getActivities(params: { limit?: number; projectId?: string; entityType?: string } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.entityType) query.append('entityType', params.entityType);

    return await this.fetch<any>(`activity?${query.toString()}`);
  }

  // --- Comments ---
  async getComments(entityType: string, entityId: string): Promise<any[]> {
    const query = new URLSearchParams({ entityType, entityId });
    return await this.fetch<any>(`comments?${query.toString()}`);
  }

  async addComment(data: { entityType: string; entityId: string; content: string; mentions?: string[]; parentId?: string }) {
    await this.post('comments', data);
  }

  async updateComment(id: string, content: string) {
    await this.put('comments', id, { content });
  }

  async deleteComment(id: string) {
    await this.delete('comments', id);
  }

  // --- Notifications ---
  async getNotifications(): Promise<any[]> {
    return await this.fetch<any>('notifications');
  }

  async markNoteAsRead(id: string): Promise<void> {
    await this.put('notifications', `${id}/read`, {});
  }

  async markAllNotesAsRead(): Promise<void> {
    await this.post('notifications/mark-all-read', {});
  }

  // --- Safety Checklists (Compliance Audits) ---
  async getSafetyChecklists(): Promise<any[]> {
    try {
      return await this.fetch<any>('compliance/safety-checklists');
    } catch (e) {
      console.error('[DB Service] Failed to fetch safety checklists:', e);
      return [];
    }
  }

  async createSafetyChecklist(data: { name: string; projectId?: string; items: any[] }): Promise<any> {
    return await this.post<any>('compliance/safety-checklists', data);
  }

  async updateSafetyChecklistItem(itemId: string, data: { status?: string; notes?: string }): Promise<void> {
    await fetch(`${API_URL}/compliance/safety-checklist-items/${itemId}`, {
      method: 'PATCH',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
  }

  async submitSafetyChecklist(checklistId: string): Promise<any> {
    return await this.post<any>(`compliance/safety-checklists/${checklistId}/submit`, {});
  }

  // --- ML Center ---
  async getMLModels(): Promise<MLModel[]> {
    const data = await this.getSingle<any>('ml-models');
    return (data as any)?.data || [];
  }

  async getMLPredictions(modelId?: string): Promise<MLPrediction[]> {
    const query = modelId ? `?modelId=${modelId}` : '';
    const data = await this.getSingle<any>(`ml-predictions${query}`);
    return (data as any)?.data || [];
  }

  async trainMLModel(id: string): Promise<MLModel> {
    const data = await this.post<any>(`ml-models/${id}/train`, {});
    return (data as any)?.data;
  }

  async savePrediction(companyId: string, prediction: Omit<MLPrediction, 'id' | 'companyId'>): Promise<MLPrediction> {
    const res = await fetch(`${API_URL}/ml-predictions`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...prediction, companyId })
    });
    if (!res.ok) throw new Error("Failed to save prediction");
    const data = await res.json();
    return data.data;
  }

  async requestDataExport(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_URL}/company/export`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error("Failed to request export");
    return res.json();
  }

  async updateMyCompany(updates: Partial<Tenant>): Promise<void> {
    const res = await fetch(`${API_URL}/companies/me`, {
      method: 'PUT',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error("Failed to update company");
  }

  // --- Marketplace ---
  async getMarketplaceModules(): Promise<any[]> {
    const res = await fetch(`${API_URL}/modules/marketplace`, { headers: await this.getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  }

  async getMarketplaceCategories(): Promise<any[]> {
    const res = await fetch(`${API_URL}/modules/marketplace/categories`, { headers: await this.getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  }

  async getInstalledModules(companyId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/modules/marketplace/installed/${companyId}`, { headers: await this.getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  }

  async installModule(moduleId: string, companyId: string): Promise<any> {
    const res = await fetch(`${API_URL}/modules/marketplace/install/${moduleId}`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ companyId })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Installation failed' }));
      throw new Error(error.message || 'Installation failed');
    }
    return await res.json();
  }

  async uninstallModule(moduleId: string, companyId: string): Promise<void> {
    const res = await fetch(`${API_URL}/modules/marketplace/uninstall/${moduleId}`, {
      method: 'POST',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ companyId })
    });
    if (!res.ok) throw new Error('Uninstallation failed');
  }

  async configureModule(moduleId: string, companyId: string, config: any): Promise<void> {
    const res = await fetch(`${API_URL}/modules/marketplace/configure/${moduleId}`, {
      method: 'PUT',
      headers: await this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ companyId, config })
    });
    if (!res.ok) throw new Error('Configuration save failed');
  }

  // ======================================
  // INVITATION & TEAM MANAGEMENT
  // ======================================

  /**
   * Invite a user to join the company
   */
  async inviteUser(companyId: string, email: string, role: string) {
    return await this.post('invitations', { companyId, email, role });
  }

  /**
   * Get company invitations
   */
  async getCompanyInvitations(companyId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    const data = await this.getSingle<any>(`invitations/company/${companyId}${query}`);
    return (data as any)?.data || [];
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string) {
    return await this.post(`invitations/${invitationId}/resend`, {});
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string) {
    return await this.delete('invitations', invitationId);
  }

  /**
   * Get company members
   */
  async getCompanyMembers(companyId: string) {
    const data = await this.getSingle<any>(`companies/${companyId}/members`);
    return (data as any)?.data || [];
  }

  /**
   * Update member role
   */
  async updateMemberRole(memberId: string, role: string) {
    return await this.put('memberships', `${memberId}/role`, { role });
  }

  /**
   * Remove member from company
   */
  async removeMember(memberId: string) {
    return await this.delete('memberships', memberId);
  }

  /**
   * Sync external project (Integration)
   */
  async syncProject(data: any): Promise<void> {
    // Placeholder / Implementation for external sync
    await this.post('integrations/projects/sync', data);
  }

  /**
   * Register a webhook
   */
  async registerWebhook(config: any): Promise<any> {
    return await this.post('webhooks', config);
  }

  /**
   * Trigger a webhook
   */
  async triggerWebhook(id: string, payload: any): Promise<void> {
    await this.post(`webhooks/${id}/trigger`, payload);
  }
}

export const db = new DatabaseService();
