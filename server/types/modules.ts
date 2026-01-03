/**
 * Company Module System
 * Defines available feature modules that can be enabled/disabled per company
 */

export enum CompanyModule {
    // Core Features (Usually Always Enabled)
    DASHBOARD = 'dashboard',
    USER_MANAGEMENT = 'user_management',

    // Project & Task Management
    PROJECT_MANAGEMENT = 'project_management',
    TASK_TRACKING = 'task_tracking',
    GANTT_CHARTS = 'gantt_charts',

    // Financial Suite
    FINANCIALS = 'financials',
    INVOICING = 'invoicing',
    EXPENSE_TRACKING = 'expense_tracking',

    // Client & Collaboration
    CLIENT_PORTAL = 'client_portal',
    DOCUMENT_SHARING = 'document_sharing',
    MESSAGING = 'messaging',

    // Advanced Features
    AI_TOOLS = 'ai_tools',
    ANALYTICS = 'analytics',
    REPORTING = 'reporting',
    API_ACCESS = 'api_access',
    WEBHOOKS = 'webhooks',

    // Compliance & Security
    AUDIT_LOGS = 'audit_logs',
    COMPLIANCE_TRACKING = 'compliance_tracking',
    TWO_FACTOR_AUTH = 'two_factor_auth',
}

export interface ModuleDefinition {
    id: CompanyModule;
    name: string;
    description: string;
    category: 'core' | 'project' | 'financial' | 'client' | 'advanced' | 'security';
    requiresPlan?: string[]; // e.g., ['Professional', 'Enterprise']
    dependsOn?: CompanyModule[]; // Other modules this depends on
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
    {
        id: CompanyModule.DASHBOARD,
        name: 'Dashboard',
        description: 'Core dashboard and overview',
        category: 'core',
    },
    {
        id: CompanyModule.USER_MANAGEMENT,
        name: 'User Management',
        description: 'Manage team members and permissions',
        category: 'core',
    },
    {
        id: CompanyModule.PROJECT_MANAGEMENT,
        name: 'Project Management',
        description: 'Create and manage projects',
        category: 'project',
    },
    {
        id: CompanyModule.TASK_TRACKING,
        name: 'Task Tracking',
        description: 'Track tasks and to-dos',
        category: 'project',
        dependsOn: [CompanyModule.PROJECT_MANAGEMENT],
    },
    {
        id: CompanyModule.GANTT_CHARTS,
        name: 'Gantt Charts',
        description: 'Visual project timelines',
        category: 'project',
        requiresPlan: ['Professional', 'Enterprise'],
        dependsOn: [CompanyModule.PROJECT_MANAGEMENT],
    },
    {
        id: CompanyModule.FINANCIALS,
        name: 'Financial Management',
        description: 'Track budgets and financial metrics',
        category: 'financial',
    },
    {
        id: CompanyModule.INVOICING,
        name: 'Invoicing',
        description: 'Create and send invoices',
        category: 'financial',
        dependsOn: [CompanyModule.FINANCIALS],
    },
    {
        id: CompanyModule.EXPENSE_TRACKING,
        name: 'Expense Tracking',
        description: 'Log and categorize expenses',
        category: 'financial',
        dependsOn: [CompanyModule.FINANCIALS],
    },
    {
        id: CompanyModule.CLIENT_PORTAL,
        name: 'Client Portal',
        description: 'Secure client access portal',
        category: 'client',
        requiresPlan: ['Professional', 'Enterprise'],
    },
    {
        id: CompanyModule.DOCUMENT_SHARING,
        name: 'Document Sharing',
        description: 'Share files and documents',
        category: 'client',
    },
    {
        id: CompanyModule.MESSAGING,
        name: 'Messaging',
        description: 'Team and client messaging',
        category: 'client',
    },
    {
        id: CompanyModule.AI_TOOLS,
        name: 'AI Tools',
        description: 'AI-powered assistance and automation',
        category: 'advanced',
        requiresPlan: ['Enterprise'],
    },
    {
        id: CompanyModule.ANALYTICS,
        name: 'Analytics',
        description: 'Advanced analytics and insights',
        category: 'advanced',
        requiresPlan: ['Professional', 'Enterprise'],
    },
    {
        id: CompanyModule.REPORTING,
        name: 'Reporting',
        description: 'Generate custom reports',
        category: 'advanced',
    },
    {
        id: CompanyModule.API_ACCESS,
        name: 'API Access',
        description: 'Programmatic API access',
        category: 'advanced',
        requiresPlan: ['Enterprise'],
    },
    {
        id: CompanyModule.WEBHOOKS,
        name: 'Webhooks',
        description: 'Event-driven integrations',
        category: 'advanced',
        requiresPlan: ['Enterprise'],
    },
    {
        id: CompanyModule.AUDIT_LOGS,
        name: 'Audit Logs',
        description: 'Comprehensive activity logging',
        category: 'security',
    },
    {
        id: CompanyModule.COMPLIANCE_TRACKING,
        name: 'Compliance Tracking',
        description: 'Track regulatory compliance',
        category: 'security',
        requiresPlan: ['Professional', 'Enterprise'],
    },
    {
        id: CompanyModule.TWO_FACTOR_AUTH,
        name: 'Two-Factor Authentication',
        description: 'Enhanced account security',
        category: 'security',
    },
];

/**
 * Get default modules for a specific plan
 */
export function getDefaultModulesForPlan(plan: string): CompanyModule[] {
    const planLower = plan.toLowerCase();

    if (planLower.includes('enterprise')) {
        // Enterprise gets everything
        return MODULE_DEFINITIONS.map(m => m.id);
    }

    if (planLower.includes('professional') || planLower.includes('pro')) {
        // Professional gets most things except Enterprise-only features
        return MODULE_DEFINITIONS
            .filter(m => !m.requiresPlan || m.requiresPlan.includes('Professional'))
            .map(m => m.id);
    }

    // Free/Starter gets core + basic features
    return [
        CompanyModule.DASHBOARD,
        CompanyModule.USER_MANAGEMENT,
        CompanyModule.PROJECT_MANAGEMENT,
        CompanyModule.TASK_TRACKING,
        CompanyModule.DOCUMENT_SHARING,
        CompanyModule.MESSAGING,
        CompanyModule.REPORTING,
        CompanyModule.AUDIT_LOGS,
        CompanyModule.TWO_FACTOR_AUTH,
    ];
}

/**
 * Validate module selection based on plan and dependencies
 */
export function validateModuleSelection(
    selectedModules: CompanyModule[],
    plan: string
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const moduleId of selectedModules) {
        const def = MODULE_DEFINITIONS.find(m => m.id === moduleId);
        if (!def) {
            errors.push(`Unknown module: ${moduleId}`);
            continue;
        }

        // Check plan requirements
        if (def.requiresPlan && !def.requiresPlan.some(p => plan.toLowerCase().includes(p.toLowerCase()))) {
            errors.push(`Module "${def.name}" requires plan: ${def.requiresPlan.join(' or ')}`);
        }

        // Check dependencies
        if (def.dependsOn) {
            for (const dep of def.dependsOn) {
                if (!selectedModules.includes(dep)) {
                    const depDef = MODULE_DEFINITIONS.find(m => m.id === dep);
                    errors.push(`Module "${def.name}" depends on "${depDef?.name || dep}"`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
