import React, { useState, useEffect } from 'react';
import {
    Terminal, Database, Server, Shield,
    Activity, Command,
    BarChart3,
    FileText, Settings, Building, Plus,
    Users, Ban, UserCheck, LogIn, RefreshCw, Layers, Lock, Edit2, Key
} from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tenant } from '@/types';
import { UsageAnalyticsView } from './UsageAnalyticsView';
import { AdminDatabaseManager } from './components/AdminDatabaseManager';
import { AdminApiManager } from './components/AdminApiManager';
import { AdminSqlRunner } from './components/AdminSqlRunner';
import { AdminHealthMonitor } from './components/AdminHealthMonitor';
import { AdminPlatformControls } from './components/AdminPlatformControls';

const SuperAdminCommandCenter: React.FC = () => {
    const { addToast } = useToast();
    const { impersonateUser, user } = useAuth();

    // Initialize from sessionStorage if exists
    const [activeTab, setActiveTab] = useState<'sql' | 'health' | 'controls' | 'analytics' | 'database' | 'api'>(() => {
        const saved = sessionStorage.getItem('admin_active_tab');
        return (saved as any) || 'analytics';
    });

    // Update sessionStorage when tab changes
    useEffect(() => {
        sessionStorage.setItem('admin_active_tab', activeTab);
    }, [activeTab]);

    // Check for external navigation updates
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = sessionStorage.getItem('admin_active_tab');
            if (saved && saved !== activeTab) {
                setActiveTab(saved as any);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [activeTab]);





    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Command className="w-8 h-8 text-red-600" />
                        Command Center
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Advanced system diagnostics and direct controls
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-bold rounded-full border border-red-200 dark:border-red-800 flex items-center gap-2">
                        <Shield size={12} /> RESTRICTED ACCESS
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-2">
                    <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'analytics' ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <BarChart3 size={20} className={activeTab === 'analytics' ? 'text-blue-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">Platform Analytics</p><p className="text-xs opacity-70">Consumption & Growth</p></div>
                    </button>
                    <button onClick={() => setActiveTab('sql')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'sql' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Database size={20} className={activeTab === 'sql' ? 'text-emerald-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">SQL Runner</p><p className="text-xs opacity-70">Direct DB Execution</p></div>
                    </button>
                    <button onClick={() => setActiveTab('health')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'health' ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Activity size={20} className={activeTab === 'health' ? 'text-blue-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">System Health</p><p className="text-xs opacity-70">Metrics & Performance</p></div>
                    </button>
                    <button onClick={() => setActiveTab('controls')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'controls' ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Settings size={20} className={activeTab === 'controls' ? 'text-purple-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">System Controls</p><p className="text-xs opacity-70">Maintenance & Utils</p></div>
                    </button>
                    <button onClick={() => setActiveTab('database')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'database' ? 'bg-cyan-50 border-cyan-200 text-cyan-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Database size={20} className={activeTab === 'database' ? 'text-cyan-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">Database Management</p><p className="text-xs opacity-70">Backups & Maintenance</p></div>
                    </button>
                    <button onClick={() => setActiveTab('api')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === 'api' ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Key size={20} className={activeTab === 'api' ? 'text-blue-600' : 'text-gray-500'} />
                        <div className="text-left"><p className="font-bold">API & Webhooks</p><p className="text-xs opacity-70">External Integrations</p></div>
                    </button>
                </div>

                <div className="lg:col-span-3">
                    {activeTab === 'analytics' && <UsageAnalyticsView />}
                    {activeTab === 'sql' && <AdminSqlRunner />}
                    {activeTab === 'health' && <AdminHealthMonitor />}
                    {activeTab === 'database' && <AdminDatabaseManager />}
                    {activeTab === 'api' && <AdminApiManager />}
                    {activeTab === 'controls' && <AdminPlatformControls />}

                </div>
            </div>
        </div>
    );
};

export default SuperAdminCommandCenter;
