import { Megaphone, X, ShieldAlert } from 'lucide-react';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import SuperadminSidebar from '@/components/SuperadminSidebar';
import TopBar from '@/components/TopBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { CommandPalette } from '@/components/CommandPalette';
import { Page, UserRole } from '@/types';
import { ImpersonationToolbar } from '@/components/ImpersonationToolbar';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { ModuleProvider } from '@/contexts/ModuleContext';
import ToastProvider from '@/contexts/ToastContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryProvider } from '@/contexts/QueryProvider';
import { SyncProvider } from '@/contexts/SyncContext';
import { canAccessPage } from '@/utils/routeGuards';

// Utility to handle chunk load errors by reloading the page
const lazyWithReload = (fn: () => Promise<any>) => React.lazy(() => {
  return fn().catch(error => {
    // Check if it's a chunk load error
    if (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')) {
      window.location.reload();
    }
    throw error;
  });
});

// Lazily loaded view components
const LoginView = lazyWithReload(() => import('@/views/LoginView'));
const RegisterView = lazyWithReload(() => import('@/views/RegisterView'));
const SetupView = lazyWithReload(() => import('@/views/SetupView'));
const ProfileView = lazyWithReload(() => import('@/views/ProfileView'));
const AcceptInvitationView = lazyWithReload(() => import('@/views/AcceptInvitationView'));

const AIToolsView = lazyWithReload(() => import('@/views/AIToolsView'));
const ReportsView = lazyWithReload(() => import('@/views/ReportsView'));
const ScheduleView = lazyWithReload(() => import('@/views/ScheduleView'));
const ChatView = lazyWithReload(() => import('@/views/ChatView'));
const LiveView = lazyWithReload(() => import('@/views/LiveView'));
const DashboardView = lazyWithReload(() => import('@/views/DashboardView'));
const ProjectsView = lazyWithReload(() => import('@/views/ProjectsView'));
const ProjectDetailsView = lazyWithReload(() => import('@/views/ProjectDetailsView'));
const TasksView = lazyWithReload(() => import('@/views/TasksView'));
const TeamView = lazyWithReload(() => import('@/views/TeamView'));
const TimesheetsView = lazyWithReload(() => import('@/views/TimesheetsView'));
const DocumentsView = lazyWithReload(() => import('@/views/DocumentsView'));
const SafetyView = lazyWithReload(() => import('@/views/SafetyView'));
const EquipmentView = lazyWithReload(() => import('@/views/EquipmentView'));
const FinancialsView = lazyWithReload(() => import('@/views/FinancialsView'));
const TeamChatView = lazyWithReload(() => import('@/views/TeamChatView'));
const MLInsightsView = lazyWithReload(() => import('@/views/MLInsightsView'));
const ComplianceView = lazyWithReload(() => import('@/views/ComplianceView'));
const ProcurementView = lazyWithReload(() => import('@/views/ProcurementView'));
const CustomDashView = lazyWithReload(() => import('@/views/CustomDashView'));
const WorkforceView = lazyWithReload(() => import('@/views/WorkforceView'));
const IntegrationsView = lazyWithReload(() => import('@/views/IntegrationsView'));
const SecurityView = lazyWithReload(() => import('@/views/SecurityView'));
const ExecutiveView = lazyWithReload(() => import('@/views/ExecutiveView'));
const MapView = lazyWithReload(() => import('@/views/MapView'));
const ClientsView = lazyWithReload(() => import('@/views/ClientsView'));
const InventoryView = lazyWithReload(() => import('@/views/InventoryView'));
const MarketplaceView = lazyWithReload(() => import('@/views/MarketplaceView'));
const ImagineView = lazyWithReload(() => import('@/views/ImagineView'));
const MyDesktopView = lazyWithReload(() => import('@/views/MyDesktopView'));
const LiveProjectMapView = lazyWithReload(() => import('@/views/LiveProjectMapView'));
const ProjectLaunchpadView = lazyWithReload(() => import('@/views/ProjectLaunchpadView'));
const TenantManagementView = lazyWithReload(() => import('@/views/TenantManagementView'));
const TenantAnalyticsView = lazyWithReload(() => import('@/views/TenantAnalyticsView'));
const ResourceOptimizationView = lazyWithReload(() => import('@/views/ResourceOptimizationView'));
const DailyLogsView = lazyWithReload(() => import('@/views/DailyLogsView'));
const RFIView = lazyWithReload(() => import('@/views/RFIView'));
const ClientPortalView = lazyWithReload(() => import('@/views/ClientPortalView'));
const MaintenanceView = lazyWithReload(() => import('@/views/MaintenanceView'));

// Platform/Superadmin Views
// Platform/Superadmin Views
const PlatformDashboardView = lazyWithReload(() => import('@/views/platform/PlatformDashboardView'));
const DatabaseQueryView = lazyWithReload(() => import('@/views/platform/DatabaseQueryView'));
const CompanyManagementView = lazyWithReload(() => import('@/views/CompanyManagementView'));
const SuperAdminCompaniesView = lazyWithReload(() => import('@/views/SuperAdminCompaniesView'));

const PlatformMembersView = lazyWithReload(() => import('@/views/platform/PlatformMembersView'));
const AccessControlView = lazyWithReload(() => import('@/views/platform/AccessControlView'));
const SystemLogsView = lazyWithReload(() => import('@/views/platform/SystemLogsView'));
const PlatformAutomationView = lazyWithReload(() => import('@/views/platform/PlatformAutomationView'));
const UsageAnalyticsView = lazyWithReload(() => import('@/views/platform/UsageAnalyticsView'));
const ExportView = lazyWithReload(() => import('@/views/platform/ExportView'));
const SecurityDashboardView = lazyWithReload(() => import('@/views/platform/SecurityDashboardView'));
const SupportTicketsView = lazyWithReload(() => import('@/views/platform/SupportTicketsView'));
const PlatformNotificationsView = lazyWithReload(() => import('@/views/platform/PlatformNotificationsView'));
const GlobalSettingsView = lazyWithReload(() => import('@/views/platform/GlobalSettingsView'));
const SuperAdminCommandCenter = lazyWithReload(() => import('@/views/platform/SuperAdminCommandCenter'));

// Phase 14: Automations & Intelligence
const AutomationsView = lazyWithReload(() => import('@/views/AutomationsView'));
const PredictiveAnalysisView = lazyWithReload(() => import('@/views/PredictiveAnalysisView'));
const SmartDocumentCenter = lazyWithReload(() => import('@/views/SmartDocumentCenter'));
const UserManagementView = lazyWithReload(() => import("@/views/UserManagementView"));

// CortexBuild Pages
const CortexBuildHomeView = lazyWithReload(() => import('@/views/CortexBuildHomeView'));
const NeuralNetworkView = lazyWithReload(() => import('@/views/NeuralNetworkView'));
const PlatformFeaturesView = lazyWithReload(() => import('@/views/PlatformFeaturesView'));
const ConnectivityView = lazyWithReload(() => import('@/views/ConnectivityView'));
const DeveloperPlatformView = lazyWithReload(() => import('@/views/DeveloperPlatformView'));

// Public Login Page
const PublicLoginView = lazyWithReload(() => import('@/views/PublicLoginView'));
const RequestPasswordResetView = lazyWithReload(() => import('@/views/RequestPasswordResetView'));
const ConfirmPasswordResetView = lazyWithReload(() => import('@/views/ConfirmPasswordResetView'));



const AuthenticatedApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageFromPath = (path: string): Page => {
    if (path.startsWith('/client-portal/')) return Page.CLIENT_PORTAL;
    switch (path) {
      case '/neural-network': return Page.NEURAL_NETWORK;
      case '/platform-features': return Page.PLATFORM_FEATURES;
      case '/connectivity': return Page.CONNECTIVITY;
      case '/developer': return Page.DEVELOPER_PLATFORM;
      case '/login': return Page.LOGIN;
      case '/public-login': return Page.PUBLIC_LOGIN;
      case '/setup': return Page.SETUP;
      case '/accept-invitation': return Page.ACCEPT_INVITATION;
      case '/forgot-password': return Page.PASSWORD_RESET_REQUEST;
      case '/reset-password': return Page.PASSWORD_RESET_CONFIRM;
      case '/': return Page.CORTEX_BUILD_HOME;
      default: return Page.LOGIN; // Default fallback (will be handled by auth check)
    }
  };

  const [page, setPageState] = useState<Page>(() => getPageFromPath(window.location.pathname));

  // Custom setPage that also updates URL for public pages
  const setPage = (newPage: Page) => {
    setPageState(newPage);

    // Update URL for public pages
    switch (newPage) {
      case Page.CORTEX_BUILD_HOME: navigate('/'); break;
      case Page.NEURAL_NETWORK: navigate('/neural-network'); break;
      case Page.PLATFORM_FEATURES: navigate('/platform-features'); break;
      case Page.CONNECTIVITY: navigate('/connectivity'); break;
      case Page.DEVELOPER_PLATFORM: navigate('/developer'); break;
      case Page.PASSWORD_RESET_REQUEST: navigate('/forgot-password'); break;
      case Page.PASSWORD_RESET_CONFIRM: navigate('/reset-password'); break;
      case Page.PUBLIC_LOGIN: navigate('/public-login'); break;
      case Page.LOGIN: navigate('/login'); break;
      case Page.SETUP: navigate('/setup'); break;
      case Page.ACCEPT_INVITATION: navigate('/accept-invitation'); break;
      // For internal app pages, we might want to keep URL clean or add /app prefix later
      // For now, don't change URL for internal app pages to avoid breaking anything
    }
  };

  // Sync back/forward button
  useEffect(() => {
    const newPage = getPageFromPath(location.pathname);
    // Only update state if it differs and it's a known public path mapping
    // This prevents overriding internal navigation state if we are just on "/"
    if (location.pathname !== '/' || newPage === Page.CORTEX_BUILD_HOME) {
      setPageState(newPage);
    }
  }, [location.pathname]);

  // Dynamic Title Management
  useEffect(() => {
    const pageTitles: Partial<Record<Page, string>> = {
      [Page.CORTEX_BUILD_HOME]: 'CortexBuild Pro | AI-Powered Construction Intelligence',
      [Page.NEURAL_NETWORK]: 'Neural Network Hub | CortexBuild Pro',
      [Page.MARKETPLACE]: 'Global Module Marketplace | CortexBuild Pro',
      [Page.PLATFORM_FEATURES]: 'Platform Intelligence Features | CortexBuild Pro',
      [Page.CONNECTIVITY]: 'Global Connectivity & Infrastructure | CortexBuild Pro',
      [Page.DEVELOPER_PLATFORM]: 'Developer Ecosystem | CortexBuild Pro',
      [Page.DASHBOARD]: 'Strategic Control Center | CortexBuild Pro',
    };
    document.title = pageTitles[page] || 'CortexBuild Pro Intelligence';
  }, [page]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { user, stopImpersonating } = useAuth();
  const { broadcastMessage, setBroadcastMessage, systemSettings } = useTenant();

  // Shared State for Marketplace Apps
  const [installedApps, setInstalledApps] = useState<string[]>(['Procore', 'Slack', 'QuickBooks']);

  // Cmd+K keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Maintenance Mode Check (Super Admins Bypass)
  // If user is logged in AND is Super Admin, they bypass.
  // If user is NOT logged in or NOT Super Admin, they see Maintenance View.
  const isMaintenanceActive = systemSettings.maintenance || systemSettings.maintenanceMode;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  if (isMaintenanceActive && !isSuperAdmin) {
    return (
      <Suspense fallback={<div className="bg-zinc-900 h-screen" />}>
        <MaintenanceView onAdminLogin={() => window.location.reload()} />
      </Suspense>
    );
  }

  // FORCE CLIENT PORTAL: If user is a Client, they CANNOT see anything else.
  // This acts as a strict route guard.
  if (user?.role === UserRole.READ_ONLY && page !== Page.CLIENT_PORTAL && page !== Page.LOGIN) {
    setPage(Page.CLIENT_PORTAL);
    return null; // Trigger re-render with correct page
  }

  const toggleAppInstall = (appName: string) => {
    if (installedApps.includes(appName)) {
      setInstalledApps(prev => prev.filter(n => n !== appName));
    } else {
      setInstalledApps(prev => [...prev, appName]);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPage(Page.PROJECT_DETAILS);
  };

  // Check for public routes (Client Portal and CortexBuild pages)
  const isPublicRoute = window.location.pathname.startsWith('/client-portal/');
  const isCortexPageRoute = [
    Page.CORTEX_BUILD_HOME,
    Page.NEURAL_NETWORK,
    Page.PLATFORM_FEATURES,
    Page.CONNECTIVITY,
    Page.DEVELOPER_PLATFORM
  ].includes(page);
  const isPublicLoginPage = page === Page.PUBLIC_LOGIN;
  const isInvitationPage = page === Page.ACCEPT_INVITATION;

  // If not authenticated and not on a public route, CortexBuild page, Public Login, or Invitation page, show Login
  if (!user && !isPublicRoute && !isCortexPageRoute && !isPublicLoginPage && !isInvitationPage) {
    if (page === Page.REGISTER) {
      return <RegisterView setPage={setPage} />;
    }
    // If the user is not authenticated and tries to access a protected page, redirect to login
    // But if they're trying to access the root, we want to show the home page
    if (window.location.pathname === '/') {
      // Show the home page for unauthenticated users accessing root
      return <CortexBuildHomeView setPage={setPage} />;
    } else {
      return <LoginView setPage={setPage} />;
    }
  }


  // If public route and not logged in, force Client Portal page
  if (!user && isPublicRoute && page !== Page.CLIENT_PORTAL) {
    setPage(Page.CLIENT_PORTAL);
  }

  // --- STRICT ROUTE GUARD ---
  // Only apply route guard if user is authenticated OR if trying to access non-public pages
  if (user) {
    const isPageAllowed = (targetPage: Page, userRole: UserRole): boolean => {
      // Use the centralized route guard utility
      return canAccessPage(userRole, targetPage);
    };

    if (!isPageAllowed(page, user.role)) {
      // Redirect to a safe default based on role
      const safePage = user.role === UserRole.SUPERADMIN ? Page.PLATFORM_DASHBOARD :
        user.role === UserRole.READ_ONLY ? Page.CLIENT_PORTAL :
          Page.DASHBOARD;

      // Prevent infinite loop if safePage is also denied (unlikely but possible in misconfig)
      if (page !== safePage) {
        console.warn(`[Guard] Access denied to ${page} for role ${user.role}. Redirecting to ${safePage}`);
        setPage(safePage);
        return null;
      }
    }
  }

  // If user is not authenticated and viewing CortexBuild pages, show them without sidebar/layout
  if (!user && isCortexPageRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          {page === Page.CORTEX_BUILD_HOME && <CortexBuildHomeView setPage={setPage} />}
          {page === Page.NEURAL_NETWORK && <NeuralNetworkView setPage={setPage} />}
          {page === Page.PLATFORM_FEATURES && <PlatformFeaturesView setPage={setPage} />}
          {page === Page.CONNECTIVITY && <ConnectivityView setPage={setPage} />}
          {page === Page.DEVELOPER_PLATFORM && <DeveloperPlatformView setPage={setPage} />}
        </Suspense>
      </ErrorBoundary>
    );
  }

  // If user is not authenticated but viewing Public Login page, show the Public Login view
  if (!user && isPublicLoginPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          <PublicLoginView setPage={setPage} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // If user is not authenticated but viewing Invitation page, show it
  if (!user && isInvitationPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          <AcceptInvitationView />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Authenticated user or non-CortexBuild pages
  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 overflow-hidden relative">
      <ImpersonationToolbar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Command Palette */}
        <OfflineIndicator />
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          setPage={setPage}
        />
        {/* Global Broadcast Banner */}
        {broadcastMessage && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-[#0f5c82] text-white px-4 py-3 shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 container mx-auto">
              <span className="p-1.5 bg-white/20 rounded-full animate-pulse"><Megaphone size={16} /></span>
              <p className="text-sm font-medium">{broadcastMessage}</p>
            </div>
            <button
              onClick={() => setBroadcastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation - Role-based - Only show for authenticated users on app pages */}
        {user && !isCortexPageRoute && !isPublicRoute && !isPublicLoginPage && (
          user.role === UserRole.SUPERADMIN ? (
            <SuperadminSidebar
              currentPage={page}
              setPage={(p) => {
                setPage(p);
                setIsSidebarOpen(false);
              }}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          ) : (
            <Sidebar
              currentPage={page}
              setPage={(p) => {
                setPage(p);
                setIsSidebarOpen(false);
              }}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          )
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${broadcastMessage ? 'pt-12' : ''}`}>
          {/* Hide TopBar on authentication pages */}
          {![Page.LOGIN, Page.PUBLIC_LOGIN, Page.REGISTER, Page.SETUP, Page.ACCEPT_INVITATION, Page.PASSWORD_RESET_REQUEST, Page.PASSWORD_RESET_CONFIRM].includes(page) && (
            <TopBar setPage={setPage} onMenuClick={() => setIsSidebarOpen(true)} />
          )}

          <main className="flex-1 overflow-y-auto bg-zinc-50/50 relative">
            <ErrorBoundary>
              <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
                {page === Page.DASHBOARD && <DashboardView setPage={setPage} />}
                {page === Page.EXECUTIVE && <ExecutiveView />}
                {page === Page.LIVE_PROJECT_MAP && <LiveProjectMapView />}
                {page === Page.PROJECT_LAUNCHPAD && <ProjectLaunchpadView onClose={() => setPage(Page.PROJECTS)} onViewProject={handleProjectSelect} />}
                {page === Page.PROJECTS && <ProjectsView onProjectSelect={handleProjectSelect} setPage={setPage} />}
                {page === Page.PROJECT_DETAILS && (
                  <ProjectDetailsView
                    projectId={selectedProjectId}
                    onBack={() => setPage(Page.PROJECTS)}
                  />
                )}
                {page === Page.TASKS && <TasksView />}
                {page === Page.TEAM && <TeamView />}
                {page === Page.TIMESHEETS && <TimesheetsView />}
                {page === Page.DOCUMENTS && <DocumentsView />}
                {page === Page.SUPPORT_CENTER && <SupportTicketsView />}
                {page === Page.PLATFORM_NOTIFICATIONS && <PlatformNotificationsView />}
                {page === Page.GLOBAL_SETTINGS && <GlobalSettingsView />}
                {page === Page.SAFETY && <SafetyView />}
                {page === Page.EQUIPMENT && <EquipmentView />}
                {page === Page.FINANCIALS && <FinancialsView />}
                {page === Page.TEAM_CHAT && <TeamChatView />}
                {page === Page.AI_TOOLS && <AIToolsView setPage={setPage} />}
                {page === Page.ML_INSIGHTS && <MLInsightsView />}
                {page === Page.COMPLIANCE && <ComplianceView />}
                {page === Page.PROCUREMENT && <ProcurementView />}
                {page === Page.SCHEDULE && <ScheduleView />}
                {page === Page.CUSTOM_DASH && <CustomDashView />}
                {page === Page.REPORTS && <ReportsView />}
                {page === Page.WORKFORCE && <WorkforceView />}
                {page === Page.INTEGRATIONS && <IntegrationsView />}
                {page === Page.SECURITY && <SecurityView />}
                {page === Page.PROFILE && <ProfileView />}
                {page === Page.MAP_VIEW && <MapView />}
                {page === Page.CLIENTS && <ClientsView />}
                {page === Page.INVENTORY && <InventoryView />}
                {page === Page.CHAT && <ChatView setPage={setPage} />}
                {page === Page.LIVE && <LiveView setPage={setPage} />}
                {page === Page.MARKETPLACE && (
                  <MarketplaceView
                    setPage={setPage}
                    toggleInstall={toggleAppInstall}
                  />
                )}
                {page === Page.IMAGINE && <ImagineView />}
                {page === Page.MY_DESKTOP && (
                  <MyDesktopView
                    installedApps={installedApps}
                    setPage={setPage}
                  />
                )}
                {page === Page.TENANT_MANAGEMENT && <TenantManagementView />}
                {page === Page.TENANT_ANALYTICS && <TenantAnalyticsView />}
                {page === Page.RESOURCE_OPTIMIZATION && <ResourceOptimizationView />}
                {page === Page.DAILY_LOGS && <DailyLogsView />}
                {page === Page.RFI && <RFIView />}
                {page === Page.CLIENT_PORTAL && <ClientPortalView />}
                {/* Platform/Superadmin Routes */}
                {page === Page.PLATFORM_DASHBOARD && <PlatformDashboardView setPage={setPage} />}
                {page === Page.COMPANY_MANAGEMENT && (
                  user?.role === UserRole.SUPERADMIN ?
                    <SuperAdminCompaniesView setPage={setPage} /> :
                    <CompanyManagementView />
                )}
                {page === Page.PLATFORM_MEMBERS && <PlatformMembersView />}
                {page === Page.ACCESS_CONTROL && <AccessControlView />}
                {page === Page.SYSTEM_LOGS && <SystemLogsView />}
                {page === Page.AUTOMATION && <PlatformAutomationView />}
                {page === Page.EXPORT_CENTER && <ExportView />}
                {page === Page.SQL_CONSOLE && <SuperAdminCommandCenter />}
                {/* Route removed: SubscriptionView */}
                {page === Page.SECURITY_CENTER && <SecurityDashboardView />}
                {page === Page.AUTOMATIONS && <AutomationsView />}
                {page === Page.PREDICTIVE_ANALYSIS && <PredictiveAnalysisView />}
                {page === Page.SMART_DOCS && <SmartDocumentCenter />}
                {page === Page.USER_MANAGEMENT && <UserManagementView />}
                {page === Page.USAGE_ANALYTICS && <UsageAnalyticsView />}

                {/* CortexBuild Pages (for authenticated users) */}
                {page === Page.CORTEX_BUILD_HOME && <CortexBuildHomeView setPage={setPage} />}
                {page === Page.NEURAL_NETWORK && <NeuralNetworkView setPage={setPage} />}
                {page === Page.PLATFORM_FEATURES && <PlatformFeaturesView setPage={setPage} />}
                {page === Page.CONNECTIVITY && <ConnectivityView setPage={setPage} />}
                {page === Page.DEVELOPER_PLATFORM && <DeveloperPlatformView setPage={setPage} />}

                {/* Public Login Page */}
                {page === Page.PUBLIC_LOGIN && <PublicLoginView setPage={setPage} />}
                {page === Page.SETUP && <SetupView />}
                {page === Page.ACCEPT_INVITATION && <AcceptInvitationView />}
                {page === Page.PASSWORD_RESET_REQUEST && <RequestPasswordResetView setPage={setPage} />}
                {page === Page.PASSWORD_RESET_CONFIRM && <ConfirmPasswordResetView setPage={setPage} />}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SyncProvider>
              <WebSocketProvider>
                <TenantProvider>
                  <ModuleProvider>
                    <NotificationProvider>
                      <ProjectProvider>
                        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-zinc-900 dark:text-white">Loading BuildPro...</div>}>
                          <Router>
                            <AuthenticatedApp />
                          </Router>
                        </Suspense>
                      </ProjectProvider>
                    </NotificationProvider>
                  </ModuleProvider>
                </TenantProvider>
              </WebSocketProvider>
            </SyncProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default App;
