import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';

/**
 * Company Module System - Frontend Types
 */
export enum CompanyModule {
    DASHBOARD = 'dashboard',
    USER_MANAGEMENT = 'user_management',
    PROJECT_MANAGEMENT = 'project_management',
    TASK_TRACKING = 'task_tracking',
    GANTT_CHARTS = 'gantt_charts',
    FINANCIALS = 'financials',
    INVOICING = 'invoicing',
    EXPENSE_TRACKING = 'expense_tracking',
    CLIENT_PORTAL = 'client_portal',
    DOCUMENT_SHARING = 'document_sharing',
    MESSAGING = 'messaging',
    AI_TOOLS = 'ai_tools',
    ANALYTICS = 'analytics',
    REPORTING = 'reporting',
    API_ACCESS = 'api_access',
    WEBHOOKS = 'webhooks',
    AUDIT_LOGS = 'audit_logs',
    COMPLIANCE_TRACKING = 'compliance_tracking',
    TWO_FACTOR_AUTH = 'two_factor_auth',
}

interface ModuleContextType {
    enabledModules: CompanyModule[];
    isLoading: boolean;
    hasModule: (module: CompanyModule) => boolean;
    hasAllModules: (...modules: CompanyModule[]) => boolean;
    hasAnyModule: (...modules: CompanyModule[]) => boolean;
    refreshModules: () => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType>({
    enabledModules: [],
    isLoading: true,
    hasModule: () => false,
    hasAllModules: () => false,
    hasAnyModule: () => false,
    refreshModules: async () => { },
});

export const useModules = () => useContext(ModuleContext);

/**
 * Check if a single module is enabled
 */
export function useModule(module: CompanyModule): boolean {
    const { hasModule } = useModules();
    return hasModule(module);
}

/**
 * Require a module - returns loading state and enabled state
 */
export function useRequireModule(module: CompanyModule): { isLoading: boolean; isEnabled: boolean } {
    const { isLoading, hasModule } = useModules();
    return { isLoading, isEnabled: hasModule(module) };
}

interface ModuleProviderProps {
    children: React.ReactNode;
    companyId?: string;
}

export const ModuleProvider: React.FC<ModuleProviderProps> = ({ children, companyId }) => {
    const [enabledModules, setEnabledModules] = useState<CompanyModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchModules = useCallback(async () => {
        if (!companyId) {
            setEnabledModules([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await db.getCompanyModules();
            if (response?.enabledModules) {
                setEnabledModules(response.enabledModules as CompanyModule[]);
            }
        } catch (error) {
            console.error('Failed to fetch company modules:', error);
            // Default to basic modules on error
            setEnabledModules([
                CompanyModule.DASHBOARD,
                CompanyModule.USER_MANAGEMENT,
                CompanyModule.PROJECT_MANAGEMENT,
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const hasModule = useCallback((module: CompanyModule): boolean => {
        return enabledModules.includes(module);
    }, [enabledModules]);

    const hasAllModules = useCallback((...modules: CompanyModule[]): boolean => {
        return modules.every(m => enabledModules.includes(m));
    }, [enabledModules]);

    const hasAnyModule = useCallback((...modules: CompanyModule[]): boolean => {
        return modules.some(m => enabledModules.includes(m));
    }, [enabledModules]);

    const value: ModuleContextType = {
        enabledModules,
        isLoading,
        hasModule,
        hasAllModules,
        hasAnyModule,
        refreshModules: fetchModules,
    };

    return (
        <ModuleContext.Provider value={value}>
            {children}
        </ModuleContext.Provider>
    );
};

/**
 * HOC to protect a component with module requirement
 */
export function withModuleAccess<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    requiredModule: CompanyModule,
    fallback?: React.ReactNode
) {
    return function ModuleProtectedComponent(props: P) {
        const { isLoading, hasModule } = useModules();

        if (isLoading) {
            return <div className="flex items-center justify-center p-8">Loading...</div>;
        }

        if (!hasModule(requiredModule)) {
            return fallback || (
                <div className="p-8 text-center">
                    <h2 className="text-xl font-semibold text-gray-700">Feature Not Available</h2>
                    <p className="text-gray-500 mt-2">This feature is not enabled for your company.</p>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
}

export default ModuleContext;
