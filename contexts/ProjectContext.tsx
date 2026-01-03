import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Project, Task, TeamMember, ProjectDocument, UserRole, Client, InventoryItem, Zone, RFI, PunchItem, DailyLog, Daywork, SafetyIncident, SafetyHazard, Equipment, Timesheet, Channel, TeamMessage, Transaction, Defect, ProjectRisk, PurchaseOrder, CostCode, Invoice, ExpenseClaim } from '@/types';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { db } from '@/services/db';
import { supabase } from '../services/supabaseClient';
import { useNotifications } from './NotificationContext';
import { useWebSocket } from './WebSocketContext';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  tasks: Task[];
  documents: ProjectDocument[];
  inventory: InventoryItem[];
  rfis: RFI[];
  punchItems: PunchItem[];
  dailyLogs: DailyLog[];
  dayworks: Daywork[];
  safetyIncidents: SafetyIncident[];
  safetyHazards: SafetyHazard[];
  equipment: Equipment[];
  timesheets: Timesheet[];
  channels: Channel[];
  teamMessages: TeamMessage[];
  transactions: Transaction[];
  financials: Transaction[];
  defects: Defect[];
  projectRisks: ProjectRisk[];
  purchaseOrders: PurchaseOrder[];
  costCodes: CostCode[];
  invoices: Invoice[];
  expenseClaims: ExpenseClaim[];
  teamMembers: TeamMember[];
  isLoading: boolean;

  // Project CRUD
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  addZone: (projectId: string, zone: Zone) => void;

  // Task CRUD
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  getCriticalPath: (projectId: string) => Promise<any[]>;
  getPredictiveAnalysis: (projectId: string) => Promise<any>;
  getBulkPredictiveAnalysis: () => Promise<any[]>;
  extractOcrData: (file: File, type?: string) => Promise<any>;
  getAutomations: () => Promise<any[]>;
  createAutomation: (a: any) => Promise<any>;

  // Document CRUD
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;

  // Inventory CRUD
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;

  // New Actions
  addRFI: (rfi: RFI) => Promise<void>;
  updateRFI: (id: string, updates: Partial<RFI>) => Promise<void>;
  addPunchItem: (item: PunchItem) => Promise<void>;
  addDailyLog: (log: DailyLog) => Promise<void>;
  updateDailyLog: (id: string, updates: Partial<DailyLog>) => Promise<void>;
  addDaywork: (dw: Daywork) => Promise<void>;

  // Backend Extensions
  addSafetyIncident: (incident: SafetyIncident) => Promise<void>;
  updateSafetyIncident: (id: string, updates: Partial<SafetyIncident>) => Promise<void>;
  addSafetyHazard: (hazard: SafetyHazard) => Promise<void>;
  addEquipment: (item: Equipment) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  addTimesheet: (sheet: Timesheet) => Promise<void>;
  updateTimesheet: (id: string, updates: Partial<Timesheet>) => Promise<void>;
  // Chat
  addChannel: (channel: Channel) => Promise<void>;
  addTeamMessage: (message: TeamMessage) => Promise<void>;

  // Financials
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;

  // Defects
  addDefect: (defect: Defect) => Promise<void>;
  updateDefect: (id: string, updates: Partial<Defect>) => Promise<void>;
  deleteDefect: (id: string) => Promise<void>;

  // Forecasting
  runHealthForecasting: (projectId: string) => Promise<ProjectRisk | null>;

  // Procurement
  addPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;

  // Financials Meta
  addCostCode: (code: CostCode) => Promise<void>;
  updateCostCode: (id: string, updates: Partial<CostCode>) => Promise<void>;

  // Invoicing
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // Expenses
  addExpenseClaim: (claim: ExpenseClaim) => Promise<void>;
  updateExpenseClaim: (id: string, updates: Partial<ExpenseClaim>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, addProjectId } = useAuth();
  const { currentTenant } = useTenant();
  const { lastMessage } = useWebSocket();

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rfis, setRFIs] = useState<RFI[]>([]);
  const [punchItems, setPunchItems] = useState<PunchItem[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [dayworks, setDayworks] = useState<Daywork[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [safetyHazards, setSafetyHazards] = useState<SafetyHazard[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projectRisks, setProjectRisks] = useState<ProjectRisk[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!user) return;

    // Only subscribe if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL) return;

    // Check if supabase client is valid (not placeholder)
    if (import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co') return;

    const channel = supabase
      .channel('public:team_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        (payload) => {
          const newMessage = payload.new as TeamMessage;
          setTeamMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!lastMessage) return;

    const { type, entityType, data, id } = lastMessage;

    if (type === 'entity_create') {
      switch (entityType) {
        case 'tasks': setTasks(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'inventory': setInventory(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'rfis': setRFIs(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'daily_logs': setDailyLogs(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'safety_incidents': setSafetyIncidents(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'safety_hazards': setSafetyHazards(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'equipment': setEquipment(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'projects': setProjects(prev => [...prev.filter(x => x.id !== data.id), data]); break;
        case 'team': setTeamMembers(prev => [...prev.filter(x => x.id !== data.id), data]); break;
      }
    }

    if (type === 'entity_update') {
      const updateList = (prev: any[]) => prev.map(item => item.id === data.id ? { ...item, ...data } : item);
      switch (entityType) {
        case 'tasks': setTasks(updateList); break;
        case 'inventory': setInventory(updateList); break;
        case 'rfis': setRFIs(updateList); break;
        case 'daily_logs': setDailyLogs(updateList); break;
        case 'safety_incidents': setSafetyIncidents(updateList); break;
        case 'safety_hazards': setSafetyHazards(updateList); break;
        case 'equipment': setEquipment(updateList); break;
        case 'projects': setProjects(updateList); break;
        case 'team': setTeamMembers(updateList); break;
      }
    }

    if (type === 'entity_delete') {
      const deleteFromList = (prev: any[]) => prev.filter(item => item.id !== id);
      switch (entityType) {
        case 'tasks': setTasks(deleteFromList); break;
        case 'inventory': setInventory(deleteFromList); break;
        case 'rfis': setRFIs(deleteFromList); break;
        case 'daily_logs': setDailyLogs(deleteFromList); break;
        case 'safety_incidents': setSafetyIncidents(deleteFromList); break;
        case 'safety_hazards': setSafetyHazards(deleteFromList); break;
        case 'equipment': setEquipment(deleteFromList); break;
        case 'projects': setProjects(deleteFromList); break;
        case 'team': setTeamMembers(deleteFromList); break;
      }
    }
  }, [lastMessage]);

  // Initial Data Load (and on Tenant Change)
  useEffect(() => {
    // NO-OP if not logged in
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Wait for tenant to be initialized if we are logged in
    if (!currentTenant) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Core Data (Critical) - Fail nicely if these break
        const [p, t] = await Promise.all([
          db.getProjects().catch(e => { console.error('Projects failed', e); return []; }),
          db.getTasks().catch(e => { console.error('Tasks failed', e); return []; })
        ]);
        setProjects(p);
        setTasks(t);

        // Secondary Data - Load independently so they don't block critical UI
        db.getDocuments().then(setDocuments).catch(console.error);
        db.getInventory().then(setInventory).catch(console.error);
        db.getRFIs().then(setRFIs).catch(console.error);
        db.getPunchItems().then(setPunchItems).catch(console.error);
        db.getDailyLogs().then(setDailyLogs).catch(console.error);
        db.getDayworks().then(setDayworks).catch(console.error);
        db.getSafetyIncidents().then(setSafetyIncidents).catch(console.error);
        db.getSafetyHazards().then(setSafetyHazards).catch(console.error);
        db.getEquipment().then(setEquipment).catch(console.error);
        db.getTimesheets().then(setTimesheets).catch(console.error);
        db.getTransactions().then(setTransactions).catch(console.error);
        db.getDefects().then(setDefects).catch(console.error);
        db.getProjectRisks().then(setProjectRisks).catch(console.error);
        db.getPurchaseOrders().then(setPurchaseOrders).catch(console.error);
        db.getInvoices().then(setInvoices).catch(console.error);
        db.getExpenseClaims().then(setExpenseClaims).catch(console.error);
        db.getCostCodes().then(setCostCodes).catch(console.error);

      } catch (e) {
        console.error("Critical Data Load Failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentTenant?.id, user]);

  // --- RBAC & Multi-tenant Filtering ---
  // Determine the active scope:
  // 1. If a tenant is selected in TenantContext (Super Admin switching views), use that.
  // 2. Fallback to the user's assigned companyId.
  const activeScopeId = currentTenant?.id || user?.companyId;

  const visibleProjects = useMemo(() => {
    if (!activeScopeId) return [];

    // If we are in restricted mock mode, we might get ALL projects. Filter them client-side.
    // Even for Super Admin, we usually want to see the "Current Context" (Selected Tenant).
    // If "Global View" is needed, distinct UI should be used (like TenantAnalytics).
    return projects.filter(p => p.companyId === activeScopeId);
  }, [projects, activeScopeId]);

  const visibleProjectIds = useMemo(() => visibleProjects.map(p => p.id), [visibleProjects]);

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => visibleProjectIds.includes(t.projectId));
  }, [tasks, visibleProjectIds]);

  const visibleDocs = useMemo(() => {
    return documents.filter(d => visibleProjectIds.includes(d.projectId));
  }, [documents, visibleProjectIds]);

  const visibleInventory = useMemo(() => {
    if (!activeScopeId) return [];
    return inventory.filter(i => i.companyId === activeScopeId);
  }, [inventory, activeScopeId]);

  // Note: Safety, Equipment, Timesheets filtered in views or here if they have companyId
  // Assuming seed data uses 'c1' for companyId where possible or inferred from project.
  // const visibleSafety = safetyIncidents; // Replaced by useMemo below
  const visibleEquipment = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.SUPERADMIN) return equipment;
    return equipment.filter(e => e.companyId === user.companyId);
  }, [equipment, user]);
  const visibleTimesheets = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.SUPERADMIN) return timesheets;
    return timesheets.filter(t => t.companyId === user.companyId);
  }, [timesheets, user]);

  const visibleDefects = useMemo(() => {
    return defects.filter(d => visibleProjectIds.includes(d.projectId));
  }, [defects, visibleProjectIds]);

  const visibleRisks = useMemo(() => {
    return projectRisks.filter(r => visibleProjectIds.includes(r.projectId));
  }, [projectRisks, visibleProjectIds]);

  const visiblePurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => visibleProjectIds.includes(po.projectId || ''));
  }, [purchaseOrders, visibleProjectIds]);

  const visibleRFIs = useMemo(() => {
    return rfis.filter(r => visibleProjectIds.includes(r.projectId));
  }, [rfis, visibleProjectIds]);

  const visiblePunchItems = useMemo(() => {
    return punchItems.filter(p => visibleProjectIds.includes(p.projectId));
  }, [punchItems, visibleProjectIds]);

  const visibleDailyLogs = useMemo(() => {
    return dailyLogs.filter(l => visibleProjectIds.includes(l.projectId));
  }, [dailyLogs, visibleProjectIds]);

  const visibleDayworks = useMemo(() => {
    return dayworks.filter(d => visibleProjectIds.includes(d.projectId));
  }, [dayworks, visibleProjectIds]);

  const visibleSafetyIncidents = useMemo(() => {
    return safetyIncidents.filter(i => i.projectId ? visibleProjectIds.includes(i.projectId) : true);
  }, [safetyIncidents, visibleProjectIds]);

  const visibleTransactions = useMemo(() => {
    return transactions.filter(t => visibleProjectIds.includes(t.projectId || ''));
  }, [transactions, visibleProjectIds]);

  const visibleCostCodes = useMemo(() => {
    return costCodes.filter(c => visibleProjectIds.includes(c.projectId));
  }, [costCodes, visibleProjectIds]);

  // Aggregate "Spent" for each cost code dynamically
  const managedCostCodes = useMemo(() => {
    return visibleCostCodes.map(code => {
      // Logic: Spent = Approved/Completed (Transactions + Invoices + ExpenseClaims)
      const txnSpent = transactions
        .filter(t => t.costCodeId === code.id && t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const invSpent = invoices
        .filter(i => i.costCodeId === code.id && (i.status === 'Approved' || i.status === 'Paid'))
        .reduce((sum, i) => sum + (i.total || i.amount), 0);

      const expSpent = expenseClaims
        .filter(e => e.costCodeId === code.id && (e.status === 'Approved' || e.status === 'Paid'))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        ...code,
        spent: txnSpent + invSpent + expSpent,
        var: code.budget > 0 ? Math.round(((txnSpent + invSpent + expSpent - code.budget) / code.budget) * 100) : 0
      };
    });
  }, [visibleCostCodes, transactions, invoices, expenseClaims]);

  const visibleInvoices = useMemo(() => {
    return invoices.filter(i => visibleProjectIds.includes(i.projectId));
  }, [invoices, visibleProjectIds]);

  const visibleExpenseClaims = useMemo(() => {
    return expenseClaims.filter(e => visibleProjectIds.includes(e.projectId));
  }, [expenseClaims, visibleProjectIds]);

  // Channels are tenant-global.
  const visibleChannels = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.SUPERADMIN) return channels;
    return channels.filter(c => c.companyId === user.companyId);
  }, [channels, user]);



  // --- Project Methods ---
  const addProject = async (project: Project) => {
    const projectWithTenant = { ...project, companyId: user?.companyId || 'c1' };
    setProjects((prev) => [projectWithTenant, ...prev]);
    if (user && user.role !== UserRole.SUPERADMIN && addProjectId) {
      addProjectId(projectWithTenant.id);
    }
    await db.addProject(projectWithTenant);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    await db.updateProject(id, updates);
  };

  const deleteProject = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await db.deleteProject(id);
  };

  const getProject = (id: string) => {
    return visibleProjects.find((p) => p.id === id);
  };

  const addZone = async (projectId: string, zone: Zone) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedZones = [...(p.zones || []), zone];
        return { ...p, zones: updatedZones };
      }
      return p;
    }));
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updatedZones = [...(project.zones || []), zone];
      await db.updateProject(projectId, { zones: updatedZones });
    }
  };

  // --- Task Methods ---
  const addTask = async (task: Task) => {
    setTasks(prev => [task, ...prev]);
    setProjects(prev => prev.map(p => {
      if (p.id === task.projectId) {
        return { ...p, tasks: { ...p.tasks, total: p.tasks.total + 1 } };
      }
      return p;
    }));
    await db.addTask(task);
  };

  const { addNotification } = useNotifications();

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;

      const oldTask = prev[taskIndex];
      const newTasks = prev.map(t => t.id === id ? { ...t, ...updates } : t);

      // --- Delay Propagation Logic ---
      if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
        // Find tasks that depend on this one
        const dependents = newTasks.filter(t => t.dependencies?.includes(id));

        dependents.forEach(dep => {
          addNotification({
            title: 'Downstream Delay Alert',
            message: `Dependency "${oldTask.title}" delayed to ${updates.dueDate}. Review impact on "${dep.title}".`,
            type: 'warning',
            link: 'TASKS'
          });
        });
      }

      return newTasks;
    });

    await db.updateTask(id, updates);
  };

  const getCriticalPath = async (projectId: string) => {
    return await db.getCriticalPath(projectId);
  };

  const getPredictiveAnalysis = async (projectId: string) => {
    return await db.getPredictiveAnalysis(projectId);
  };

  const getBulkPredictiveAnalysis = async () => {
    return await db.getBulkPredictiveAnalysis();
  };

  const extractOcrData = async (file: File, type: string = 'general') => {
    return await db.extractOcrData(file, type);
  };

  const getAutomations = async () => {
    return await db.getAutomations();
  };

  const createAutomation = async (a: any) => {
    return await db.createAutomation(a);
  };

  // --- Inventory Methods ---
  const addInventoryItem = async (item: InventoryItem) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setInventory(prev => [...prev, itemWithTenant]);
    await db.addInventoryItem(itemWithTenant);
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    await db.updateInventoryItem(id, updates);
  };

  // --- New Methods ---
  const addRFI = async (item: RFI) => {
    setRFIs(prev => [item, ...prev]);
    await db.addRFI(item);
  };

  const updateRFI = async (id: string, updates: Partial<RFI>) => {
    setRFIs(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    await db.updateRFI(id, updates);
  };

  const addPunchItem = async (item: PunchItem) => {
    setPunchItems(prev => [item, ...prev]);
    await db.addPunchItem(item);
  };

  const addDailyLog = async (item: DailyLog) => {
    setDailyLogs(prev => [item, ...prev]);
    await db.addDailyLog(item);
  };

  const addDaywork = async (item: Daywork) => {
    setDayworks(prev => [item, ...prev]);
    await db.addDaywork(item);
  };

  const updateDailyLog = async (id: string, updates: Partial<DailyLog>) => {
    setDailyLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    await db.updateDailyLog(id, updates);
  };

  // --- Backend Extension Methods ---
  const addSafetyIncident = async (item: SafetyIncident) => {
    setSafetyIncidents(prev => [item, ...prev]);
    await db.addSafetyIncident(item);
  };

  const updateSafetyIncident = async (id: string, updates: Partial<SafetyIncident>) => {
    setSafetyIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    await db.updateSafetyIncident(id, updates);
  };

  const addSafetyHazard = async (item: SafetyHazard) => {
    setSafetyHazards(prev => [item, ...prev]);
    await db.addSafetyHazard(item);
  };

  const addEquipment = async (item: Equipment) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setEquipment(prev => [itemWithTenant, ...prev]);
    await db.addEquipment(itemWithTenant);
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await db.updateEquipment(id, updates);
  };

  const addTimesheet = async (item: Timesheet) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setTimesheets(prev => [itemWithTenant, ...prev]);
    await db.addTimesheet(itemWithTenant);
  };

  const updateTimesheet = async (id: string, updates: Partial<Timesheet>) => {
    setTimesheets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await db.updateTimesheet(id, updates);
  };

  // --- Chat Methods ---
  const addChannel = async (item: Channel) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setChannels(prev => [...prev, itemWithTenant]);
    await db.addChannel(itemWithTenant);
  };

  const addTeamMessage = async (item: TeamMessage) => {
    setTeamMessages(prev => [...prev, item]);
    await db.addTeamMessage(item);
  };

  const addTransaction = async (item: Transaction) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setTransactions(prev => [itemWithTenant, ...prev]);
    await db.addTransaction(itemWithTenant);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await db.updateTransaction(id, updates);
  };

  const addDefect = async (item: Defect) => {
    const itemWithTenant = { ...item, companyId: user?.companyId || 'c1' };
    setDefects(prev => [itemWithTenant, ...prev]);
    await db.addDefect(itemWithTenant);
  };

  const updateDefect = async (id: string, updates: Partial<Defect>) => {
    setDefects(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    await db.updateDefect(id, updates);
  };

  const deleteDefect = async (id: string) => {
    setDefects(prev => prev.filter(d => d.id !== id));
    await db.deleteDefect(id);
  };

  const runHealthForecasting = async (projectId: string): Promise<ProjectRisk | null> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
    const totalTasks = projectTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

    // Simulate AI analysis logic
    const risk: ProjectRisk = {
      id: `risk-${Date.now()}`,
      projectId,
      riskLevel: completionRate < 0.3 ? 'High' : completionRate < 0.7 ? 'Medium' : 'Low',
      predictedDelayDays: Math.floor((1 - completionRate) * 15),
      factors: [
        completionRate < 0.5 ? 'Slow task completion rate' : 'Standard progress',
        'Material lead times in current supply chain',
        'Upcoming inclement weather forecast'
      ],
      recommendations: [
        'Increase workforce allocation in Sector 2',
        'Pre-order Phase 3 materials now',
        'Review critical path dependencies'
      ],
      timestamp: new Date().toISOString(),
      trend: completionRate > 0.5 ? 'Improving' : 'Stable'
    };

    setProjectRisks(prev => [risk, ...prev]);
    await db.addProjectRisk(risk);
    return risk;
  };

  const addPurchaseOrder = async (po: PurchaseOrder) => {
    const poWithTenant = { ...po, companyId: user?.companyId || 'c1' };
    setPurchaseOrders(prev => [poWithTenant, ...prev]);
    await db.addPurchaseOrder(poWithTenant);
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await db.updatePurchaseOrder(id, updates);
  };

  const addDocument = async (doc: ProjectDocument) => {
    setDocuments(prev => [doc, ...prev]);
    await db.addDocument(doc);
  };

  const updateDocument = async (id: string, updates: Partial<ProjectDocument>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    await db.updateDocument(id, updates);
  };

  const addCostCode = async (code: CostCode) => {
    setCostCodes(prev => [...prev, code]);
    await db.addCostCode(code);
  };

  const updateCostCode = async (id: string, updates: Partial<CostCode>) => {
    setCostCodes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await db.updateCostCode(id, updates);
  };

  const addInvoice = async (invoice: Invoice) => {
    const itemWithTenant = { ...invoice, companyId: user?.companyId || 'c1' };
    setInvoices(prev => [itemWithTenant, ...prev]);
    await db.addInvoice(itemWithTenant);
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    await db.updateInvoice(id, updates);
  };

  const deleteInvoice = async (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    await db.deleteInvoice(id);
  };

  const addExpenseClaim = async (claim: ExpenseClaim) => {
    const itemWithTenant = { ...claim, companyId: user?.companyId || 'c1' };
    setExpenseClaims(prev => [itemWithTenant, ...prev]);
    await db.addExpenseClaim(itemWithTenant);
  };

  const updateExpenseClaim = async (id: string, updates: Partial<ExpenseClaim>) => {
    setExpenseClaims(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await db.updateExpenseClaim(id, updates);
  };

  return (
    <ProjectContext.Provider value={{
      projects: visibleProjects,
      tasks: visibleTasks,
      documents: visibleDocs,
      inventory: visibleInventory,
      rfis: visibleRFIs,
      punchItems: visiblePunchItems,
      dailyLogs: visibleDailyLogs,
      dayworks: visibleDayworks,
      safetyIncidents: visibleSafetyIncidents,
      safetyHazards,
      equipment: visibleEquipment,
      timesheets: visibleTimesheets,
      channels: visibleChannels,
      teamMessages,
      teamMembers,
      transactions: visibleTransactions,
      financials: visibleTransactions,
      activeProject,
      setActiveProject,
      isLoading,
      addProject,
      updateProject,
      deleteProject,
      getProject,
      addZone,
      addTask,
      updateTask,
      getCriticalPath,
      getPredictiveAnalysis,
      getBulkPredictiveAnalysis,
      extractOcrData,
      getAutomations,
      createAutomation,
      addDocument,
      updateDocument,
      addInventoryItem,
      updateInventoryItem,
      addRFI,
      updateRFI,
      addPunchItem,
      addDailyLog,
      updateDailyLog,
      addDaywork,
      addSafetyIncident,
      updateSafetyIncident,
      addSafetyHazard,
      addEquipment,
      updateEquipment,
      addTimesheet,
      updateTimesheet,
      addChannel,
      addTeamMessage,
      addTransaction,
      defects: visibleDefects,
      addDefect,
      updateDefect,
      deleteDefect,
      projectRisks: visibleRisks,
      runHealthForecasting,
      purchaseOrders: visiblePurchaseOrders,
      addPurchaseOrder,
      updatePurchaseOrder,
      costCodes,
      addCostCode,
      updateCostCode,
      invoices: visibleInvoices,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      expenseClaims: visibleExpenseClaims,
      addExpenseClaim,
      updateExpenseClaim,
      updateTransaction
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
