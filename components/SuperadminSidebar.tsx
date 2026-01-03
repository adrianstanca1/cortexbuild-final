import React from 'react';
import {
    LayoutDashboard, Building2, Users, Shield, FileText, Settings,
    LogOut, ChevronRight, CreditCard, Lock, LifeBuoy, Zap, Terminal,
    BarChart3, Workflow, Share2
} from 'lucide-react';
import { Page } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface SuperadminSidebarProps {
    currentPage: Page;
    setPage: (page: Page) => void;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * SuperadminSidebar
 * Platform-only navigation for Superadmin users
 * NO tenant-level operations (projects, tasks, etc.)
 */
const SuperadminSidebar: React.FC<SuperadminSidebarProps> = ({
    currentPage,
    setPage,
    isOpen,
    onClose,
}) => {
    const { logout, user } = useAuth();

    const platformMenu = [
        ...(user ? [] : [{ // Only show login option if user is not authenticated
            icon: LayoutDashboard,
            label: 'Login',
            page: Page.PUBLIC_LOGIN,
        }]),
        {
            icon: LayoutDashboard,
            label: 'Platform Dashboard',
            page: Page.PLATFORM_DASHBOARD,
        },
        {
            icon: Building2,
            label: 'Companies',
            page: Page.COMPANY_MANAGEMENT,
        },
        {
            icon: Users,
            label: 'Members',
            page: Page.PLATFORM_MEMBERS,
        },
        {
            icon: Shield,
            label: 'Access Control',
            page: Page.ACCESS_CONTROL,
        },
        {
            icon: Zap,
            label: 'System Alerts',
            page: Page.PLATFORM_NOTIFICATIONS,
        },
        {
            icon: FileText,
            label: 'System Logs',
            page: Page.SYSTEM_LOGS,
        },
        {
            icon: BarChart3,
            label: 'Usage Analytics',
            page: Page.USAGE_ANALYTICS,
        },
        {
            icon: Workflow,
            label: 'Platform Automation',
            page: Page.AUTOMATION,
        },
        {
            icon: Share2,
            label: 'Export Center',
            page: Page.EXPORT_CENTER,
        },
        {
            icon: Terminal,
            label: 'Command Center',
            page: Page.SQL_CONSOLE,
        },
        {
            icon: Lock,
            label: 'Security Center',
            page: Page.SECURITY_CENTER,
        },
        {
            icon: LifeBuoy,
            label: 'Support Center',
            page: Page.SUPPORT_CENTER,
        },
        {
            icon: Settings,
            label: 'Platform Settings',
            page: Page.GLOBAL_SETTINGS,
        },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-gradient-to-b from-purple-900 to-indigo-900 text-white flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                            setPage(Page.PLATFORM_DASHBOARD);
                            if (onClose) onClose();
                        }}
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">CortexBuild Pro</h1>
                            <p className="text-xs text-purple-200">Platform Admin</p>
                        </div>
                    </div>
                </div>

                {/* Platform Mode Indicator */}
                <div className="px-4 py-3 bg-purple-800/50 border-y border-white/10">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-200" />
                        <span className="text-sm font-medium text-purple-100">
                            Superadmin Mode
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 space-y-1">
                        {platformMenu.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.page;

                            return (
                                <button
                                    key={item.page}
                                    onClick={() => {
                                        setPage(item.page);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                        ? 'bg-white/20 text-white shadow-lg'
                                        : 'text-purple-100 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="flex-1 text-left text-sm font-medium">
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => {
                            logout();
                            setPage(Page.LOGIN);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-purple-100 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SuperadminSidebar;
