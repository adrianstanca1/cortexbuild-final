import { UserRole } from '@/types';

// Define which pages require which roles
const PAGE_ROLES: Record<string, UserRole[]> = {
  // Super Admin only pages
  'PLATFORM_DASHBOARD': [UserRole.SUPERADMIN],
  'COMPANY_MANAGEMENT': [UserRole.SUPERADMIN],
  'PLATFORM_MEMBERS': [UserRole.SUPERADMIN],
  'ACCESS_CONTROL': [UserRole.SUPERADMIN],
  'SYSTEM_LOGS': [UserRole.SUPERADMIN],
  'SQL_CONSOLE': [UserRole.SUPERADMIN],
  'SUBSCRIPTIONS': [UserRole.SUPERADMIN],
  'SECURITY_CENTER': [UserRole.SUPERADMIN],
  'SUPPORT_CENTER': [UserRole.SUPERADMIN],
  'GLOBAL_SETTINGS': [UserRole.SUPERADMIN],

  // Company Admin and above
  'DASHBOARD': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN],
  'PROJECTS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'TASKS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'TEAM': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'TIMESHEETS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'FINANCIALS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.FINANCE],
  'REPORTS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'SCHEDULE': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'COMPLIANCE': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'PROCUREMENT': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'CUSTOM_DASH': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'WORKFORCE': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'INTEGRATIONS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN],
  'SECURITY': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'TENANT_MANAGEMENT': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN],
  'TENANT_ANALYTICS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN],
  'RESOURCE_OPTIMIZATION': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],

  // General user pages
  'LIVE': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'LIVE_PROJECT_MAP': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'PROJECT_LAUNCHPAD': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'PROJECT_DETAILS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'SAFETY': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'EQUIPMENT': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'TEAM_CHAT': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'AI_TOOLS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'ML_INSIGHTS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'CHAT': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'MAP_VIEW': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'CLIENTS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'INVENTORY': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'DAILY_LOGS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],
  'RFI': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR],
  'AUTOMATIONS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'PREDICTIVE_ANALYSIS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],
  'SMART_DOCS': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER],

  // CortexBuild Pages - Public pages (accessible to all including unauthenticated users)
  'CORTEX_BUILD_HOME': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],
  'NEURAL_NETWORK': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],
  'PLATFORM_FEATURES': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],
  'CONNECTIVITY': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],
  'DEVELOPER_PLATFORM': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],

  // Read-only user pages
  'CLIENT_PORTAL': [UserRole.READ_ONLY, UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE],

  // Public Login Page
  'PUBLIC_LOGIN': [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR, UserRole.OPERATIVE, UserRole.READ_ONLY, UserRole.CLIENT],
};

// Function to check if a user role can access a specific page
export const canAccessPage = (userRole: UserRole, page: string): boolean => {
  const allowedRoles = PAGE_ROLES[page];
  
  // If no specific roles defined, assume it's allowed for all authenticated users
  if (!allowedRoles) return true;
  
  // Check if user role is in the allowed roles
  return allowedRoles.includes(userRole);
};

// Function to check if a page is public (doesn't require authentication)
export const isPublicPage = (pathname: string): boolean => {
  // Add any public routes here
  return pathname.startsWith('/client-portal/');
};

// Function to get the appropriate dashboard for a user role
export const getDashboardForRole = (role: UserRole): string => {
  switch (role) {
    case UserRole.SUPERADMIN:
      return 'PLATFORM_DASHBOARD';
    case UserRole.COMPANY_ADMIN:
      return 'DASHBOARD';
    case UserRole.PROJECT_MANAGER:
    case UserRole.SUPERVISOR:
      return 'PROJECTS';
    case UserRole.OPERATIVE:
      return 'LIVE';
    case UserRole.READ_ONLY:
      return 'CLIENT_PORTAL';
    default:
      return 'DASHBOARD';
  }
};
