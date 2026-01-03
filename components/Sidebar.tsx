
import React from 'react';
import {
  Briefcase, Bot, LayoutDashboard, FolderOpen, CheckSquare, Users, Clock, FileText,
  Shield, Wrench, PoundSterling, MessageSquare, Map, Cpu, LineChart,
  ClipboardCheck, ShoppingCart, UserCheck, Package, Calendar, PieChart, FileBarChart,
  HardHat, Zap, Lock, Code, Store, Wand2, Monitor, HardHat as LogoIcon, Navigation, LogOut,
  BrainCircuit, Building2, X, Settings as SettingsIcon, Eye, Workflow, Scan, Brain, Download
} from 'lucide-react';
import { Page, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useModules, CompanyModule } from '@/contexts/ModuleContext';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isOpen = false, onClose }) => {
  const { user, logout, stopImpersonating, isImpersonating } = useAuth();
  const { systemSettings } = useTenant();
  const { isConnected, onlineUsers } = useWebSocket();
  const { hasModule } = useModules();

  const betaPages = [Page.IMAGINE, Page.ML_INSIGHTS, Page.RESOURCE_OPTIMIZATION, Page.AI_TOOLS];

  // Module requirements for each page
  const pageModules: Partial<Record<Page, CompanyModule>> = {
    [Page.AI_TOOLS]: CompanyModule.AI_TOOLS,
    [Page.IMAGINE]: CompanyModule.AI_TOOLS,
    [Page.PREDICTIVE_ANALYSIS]: CompanyModule.AI_TOOLS,
    [Page.FINANCIALS]: CompanyModule.FINANCIALS,
    [Page.TENANT_ANALYTICS]: CompanyModule.ANALYTICS,
    [Page.CLIENT_PORTAL]: CompanyModule.CLIENT_PORTAL,
    [Page.COMPLIANCE]: CompanyModule.COMPLIANCE_TRACKING,
    [Page.SCHEDULE]: CompanyModule.GANTT_CHARTS,
  };

  // Define permissions for each page
  const pagePermissions: Record<Page, string[]> = {
    [Page.DASHBOARD]: ['dashboard.view'],
    [Page.PROJECTS]: ['projects.view'],
    [Page.TASKS]: ['tasks.view'],
    [Page.SCHEDULE]: ['schedule.view'],
    [Page.AUTOMATIONS]: ['automations.manage'],
    [Page.TEAM]: ['team.view'],
    [Page.CHAT]: ['chat.use'],
    [Page.LIVE]: ['live.view'],
    [Page.LIVE_PROJECT_MAP]: ['map.view'],
    [Page.SAFETY]: ['safety.view'],
    [Page.EQUIPMENT]: ['equipment.view'],
    [Page.DOCUMENTS]: ['documents.view'],
    [Page.ANALYTICS]: ['analytics.view'],
    [Page.PREDICTIVE_ANALYSIS]: ['analytics.predictive'],
    [Page.SMART_DOCS]: ['documents.ocr'],
    [Page.IMAGINE]: ['ai.imagine'],
    [Page.AI_TOOLS]: ['ai.tools'],
    [Page.TENANT_ANALYTICS]: ['analytics.tenant'],
    [Page.REPORTS]: ['reports.generate'],
    [Page.COMPANY_SETTINGS]: ['settings.company'],
    [Page.TENANT_MANAGEMENT]: ['tenant.manage'],
    [Page.PROFILE]: ['profile.view'],
    [Page.TIMESHEETS]: ['timesheets.view'],
    [Page.FINANCIALS]: ['financials.view'],
    [Page.CLIENTS]: ['clients.view'],
    [Page.INVENTORY]: ['inventory.view'],
    [Page.SECURITY]: ['security.view'],
    [Page.COMPLIANCE]: ['compliance.view'],
    [Page.PROCUREMENT]: ['procurement.view'],
    [Page.INTEGRATIONS]: ['integrations.manage'],
    [Page.EXECUTIVE]: ['executive.dashboard'],
    [Page.MAP_VIEW]: ['map.view'],
    [Page.WORKFORCE]: ['workforce.view'],
    [Page.RESOURCE_OPTIMIZATION]: ['resources.optimize'],
    [Page.CUSTOM_DASH]: ['dashboard.custom'],
    [Page.DAILY_LOGS]: ['logs.daily'],
    [Page.RFI]: ['rfi.manage'],
    [Page.CLIENT_PORTAL]: ['client.portal'],
    [Page.MAINTENANCE]: ['maintenance.view'],
    [Page.PLATFORM_DASHBOARD]: ['platform.dashboard'],
    [Page.COMPANY_MANAGEMENT]: ['platform.companies'],
    [Page.PLATFORM_MEMBERS]: ['platform.members'],
    [Page.ACCESS_CONTROL]: ['platform.access'],
    [Page.SYSTEM_LOGS]: ['platform.logs'],
    [Page.SQL_CONSOLE]: ['platform.database'],
    [Page.SECURITY_CENTER]: ['platform.security'],
    [Page.SUPPORT_CENTER]: ['platform.support'],
    [Page.PLATFORM_NOTIFICATIONS]: ['platform.notifications'],
    [Page.GLOBAL_SETTINGS]: ['platform.settings'],
    [Page.LOGIN]: ["auth.login"],
    [Page.REGISTER]: ["auth.register"],
    [Page.TEAM_CHAT]: ["chat.team"],
    [Page.PROJECT_DETAILS]: ["projects.details"],
    [Page.ML_INSIGHTS]: ["ml.insights"],
    [Page.MARKETPLACE]: ["marketplace.view"],
    [Page.MY_DESKTOP]: ["desktop.view"],
    [Page.PROJECT_LAUNCHPAD]: ["projects.launchpad"],
    [Page.CORTEX_BUILD_HOME]: ["cortex.home"],
    [Page.NEURAL_NETWORK]: ["cortex.neural"],
    [Page.PLATFORM_FEATURES]: ["cortex.features"],
    [Page.CONNECTIVITY]: ["cortex.connectivity"],
    [Page.DEVELOPER_PLATFORM]: ["developer.platform"],
    [Page.SETUP]: ["system.setup"],
    [Page.USER_MANAGEMENT]: ['users.view'],
    [Page.PUBLIC_LOGIN]: ["auth.login"],
    [Page.ACCEPT_INVITATION]: ["public.access"],
    [Page.PASSWORD_RESET_REQUEST]: ["public.access"],
    [Page.PASSWORD_RESET_CONFIRM]: ["public.access"],
    [Page.AUTOMATION]: ["automations.manage"],
    [Page.EXPORT_CENTER]: ["reports.generate"]
  };

  const menuGroups = [
    ...(user ? [] : [{ // Only show login option if user is not authenticated
      title: 'Platform Access',
      items: [
        { id: Page.PUBLIC_LOGIN, label: 'Login', icon: LayoutDashboard, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT], permissions: ['auth.login'] },
      ]
    }]),
    {
      title: 'Strategic Control',
      items: [
        { id: Page.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['dashboard.view'] },
        { id: Page.PROJECTS, label: 'Portfolio', icon: FolderOpen, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['projects.view'] },
        { id: Page.TASKS, label: 'Vector Ledger', icon: CheckSquare, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['tasks.view'] },
        { id: Page.SCHEDULE, label: 'Timeline', icon: Calendar, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['schedule.view'] },
        { id: Page.AUTOMATIONS, label: 'Automations', icon: Workflow, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN], permissions: ['automations.manage'] },
        { id: Page.TEAM, label: 'Human Capital', icon: Users, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['team.view'] },
        { id: Page.CHAT, label: 'Neural Assistant', icon: Bot, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['chat.use'] },
      ]
    },
    {
      title: 'Field Operations',
      items: [
        { id: Page.LIVE, label: 'Field Assistant', icon: Zap, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['live.view'] },
        { id: Page.LIVE_PROJECT_MAP, label: 'Spatial Map', icon: Navigation, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['map.view'] },
        { id: Page.SAFETY, label: 'Digital Safety', icon: Shield, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR, UserRole.OPERATIVE], permissions: ['safety.view'] },
        { id: Page.EQUIPMENT, label: 'Asset Management', icon: Wrench, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['equipment.view'] },
        { id: Page.DOCUMENTS, label: 'Neural Archive', icon: FileText, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['documents.view'] },
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: Page.PREDICTIVE_ANALYSIS, label: 'Predictive Risk', icon: Brain, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN], permissions: ['analytics.predictive'] },
        { id: Page.SMART_DOCS, label: 'Smart Docs (OCR)', icon: Scan, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['documents.ocr'] },
        { id: Page.IMAGINE, label: 'Imagine Studio', icon: Wand2, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['ai.imagine'] },
        { id: Page.AI_TOOLS, label: 'AI Synthesis', icon: Cpu, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN], permissions: ['ai.tools'] },
        { id: Page.TENANT_ANALYTICS, label: 'Entity Intel', icon: Building2, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN], permissions: ['analytics.tenant'] },
        { id: Page.REPORTS, label: 'Strategic Intel', icon: FileBarChart, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR], permissions: ['reports.generate'] },
      ]
    },
    {
      title: 'Infrastructure',
      items: [
        { id: Page.COMPANY_SETTINGS, label: 'Core Config', icon: SettingsIcon, roles: [UserRole.COMPANY_ADMIN], permissions: ['settings.company'] },
        { id: Page.TENANT_MANAGEMENT, label: 'Node Admin', icon: Building2, roles: [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN], permissions: ['tenant.manage'] },
      ]
    },
    // CortexBuild Platform pages are available globally and not shown in sidebar for authenticated users
  ];

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-white/5 flex flex-col flex-shrink-0 overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
      md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
    `}>
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none opacity-50" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Logo Area */}
      <div className="p-8 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-3xl z-20 border-b border-white/5">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { setPage(Page.DASHBOARD); if (onClose) onClose(); }}>
          <div className="relative">
            <div className="absolute inset-0 bg-sky-400 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-2xl relative z-10 border border-white/20 transform transition-transform group-hover:scale-110">
              <Cpu size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-white tracking-tighter leading-none">
              CORTEXBUILD
            </span>
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mt-1 ml-0.5">
              PRO
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="md:hidden text-zinc-500 hover:text-white p-2 bg-white/5 rounded-xl transition-all border border-white/10"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        {/* User Identity Section */}
        {user && (
          <div className="px-6 py-8">
            <div className="p-5 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-sm border border-sky-500/20">
                  {user.avatarInitials}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-black text-white truncate tracking-tight">{user.name}</div>
                  <div className="text-[9px] font-black text-sky-400 uppercase tracking-widest mt-0.5 opacity-80 decoration-sky-400/30">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Connectivity & Presence Indicator */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isConnected ? 'System Online' : 'Offline'}
                  </span>
                </div>
                {isConnected && onlineUsers.length > 0 && (
                  <div className="text-[9px] text-zinc-500 font-bold">
                    <span className="text-white">{onlineUsers.length}</span> ACTIVE
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Impersonation Warning */}
        {isImpersonating && (
          <div className="px-6 mb-4">
            <button
              onClick={stopImpersonating}
              className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-lg animate-pulse"
            >
              <Eye size={14} />
              Stop Impersonation
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="pb-8 px-4 space-y-8">
          {menuGroups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(item => {
              const hasRole = user && item.roles.includes(user.role);
              const isBeta = betaPages.includes(item.id);
              if (!systemSettings.betaFeatures && isBeta) return false;

              // Module-based visibility check
              const requiredModule = pageModules[item.id as Page];
              if (requiredModule && !hasModule(requiredModule)) return false;

              return hasRole;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                <div className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500/80 mb-3 ml-1">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setPage(item.id as Page);
                          if (onClose) onClose();
                        }}
                        className={`w-full flex items-center gap-4 px-4 py-3 text-xs font-black transition-all relative rounded-2xl group ${isActive
                          ? 'text-white bg-sky-500 shadow-[0_10px_30px_rgba(14,165,233,0.3)]'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                          <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-sky-400'} />
                        </div>
                        <span className="tracking-tight">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-6 bg-zinc-950/80 backdrop-blur-3xl border-t border-white/5 relative z-20 space-y-2">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center gap-4 px-4 py-4 text-xs font-black text-sky-400 hover:bg-sky-500/10 rounded-2xl transition-all group border border-sky-500/20"
          >
            <div className="group-hover:scale-110 transition-transform">
              <Download size={18} strokeWidth={2.5} />
            </div>
            <span className="uppercase tracking-widest">Install App</span>
          </button>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-4 text-xs font-black text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all group"
        >
          <div className="group-hover:scale-110 transition-transform">
            <LogOut size={18} strokeWidth={2.5} />
          </div>
          <span className="uppercase tracking-widest">System Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
