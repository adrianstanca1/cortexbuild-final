import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard, Building2, Users, TrendingUp, AlertCircle,
    DollarSign, Activity, Database, Server, Shield, Power, Sparkles,
    UserCheck, BrainCircuit, RefreshCw, RotateCcw, Megaphone, Settings, X, Calendar, Filter
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

/**
 * PlatformDashboardView
 * Superadmin-only view showing platform-wide metrics and system health
 */
import { db } from '@/services/db';
import { PlatformStats, SystemHealth } from '@/types';

import { Page } from '@/types';

interface PlatformDashboardProps {
    setPage: (page: Page) => void;
}

const PlatformDashboardView: React.FC<PlatformDashboardProps> = ({ setPage }) => {
    const { systemSettings, updateSystemSettings, setBroadcastMessage } = useTenant();
    const { addToast } = useToast();
    const { lastMessage, joinRoom } = useWebSocket();

    // State for real data
    const [statsData, setStatsData] = useState<PlatformStats | null>(null);
    const [healthData, setHealthData] = useState<SystemHealth | null>(null);
    const [advancedMetrics, setAdvancedMetrics] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [localBroadcastMsg, setLocalBroadcastMsg] = useState('');
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceSchedule, setMaintenanceSchedule] = useState({ startTime: '', duration: 60 });
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastTarget, setBroadcastTarget] = useState({ role: 'all', plan: 'all' });

    const refreshData = async () => {
        try {
            const [stats, health, metrics, activity, alertsData, perfHistory] = await Promise.all([
                db.getPlatformStats(),
                db.getSystemHealth(),
                db.getAdvancedMetrics(),
                db.getGlobalAuditLogs({ limit: 10 }), // Replaces getGlobalActivity
                db.getPlatformAlerts(),
                db.getSystemPerformanceHistory()
            ]);
            setStatsData(stats);
            setHealthData(health);
            setAdvancedMetrics(metrics);
            setActivityLogs(activity);
            setAlerts(alertsData);
            setPerformanceHistory(perfHistory);
        } catch (error) {
            console.error('Failed to load platform data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        joinRoom('superadmin_updates'); // Listen for platform-wide events
    }, [joinRoom]);

    // WebSocket Real-time Sync
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'superadmin_update') {
            refreshData();
        }
    }, [lastMessage]);

    const handleToggleSetting = (key: keyof typeof systemSettings) => {
        const newState = !systemSettings[key];
        updateSystemSettings({ [key]: newState });
        addToast(`${key.replace(/([A-Z])/g, ' $1').trim()} ${newState ? 'Enabled' : 'Disabled'}`, 'success');
    };

    const handleBroadcast = async () => {
        if (!localBroadcastMsg.trim()) return;

        try {
            if (broadcastTarget.role === 'all' && broadcastTarget.plan === 'all') {
                setBroadcastMessage(localBroadcastMsg);
                addToast('Global broadcast sent to all active sessions', 'success');
            } else {
                await db.sendTargetedBroadcast(broadcastTarget, localBroadcastMsg);
                addToast(`Broadcast sent to targeting: ${broadcastTarget.role}/${broadcastTarget.plan}`, 'success');
            }
            setLocalBroadcastMsg('');
            setShowBroadcastModal(false);
        } catch (error) {
            addToast('Failed to send broadcast', 'error');
        }
    };

    const handleFlushCache = async () => {
        if (!confirm('Are you sure you want to flush the system cache? This may cause temporary performance degradation.')) return;
        try {
            await db.flushCache();
            addToast('System cache flushed successfully', 'success');
        } catch (error) {
            console.error('Failed to flush cache:', error);
            addToast('Failed to flush cache', 'error');
        }
    };

    const handleRestartServices = async () => {
        if (!confirm('WARNING: This will restart the backend API services. All active connections will be dropped. Continue?')) return;
        try {
            await db.restartServices();
            addToast('Service restart initiated. System will be back in ~10s.', 'warning');
        } catch (error) {
            console.error('Failed to restart services:', error);
            addToast('Failed to restart services', 'error');
        }
    };



    const navigateToTab = (tab: string) => {
        sessionStorage.setItem('admin_active_tab', tab);
        setPage(Page.SQL_CONSOLE);
    };

    const stats = [
        {
            label: 'Total Companies',
            value: statsData?.totalCompanies?.toLocaleString() || '0',
            change: '+12%',
            trend: 'up',
            icon: Building2,
            color: 'blue',
            tab: 'companies'
        },
        {
            label: 'Active Users',
            value: statsData?.totalUsers?.toLocaleString() || '0',
            change: '+5%',
            trend: 'up',
            icon: Users,
            color: 'indigo',
            tab: 'users'
        },
        {
            label: 'System Load',
            value: `${advancedMetrics?.cpuUsage || 0}%`,
            change: '-2%',
            trend: 'down',
            icon: TrendingUp,
            color: 'purple',
            tab: 'health'
        },
        {
            label: 'Monthly Revenue',
            value: `$${((statsData?.monthlyRevenue || 0)).toLocaleString()}`,
            change: '-',
            trend: 'neutral',
            icon: DollarSign,
            color: 'emerald',
            tab: 'analytics'
        },
    ];

    const systemHealth = [
        { name: 'API Server', status: healthData?.api || 'unknown', uptime: `${Math.floor((healthData?.uptime || 0) / 60)}m`, icon: Server, tab: 'api' },
        { name: 'Database', status: healthData?.database || 'unknown', uptime: healthData?.databaseLatency ? `< ${healthData.databaseLatency}` : 'N/A', icon: Database, tab: 'database' },
        { name: 'Auth Service', status: healthData?.auth || 'unknown', uptime: '100%', icon: Shield, tab: 'health' },
        { name: 'File Storage', status: healthData?.storage || 'unknown', uptime: '99.9%', icon: Activity, tab: 'controls' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Platform Dashboard
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        System-wide metrics and health monitoring
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-purple-900 dark:text-purple-300">
                        Superadmin Mode
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            onClick={() => navigateToTab(stat.tab)}
                            className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                </div>
                                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Health
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {systemHealth.map((service) => {
                        const Icon = service.icon;
                        const isHealthy = service.status === 'healthy';
                        return (
                            <div
                                key={service.name}
                                onClick={() => navigateToTab(service.tab)}
                                className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:rotate-12 transition-transform" />
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                        {service.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${isHealthy ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                        {service.status}
                                    </span>
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {service.uptime}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        System Performance (24h)
                    </h2>
                    <div className="flex gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> CPU</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> RAM</div>
                    </div>
                </div>
                <div className="h-48 flex items-end gap-1 px-2">
                    {(performanceHistory || []).length > 0 ? (performanceHistory || []).map((point, idx) => (
                        <div key={point.timestamp || idx} className="flex-1 flex flex-col gap-0.5 group relative h-full justify-end">
                            <div
                                className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors rounded-t-sm"
                                style={{ height: `${point.ram}%` }}
                            ></div>
                            <div
                                className="w-full bg-indigo-500/40 group-hover:bg-indigo-500/60 transition-colors rounded-t-sm"
                                style={{ height: `${point.cpu}%` }}
                            ></div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                <p className="font-bold">{new Date(point.timestamp).getHours()}:00</p>
                                <p>CPU: {(point.cpu || 0).toFixed(1)}%</p>
                                <p>RAM: {(point.ram || 0).toFixed(1)}%</p>
                                <p>Lat: {(point.latency || 0).toFixed(0)}ms</p>
                            </div>
                        </div>
                    )) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm italic">Loading performance data...</div>
                    )}
                </div>
                <div className="flex justify-between mt-2 px-2 text-[10px] text-zinc-400 font-medium">
                    <span>24h ago</span>
                    <span>12h ago</span>
                    <span>Now</span>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Activity
                </h2>
                <div className="space-y-3">
                    {[
                        { company: 'Acme Construction', action: 'New project created', time: '5 min ago' },
                        { company: 'BuildCo Ltd', action: 'User invited', time: '12 min ago' },
                        { company: 'ProBuild Inc', action: 'Subscription upgraded', time: '1 hour ago' },
                        { company: 'MegaConstruct', action: 'Document uploaded', time: '2 hours ago' },
                    ].map((activity, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-zinc-400" />
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-white">
                                        {activity.company}
                                    </p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {activity.action}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm text-zinc-500">
                                {activity.time}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Control Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5"><Settings size={80} /></div>
                    <h3 className="font-bold text-zinc-800 dark:text-white mb-6 flex items-center gap-2 relative z-10">
                        <Server size={18} className="text-purple-600" /> System Control
                    </h3>
                    <div className="space-y-4 relative z-10">
                        {/* Control Toggles */}
                        {[
                            { key: 'maintenance', label: 'Maintenance Mode', icon: Power, onColor: 'bg-red-500', offColor: 'bg-zinc-300 dark:bg-zinc-600', iconColor: 'text-red-600', iconBg: 'bg-red-100 dark:bg-red-900/20', isSpecial: true },
                            { key: 'betaFeatures', label: 'Global Beta Access', icon: Sparkles, onColor: 'bg-emerald-500', offColor: 'bg-zinc-300 dark:bg-zinc-600', iconColor: 'text-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-900/20' },
                            { key: 'registrations', label: 'New Registrations', icon: UserCheck, onColor: 'bg-emerald-500', offColor: 'bg-zinc-300 dark:bg-zinc-600', iconColor: 'text-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/20' },
                            { key: 'aiEngine', label: 'AI Inference Engine', icon: BrainCircuit, onColor: 'bg-indigo-500', offColor: 'bg-zinc-300 dark:bg-zinc-600', iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100 dark:bg-indigo-900/20' },
                        ].map((ctrl) => (
                            <div key={ctrl.key} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:border-zinc-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${ctrl.iconBg}`}>
                                        <ctrl.icon size={16} className={ctrl.iconColor} />
                                    </div>
                                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{ctrl.label}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {ctrl.isSpecial && (
                                        <button
                                            onClick={() => setShowMaintenanceModal(true)}
                                            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 underline"
                                        >
                                            Schedule
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleToggleSetting(ctrl.key as any)}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${systemSettings[ctrl.key as keyof typeof systemSettings] ? ctrl.onColor : ctrl.offColor}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${systemSettings[ctrl.key as keyof typeof systemSettings] ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex gap-3 relative z-10">
                        <button
                            onClick={handleFlushCache}
                            className="flex-1 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-600"
                        >
                            <RefreshCw size={14} /> Flush Cache
                        </button>
                        <button
                            onClick={handleRestartServices}
                            className="flex-1 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
                        >
                            <RotateCcw size={14} /> Restart
                        </button>
                    </div>
                </div>

                {/* Enhanced Broadcast Widget */}
                <div className="lg:col-span-1 bg-gradient-to-br from-[#0f5c82] to-[#0c4a6e] rounded-xl shadow-lg p-6 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <h3 className="font-bold mb-3 flex items-center gap-2 relative z-10">
                        <Megaphone size={18} className="text-yellow-400" /> Global Broadcast
                    </h3>
                    <div className="relative z-10 h-full flex flex-col">
                        <textarea
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/30 resize-none h-32 mb-3"
                            placeholder="Type system-wide announcement..."
                            value={localBroadcastMsg}
                            onChange={e => setLocalBroadcastMsg(e.target.value)}
                        />
                        <div className="flex flex-col gap-3 mt-auto">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs text-blue-200 cursor-pointer hover:text-white transition-colors">
                                    <input type="checkbox" className="rounded text-blue-500 focus:ring-0 bg-white/10 border-white/20" />
                                    Urgent Alert
                                </label>
                                <button
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="text-[10px] font-bold text-blue-300 hover:text-white flex items-center gap-1"
                                >
                                    Targeting Filters <Filter size={10} />
                                </button>
                            </div>
                            <button
                                disabled={!localBroadcastMsg.trim()}
                                onClick={handleBroadcast}
                                className="w-full bg-white text-[#0f5c82] px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                Send {broadcastTarget.role === 'all' && broadcastTarget.plan === 'all' ? 'Global' : 'Targeted'} Broadcast
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Targeted Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="bg-[#0f5c82] p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Broadcast Targeting
                            </h3>
                            <button onClick={() => setShowBroadcastModal(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Roles</label>
                                <select
                                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    value={broadcastTarget.role}
                                    onChange={e => setBroadcastTarget(prev => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="all">Everywhere (All Users)</option>
                                    <option value="SUPERADMIN">SuperAdmins Only</option>
                                    <option value="COMPANY_ADMIN">Company Admins Only</option>
                                    <option value="PROJECT_MANAGER">Project Managers Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Plans</label>
                                <select
                                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    value={broadcastTarget.plan}
                                    onChange={e => setBroadcastTarget(prev => ({ ...prev, plan: e.target.value }))}
                                >
                                    <option value="all">All Plans</option>
                                    <option value="Enterprise">Enterprise Tenants</option>
                                    <option value="Business">Business Tenants</option>
                                    <option value="Starter">Starter Tenants</option>
                                </select>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                                    <span className="font-bold">Summary:</span> This message will be visible to users matching <span className="underline">{broadcastTarget.role}</span> roles within <span className="underline">{broadcastTarget.plan}</span> tiered companies.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowBroadcastModal(false)}
                                className="w-full py-3 bg-[#0f5c82] hover:bg-[#0c4a6e] text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* System Alerts */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    System Alerts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activityLogs || []).filter(a => a.type === 'alert' || a.severity === 'high').length > 0 ? (
                        (activityLogs || []).filter(a => a.type === 'alert' || a.severity === 'high').map((alert, idx) => (
                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                }`}>
                                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' : 'text-blue-600'}`} />
                                <div>
                                    <p className={`font-medium ${alert.severity === 'high' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'}`}>
                                        {alert.title || alert.message}
                                    </p>
                                    <p className={`text-sm mt-1 ${alert.severity === 'high' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                        {alert.description || alert.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        (alerts || []).length > 0 ? (alerts || []).map((alert, idx) => (
                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                }`}>
                                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' : 'text-blue-600'}`} />
                                <div>
                                    <p className={`font-medium ${alert.severity === 'high' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'}`}>
                                        {alert.message}
                                    </p>
                                    <p className={`text-sm mt-1 ${alert.severity === 'high' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                        Detected at {new Date(alert.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-2 text-center py-4 text-zinc-500 italic">No active system alerts</div>
                        )
                    )}
                </div>
            </div>

            {/* Maintenance Modal */}
            {showMaintenanceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="bg-zinc-900 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                Schedule Maintenance
                            </h3>
                            <button onClick={() => setShowMaintenanceModal(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Start Time</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    value={maintenanceSchedule.startTime}
                                    onChange={e => setMaintenanceSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Duration (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    value={maintenanceSchedule.duration}
                                    onChange={e => setMaintenanceSchedule(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await db.scheduleMaintenance(maintenanceSchedule.startTime, maintenanceSchedule.duration);
                                        addToast('Maintenance window scheduled successfully', 'success');
                                        setShowMaintenanceModal(false);
                                    } catch (e) {
                                        addToast('Failed to schedule maintenance', 'error');
                                    }
                                }}
                                disabled={!maintenanceSchedule.startTime}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                Schedule Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformDashboardView;
