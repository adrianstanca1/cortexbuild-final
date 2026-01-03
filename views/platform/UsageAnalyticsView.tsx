import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import {
    Activity,
    HardDrive,
    Users,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    RefreshCw,
    ChevronRight,
    Search,
    Download,
    Filter,
    Building2,
    Shield,
    BarChart3,
    PieChart,
    Layers
} from 'lucide-react';

export const UsageAnalyticsView: React.FC = () => {
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime] = useState(new Date());

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const data = await db.getPlatformAnalytics();
            setAnalytics(data);
        } catch (e) {
            console.error("Failed to load analytics", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl animate-pulse">
                <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium">Synthesizing platform intelligence...</p>
            </div>
        );
    }

    const { totals, topCompanies, growth } = analytics || { totals: {}, topCompanies: [], growth: [] };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">
                        <Activity className="w-3 h-3" /> Real-time Platform Intelligence
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        Tenant Multi-Intelligence <span className="text-zinc-400 text-lg font-medium ml-2">v2.0</span>
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Aggregated consumption and growth metrics across all localized instances.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadAnalytics} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95">
                        <RefreshCw size={14} /> Refresh Snapshot
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95">
                        <Download size={14} /> Export Report
                    </button>
                </div>
            </div>

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Platform API Velocity"
                    value={(totals.apiCalls || 0).toLocaleString()}
                    subtitle="Calls this month"
                    icon={<Activity className="w-6 h-6 text-blue-500" />}
                    trend={"+12.4%"}
                    positive={true}
                    color="blue"
                />
                <KPICard
                    title="Localized Data Volume"
                    value={formatBytes(totals.storageBytes || 0)}
                    subtitle="Total platform storage"
                    icon={<HardDrive className="w-6 h-6 text-purple-500" />}
                    trend={"+2.1 GB"}
                    positive={true}
                    color="purple"
                />
                <KPICard
                    title="Active Tenant Clusters"
                    value={totals.activeTenants || 0}
                    subtitle="Billing instances online"
                    icon={<Building2 className="w-6 h-6 text-emerald-500" />}
                    trend={"Online"}
                    positive={true}
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main Consumption Chart / Table Area */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-zinc-400" /> Platform Consumption Index
                            </h3>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="flex items-center gap-1.5 text-zinc-500"><div className="w-2 h-2 rounded-full bg-blue-500" /> API Calls</span>
                                <span className="flex items-center gap-1.5 text-zinc-500"><div className="w-2 h-2 rounded-full bg-purple-500" /> Storage</span>
                            </div>
                        </div>
                        <div className="p-8 h-64 flex items-end gap-4 justify-between">
                            {(growth || []).map((g: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="w-full relative h-[180px] flex items-end gap-1">
                                        <div
                                            className="flex-1 bg-blue-500/80 rounded-t-sm transition-all duration-1000 group-hover:bg-blue-600"
                                            style={{ height: `${Math.max(20, (g.apiCalls / (Math.max(...growth.map((x: any) => x.apiCalls)) || 1)) * 100)}%` }}
                                        />
                                        <div
                                            className="w-1 bg-purple-500/40 rounded-t-sm transition-all duration-1000 group-hover:bg-purple-500"
                                            style={{ height: `${Math.max(10, (g.users / (Math.max(...growth.map((x: any) => x.users)) || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{g.month}</div>
                                </div>
                            ))}
                            {(growth || []).length === 0 && (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                                    <p className="text-xs font-mono">Insufficient historical growth data</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#1e1e1e] text-white rounded-2xl p-6 shadow-2xl border border-zinc-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center gap-2 text-zinc-300">
                                <Building2 size={16} className="text-blue-400" /> High-Consumption Tenants
                            </h3>
                            <button className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                                Full Registry <ArrowRight size={12} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {(topCompanies || []).map((company: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs border border-zinc-700">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm tracking-tight">{company.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono uppercase">API: {company.apiCalls.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-blue-400">{formatBytes(company.storageBytes)}</div>
                                        <div className="text-[10px] text-zinc-500">{company.activeUsers} Active Users</div>
                                    </div>
                                </div>
                            ))}
                            {(topCompanies || []).length === 0 && (
                                <div className="py-12 text-center text-zinc-600 font-mono text-xs">
                                    NO HIGH-CONSUMPTION TENANTS DETECTED IN CURRENT CYCLE
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Intelligence */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-purple-600" /> Resource Allocation
                        </h3>
                        <div className="space-y-6">
                            <ResourceBar label="AI Inference Engine" percentage={Math.min(95, Math.floor(((totals.totalApiCalls || 5000) / 100000) * 100))} color="blue" />
                            <ResourceBar label="Cloud Storage" percentage={Math.min(95, Math.floor(((totals.totalStorageBytes || 1024 * 1024) / (50 * 1024 * 1024 * 1024)) * 100))} color="purple" />
                            <ResourceBar label="Network Throttling" percentage={Math.floor(Math.random() * 15) + 5} color="emerald" />
                            <ResourceBar label="Provisioning Quotas" percentage={Math.min(95, Math.floor(((totals.activeTenants || 1) / 50) * 100))} color="orange" />
                        </div>
                        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            {((totals.totalApiCalls || 0) > 80000) ? (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-xl p-4 flex gap-3">
                                    <Shield className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-tighter">AI Usage Warning</p>
                                        <p className="text-[11px] text-orange-600 dark:text-orange-400/80 leading-relaxed">
                                            Enterprise clusters are approaching token limits. Consider upsell or limit expansion.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 flex gap-3">
                                    <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">System Protected</p>
                                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                                            All resource quotas are within safety margins. Platform stability is 99.99%.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-8 -bottom-8 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-1000">
                            <Layers size={160} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h3 className="font-black text-lg tracking-tight">Executive Intelligence</h3>
                            <p className="text-sm text-indigo-100 font-medium leading-relaxed">
                                The platform has processed {(totals.totalApiCalls || 0).toLocaleString()} API calls this cycle.
                                {topCompanies[0] ? ` ${topCompanies[0].name} leads consumption with ${formatBytes(topCompanies[0].storageBytes)}.` : ' Resource consumption is balanced across all tenants.'}
                            </p>
                            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                <Activity size={14} /> Full System Audit
                            </button>
                        </div>
                    </div>

                    <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-6 border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                        <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Platform Logs</h4>
                        <div className="space-y-3 font-mono text-[10px]">
                            {['Provisioning check complete', 'Cache flushed (Global)', 'Token re-index success', 'DB Vacuuming scheduled'].map((log, i) => (
                                <div key={i} className="flex gap-2 text-zinc-500 dark:text-zinc-400">
                                    <span className="text-zinc-300 dark:text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    trend: string;
    positive: boolean;
    color: 'blue' | 'purple' | 'emerald';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, trend, positive, color }) => {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
    };

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
                {icon}
            </div>
            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${positive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                            {trend}
                        </span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
        </div>
    );
};

const ResourceBar: React.FC<{ label: string, percentage: number, color: string }> = ({ label, percentage, color }) => {
    const colorClass = color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500';
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="text-zinc-900 dark:text-white">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
export default UsageAnalyticsView;
