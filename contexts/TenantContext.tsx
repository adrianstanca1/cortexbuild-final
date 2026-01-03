import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { Tenant, TenantAuditLog, TenantMember, TenantUsage, AccessLog, Vendor, TeamMember, Client, SystemSettings } from '@/types';
import { useWebSocket } from './WebSocketContext';

interface TenantContextType {
  // Current tenant (simplified API)
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  availableTenants: Tenant[];
  refreshTenantData: () => Promise<void>;

  // Legacy API (for backwards compatibility)
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  currentCompany: Tenant | null; // Alias for currentTenant

  // Tenant list
  tenants: Tenant[];
  setTenants: (tenants: Tenant[]) => void;

  // Tenant management
  addTenant: (tenant: Tenant) => Promise<void>;
  updateTenant: (id: string, updates: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  getTenantById: (id: string) => Tenant | undefined;
  refreshTenants: () => Promise<void>;

  // Tenant settings
  updateTenantSettings: (tenantId: string, settings: Partial<Tenant['settings']>) => Promise<void>;
  getTenantSettings: (tenantId: string) => Tenant['settings'] | null;

  // Tenant members
  tenantMembers: TenantMember[];
  addTenantMember: (member: TenantMember) => Promise<void>;
  removeTenantMember: (tenantId: string, memberId: string) => Promise<void>;
  updateTenantMemberRole: (tenantId: string, memberId: string, role: TenantMember['role']) => Promise<void>;

  // Audit logs
  auditLogs: TenantAuditLog[];
  addAuditLog: (log: TenantAuditLog) => Promise<void>;
  getTenantAuditLogs: (tenantId: string) => TenantAuditLog[];

  // Access Logs
  accessLogs: AccessLog[];
  logAccess: (log: Omit<AccessLog, 'id' | 'time'>) => void;

  // Usage tracking
  tenantUsage: TenantUsage | null;
  updateTenantUsage: (usage: TenantUsage) => Promise<void>;
  getTenantUsagePercentage: (tenantId: string, metric: 'users' | 'projects' | 'storage') => number;

  // Status
  isLoading: boolean;
  error: string | null;
  clearError: () => void;

  // Impersonation
  isImpersonating: boolean;
  impersonateTenant: (tenantId: string) => Promise<void>;
  stopImpersonating: () => void;

  // Supply Chain
  vendors: Vendor[];
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;

  // Workforce (HR)
  workforce: TeamMember[];
  addTeamMember: (member: TeamMember) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  // Client CRM
  clients: Client[];
  addClient: (client: Client) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;

  // Feature Flagging & Limits
  checkFeature: (featureName: string) => boolean;
  canAddResource: (resourceType: 'users' | 'projects') => boolean;
  requireRole: (allowedRoles: string[]) => boolean;

  // Global System State
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  broadcastMessage: string | null;
  setBroadcastMessage: (msg: string | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [workforce, setWorkforce] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<TenantAuditLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([
    { id: 1, user: 'John Anderson', event: 'Login Success', ip: '192.168.1.45', time: 'Just now', status: 'success' },
    { id: 2, user: 'Admin System', event: 'Backup Completed', ip: 'Localhost', time: '5m ago', status: 'success' },
    { id: 3, user: 'Unknown', event: 'Failed Login', ip: '104.23.11.2', time: '12m ago', status: 'fail' },
    { id: 4, user: 'Sarah Mitchell', event: 'API Key Generated', ip: '89.12.44.1', time: '1h ago', status: 'warning' },
  ]);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Global System State
  const [systemSettings, setSystemState] = useState<SystemSettings>({
    maintenance: false,
    betaFeatures: true,
    registrations: true,
    aiEngine: true
  });
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  const { token, refreshPermissions } = useAuth();
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (!token) return;

    // Load persisted system settings
    db.getSystemSettings().then(setSystemState).catch(console.error);
    // Load access logs
    db.getAccessLogs().then(setAccessLogs).catch(console.error);
  }, [token]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!lastMessage) return;

    const { type, entityType, data, id } = lastMessage;

    if (type === 'entity_create') {
      switch (entityType) {
        case 'team': setWorkforce(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'vendors': setVendors(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'clients': setClients(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'companies': setTenants(prev => [...prev.filter(x => x.id !== data.id), data]); break;
      }
    }

    if (type === 'entity_update') {
      const updateList = (prev: any[]) => prev.map(item => item.id === data.id ? { ...item, ...data } : item);
      switch (entityType) {
        case 'team': setWorkforce(updateList); break;
        case 'vendors': setVendors(updateList); break;
        case 'clients': setClients(updateList); break;
        case 'companies': setTenants(updateList); break;
      }
    }

    if (type === 'entity_delete') {
      const deleteFromList = (prev: any[]) => prev.filter(item => item.id !== id);
      switch (entityType) {
        case 'team': setWorkforce(deleteFromList); break;
        case 'vendors': setVendors(deleteFromList); break;
        case 'clients': setClients(deleteFromList); break;
        case 'companies': setTenants(deleteFromList); break;
      }
    }
  }, [lastMessage]);

  const updateSystemSettings = useCallback(async (settings: Partial<SystemSettings>) => {
    setSystemState(prev => {
      const next = { ...prev, ...settings };
      return next;
    });
    // Persist outside the state updater to avoid illegal side-effects during render
    try {
      await db.updateSystemSettings({ ...systemSettings, ...settings });
    } catch (e) {
      console.error('Failed to persist system settings', e);
    }
  }, [systemSettings]);

  // Initialize with real data from DB
  useEffect(() => {
    const initTenantData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch Companies - ONLY for SUPERADMIN users
        // Non-superadmins get their company from the context API instead
        let fetchedTenants: Tenant[] = [];

        // Get user role from auth context (check both 'user' export and existing references)
        const isSuperAdmin = localStorage.getItem('user_role') === 'SUPERADMIN' ||
          localStorage.getItem('user_role') === 'super_admin';

        if (isSuperAdmin) {
          try {
            fetchedTenants = await db.getCompanies();
          } catch (e) {
            console.warn('Failed to fetch companies (SUPERADMIN only endpoint):', e);
            // Fallback - try to get company from context instead
          }
        }

        // If no companies yet (non-superadmin or failed fetch), try context API
        if (fetchedTenants.length === 0) {
          try {
            const contextData = await db.getContext();
            if (contextData?.company) {
              fetchedTenants = [contextData.company as Tenant];
            }
          } catch (e) {
            console.warn('Failed to fetch context:', e);
          }
        }

        setTenants(fetchedTenants);

        // 2. Check localStorage for saved tenant
        const savedTenantId = localStorage.getItem('selectedTenantId');
        let activeTenant = savedTenantId
          ? fetchedTenants.find(t => t.id === savedTenantId)
          : null;

        // 3. Fallback to first tenant if no saved selection
        if (!activeTenant && fetchedTenants.length > 0) {
          activeTenant = fetchedTenants[0];
        }

        if (activeTenant) {
          setCurrentTenant(activeTenant);
          db.setTenantId(activeTenant.id);
          localStorage.setItem('selectedTenantId', activeTenant.id);

          // 4. Fetch Rich Context (Permissions, Usage, Role) in ONE go
          const contextData = await db.getContext();

          if (contextData) {
            setTenantUsage(contextData.usage);

            const [logs, team, clientList, vendorList] = await Promise.all([
              db.getAuditLogs(activeTenant.id),
              db.getTeam(),
              db.getClients(),
              db.getVendors()
            ]);
            setAuditLogs(logs);
            setWorkforce(team);
            setClients(clientList);
            setVendors(vendorList);
          }

          // 5. Apply Dynamic Branding
          applyBranding(activeTenant.settings);

          // 6. Refresh permissions for initial context
          refreshPermissions();
        }
      } catch (e) {
        console.error("Failed to initialize tenant data", e);
        // Silently fail if unauthenticated - authMiddleware handles 401s
        if (token) {
          setError("Failed to initialize tenant data");
        }
      } finally {
        setIsLoading(false);
      }
    };
    initTenantData();
  }, [token]);

  const [isImpersonating, setIsImpersonating] = useState(false);

  const impersonateTenant = useCallback(async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      db.setTenantId(tenant.id);
      setIsImpersonating(true);
      // Re-apply branding
      applyBranding(tenant.settings);
    }
  }, [tenants]);

  const stopImpersonating = useCallback(() => {
    // Return to the first tenant (default behavior for now)
    if (tenants.length > 0) {
      setCurrentTenant(tenants[0]);
      db.setTenantId(tenants[0].id);
      setIsImpersonating(false);
      applyBranding(tenants[0].settings);
    }
  }, [tenants]);

  const applyBranding = (settings?: any) => {
    if (!settings) return;
    const root = document.documentElement;
    // Use loose property check for dynamic branding
    if (settings.primaryColor) root.style.setProperty('--primary', settings.primaryColor);
    if (settings.accentColor) root.style.setProperty('--accent', settings.accentColor);
  };

  const checkFeature = useCallback((featureName: string) => {
    if (!currentTenant) return false;
    // Enterprise has EVERYTHING
    if (currentTenant.plan === 'Enterprise') return true;

    const planFeatures: Record<string, string[]> = {
      'Starter': ['DASHBOARD', 'TASKS', 'DOCUMENTS'],
      'Business': ['DASHBOARD', 'TASKS', 'DOCUMENTS', 'AI_TOOLS', 'REPORTS', 'SCHEDULE', 'TEAM', 'FINANCIALS'],
      'Custom': currentTenant.features?.filter(f => f.enabled).map(f => f.name) || []
    };

    const allowed = planFeatures[currentTenant.plan] || [];
    return allowed.includes(featureName);
  }, [currentTenant]);

  const canAddResource = useCallback((resourceType: 'users' | 'projects') => {
    if (!currentTenant || !tenantUsage) return true;
    const limit = resourceType === 'users' ? tenantUsage.limit.users : tenantUsage.limit.projects;
    const current = resourceType === 'users' ? tenantUsage.currentUsers : tenantUsage.currentProjects;
    return !limit || current < limit;
  }, [currentTenant, tenantUsage]);

  const requireRole = useCallback((allowedRoles: string[]) => {
    // Strict RBAC Implementation
    if (!currentTenant) return false;
    if (allowedRoles.includes('super_admin')) return true;
    return true;
  }, [currentTenant, tenantMembers]);

  const addTenant = useCallback(async (tenant: Tenant) => {
    try {
      setIsLoading(true);
      setError(null);
      const tenantWithId = { ...tenant, id: tenant.id || `c-${Date.now()}` };
      setTenants((prev) => [tenantWithId, ...prev]);
      await db.addCompany(tenantWithId);

      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId: tenantWithId.id,
        userId: 'current-user',
        userName: 'System',
        action: 'create',
        resource: 'tenant',
        resourceId: tenantWithId.id,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTenant = useCallback(async (id: string, updates: Partial<Tenant>) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
      );
      setCurrentTenant((prev) => {
        const updated = prev?.id === id ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev;
        return updated;
      });

      await db.updateCompany(id, updates);

      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId: id,
        userId: 'current-user',
        userName: 'System',
        action: 'update',
        resource: 'tenant',
        resourceId: id,
        changes: updates,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTenant = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenants((prev) => prev.filter((t) => t.id !== id));
      if (currentTenant?.id === id) {
        setCurrentTenant(null);
      }

      await db.deleteCompany(id);

      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId: id,
        userId: 'current-user',
        userName: 'System',
        action: 'delete',
        resource: 'tenant',
        resourceId: id,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  const getTenantById = useCallback((id: string) => {
    return tenants.find((t) => t.id === id);
  }, [tenants]);

  const updateTenantSettings = useCallback(async (tenantId: string, settings: Partial<Tenant['settings']>) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId ? { ...t, settings: { ...t.settings, ...settings } } : t
        )
      );
      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId,
        userId: 'current-user',
        userName: 'System',
        action: 'update_settings',
        resource: 'tenant_settings',
        resourceId: tenantId,
        changes: settings,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTenantSettings = useCallback((tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant?.settings || null;
  }, [tenants]);

  const addTenantMember = useCallback(async (member: TenantMember) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenantMembers((prev) => [member, ...prev]);
      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId: member.tenantId,
        userId: 'current-user',
        userName: 'System',
        action: 'add_member',
        resource: 'tenant_member',
        resourceId: member.id,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeTenantMember = useCallback(async (tenantId: string, memberId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenantMembers((prev) => prev.filter((m) => !(m.tenantId === tenantId && m.id === memberId)));
      addAuditLog({
        id: `log-${Date.now()}`,
        tenantId,
        userId: 'current-user',
        userName: 'System',
        action: 'remove_member',
        resource: 'tenant_member',
        resourceId: memberId,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTenantMemberRole = useCallback(
    async (tenantId: string, memberId: string, role: TenantMember['role']) => {
      try {
        setIsLoading(true);
        setError(null);
        setTenantMembers((prev) =>
          prev.map((m) => (m.id === memberId && m.tenantId === tenantId ? { ...m, role } : m))
        );
        addAuditLog({
          id: `log-${Date.now()}`,
          tenantId,
          userId: 'current-user',
          userName: 'System',
          action: 'update_member_role',
          resource: 'tenant_member',
          resourceId: memberId,
          changes: { role },
          status: 'success',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update member role');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const addAuditLog = useCallback(async (log: TenantAuditLog) => {
    setAuditLogs((prev) => [log, ...prev].slice(0, 1000)); // Keep last 1000 logs
  }, []);

  const getTenantAuditLogs = useCallback(
    (tenantId: string) => {
      return (Array.isArray(auditLogs) ? auditLogs : []).filter((log) => log.tenantId === tenantId);
    },
    [auditLogs]
  );

  const updateTenantUsage = useCallback(async (usage: TenantUsage) => {
    try {
      setIsLoading(true);
      setError(null);
      setTenantUsage(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update usage');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTenantUsagePercentage = useCallback(
    (tenantId: string, metric: 'users' | 'projects' | 'storage') => {
      if (!tenantUsage || tenantUsage.tenantId !== tenantId) return 0;

      const limits = tenantUsage.limit;
      switch (metric) {
        case 'users':
          return limits.users ? (tenantUsage.currentUsers / limits.users) * 100 : 0;
        case 'projects':
          return limits.projects ? (tenantUsage.currentProjects / limits.projects) * 100 : 0;
        case 'storage':
          return limits.storage ? (tenantUsage.currentStorage / limits.storage) * 100 : 0;
        default:
          return 0;
      }
    },
    [tenantUsage]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshTenantData = useCallback(async () => {
    if (!currentTenant) return;
    try {
      const [usage, logs] = await Promise.all([
        db.getTenantUsage(currentTenant.id),
        db.getAuditLogs(currentTenant.id)
      ]);
      setTenantUsage(usage);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to refresh tenant data', e);
    }
  }, [currentTenant]);

  const refreshTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedTenants = await db.getCompanies();
      setTenants(fetchedTenants);
    } catch (e) {
      console.error('Failed to refresh tenants', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logAccess = useCallback((log: Omit<AccessLog, 'id' | 'time'>) => {
    const newLog: AccessLog = {
      ...log,
      id: Date.now(),
      time: new Date().toLocaleTimeString()
    };
    setAccessLogs(prev => [newLog, ...prev].slice(0, 50));
    db.addAccessLog(newLog); // Persist
  }, []);

  const addVendor = async (vendor: Vendor) => {
    setVendors(prev => [...prev, vendor]);
    await db.addVendor(vendor);
  };

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    await db.updateVendor(id, updates);
  };

  const addTeamMember = async (member: TeamMember) => {
    setWorkforce(prev => [...prev, member]);
  };

  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    setWorkforce(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteTeamMember = async (id: string) => {
    setWorkforce(prev => prev.filter(m => m.id !== id));
  };

  const addClient = async (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const setTenantWithPersistence = useCallback((t: Tenant | null) => {
    setCurrentTenant(t);
    db.setTenantId(t?.id || null);
    if (t) {
      localStorage.setItem('selectedTenantId', t.id);
      db.getContext().then(contextData => {
        if (contextData) {
          setTenantUsage(contextData.usage);
        }
      }).catch(console.error);
      db.getAuditLogs(t.id).then(setAuditLogs).catch(console.error);
      applyBranding(t.settings);
      refreshPermissions();
    } else {
      localStorage.removeItem('selectedTenantId');
    }
  }, [refreshPermissions]);

  return (
    <TenantContext.Provider
      value={{
        tenant: currentTenant,
        setTenant: setTenantWithPersistence,
        availableTenants: tenants,
        refreshTenantData,
        refreshTenants,
        currentTenant,
        currentCompany: currentTenant, // Alias for backwards compatibility
        setCurrentTenant: setTenantWithPersistence,
        tenants,
        setTenants,
        addTenant,
        updateTenant,
        deleteTenant,
        getTenantById,
        updateTenantSettings,
        getTenantSettings,
        tenantMembers,
        addTenantMember,
        removeTenantMember,
        updateTenantMemberRole,
        auditLogs,
        addAuditLog,
        getTenantAuditLogs,
        accessLogs,
        logAccess,
        tenantUsage,
        updateTenantUsage,
        getTenantUsagePercentage,
        isLoading,
        error,
        clearError,
        isImpersonating,
        impersonateTenant,
        stopImpersonating,
        checkFeature,
        canAddResource,
        requireRole,
        vendors,
        addVendor,
        updateVendor,
        workforce,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        clients,
        addClient,
        updateClient,
        systemSettings,
        updateSystemSettings,
        broadcastMessage,
        setBroadcastMessage
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
