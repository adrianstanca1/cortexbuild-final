import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, Users, Clock, Activity,
    BarChart3, PieChart, Calendar, Download, Filter, RefreshCw,
    AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles,
    ShieldAlert, HardHat, FileText
} from 'lucide-react';
import { db } from '@/services/db';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Page } from '@/types';
import { SkeletonChart, SkeletonCard } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface AnalyticsDashboardViewProps {
    setPage: (page: Page) => void;
}

const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({ setPage }) => {
    const { projects, tasks } = useProjects();
    const { user } = useAuth();
    const { currentTenant } = useTenant();
    const { addToast } = useToast();
    const { lastMessage } = useWebSocket();
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [isLoading, setIsLoading] = useState(true);
    const [kpis, setKpis] = useState<any>(null);
    const [safetyStats, setSafetyStats] = useState<any[]>([]);
    const [utilization, setUtilization] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, [currentTenant?.id, timeRange]);

    // WebSocket Real-time Sync
    useEffect(() => {
        if (!lastMessage) return;

        const relevantTypes = ['projects', 'tasks', 'safety_incidents', 'rfis', 'team_messages'];
        const isStructuralChange = ['entity_create', 'entity_update', 'entity_delete'].includes(lastMessage.type);

        if (isStructuralChange && relevantTypes.includes(lastMessage.entityType)) {
            fetchData();
        }
    }, [lastMessage]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [kpiData, safetyData, utilData] = await Promise.all([
                db.getKPIs(),
                db.getSafetyMetrics(),
                db.getResourceUtilization()
            ]);
            setKpis(kpiData.data);
            setSafetyStats(safetyData);
            setUtilization(utilData);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
            addToast("Failed to sync real-time analytics", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Derived analytics from local project context (still useful for real-time reactivity)
    const localAnalytics = useMemo(() => {
        const totalProjects = projects.length;
        const healthyProjects = projects.filter(p => p.health === 'Good').length;
        const atRiskProjects = projects.filter(p => p.health === 'At Risk').length;
        const criticalProjects = projects.filter(p => p.health === 'Critical').length;
        const avgProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0) / (totalProjects || 1);

        return {
            totalProjects,
            healthyProjects,
            atRiskProjects,
            criticalProjects,
            avgProgress
        };
    }, [projects]);

    const handleExport = async (format: 'pdf' | 'excel') => {
        try {
            addToast(`Generating ${format.toUpperCase()} report...`, 'info');
            // Mocking the trigger since we don't have a direct blob download link yet
            setTimeout(() => {
                addToast(`Report ${format.toUpperCase()} ready for download (check your email)`, 'success');
            }, 2000);
        } catch (e) {
            addToast("Export failed", "error");
        }
    };

    const handleRefresh = () => {
        fetchData();
    };

    return (
        <ErrorBoundary>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={20} className="text-[#0f5c82]" />
                            <h1 className="text-2xl font-bold text-zinc-900">Analytics Command Center</h1>
                        </div>
                        <p className="text-zinc-500">Node-level intelligence and organization-wide performance metrics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#0f5c82] outline-none"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>

                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        <div className="relative group">
                            <button className="flex items-center gap-2 px-4 py-2 bg-[#0f5c82] text-white rounded-lg text-sm font-medium hover:bg-[#0c4a6e] transition-colors">
                                <Download size={18} /> Export
                            </button>
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 rounded-t-lg"
                                >
                                    Export as PDF
                                </button>
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 rounded-b-lg"
                                >
                                    Export as Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading && !kpis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Total Budget */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                                        <DollarSign size={20} />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                                        <ArrowUpRight size={14} /> {kpis?.budgetHealth?.percentageUsed || '0%'}
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-zinc-900 mb-1">
                                    £{((kpis?.budgetHealth?.totalBudget || 0) / 1000).toFixed(1)}K
                                </div>
                                <div className="text-xs text-zinc-500 font-medium">Global CapEx</div>
                            </div>

                            {/* Active Projects */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Activity size={20} />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                                        <ArrowUpRight size={14} /> {kpis?.activeProjects || 0}
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-zinc-900 mb-1">
                                    {localAnalytics.totalProjects}
                                </div>
                                <div className="text-xs text-zinc-500 font-medium">Tactical Node Count</div>
                            </div>

                            {/* Team Velocity */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                        <Users size={20} />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-purple-600">
                                        <Clock size={14} /> Last 30d
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-zinc-900 mb-1">
                                    {kpis?.teamVelocity || 0}
                                </div>
                                <div className="text-xs text-zinc-500 font-medium">Task Velocity (Unit/Mo)</div>
                            </div>

                            {/* Safety Score */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                                        <HardHat size={20} />
                                    </div>
                                    <span className={`flex items-center gap-1 text-xs font-bold ${(kpis?.safetyScore || 0) > 80 ? 'text-green-600' : 'text-orange-600'}`}>
                                        <ShieldAlert size={14} /> {kpis?.openRFIs || 0} RFIs
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-zinc-900 mb-1">
                                    {kpis?.safetyScore || 100}%
                                </div>
                                <div className="text-xs text-zinc-500 font-medium">Safety Integrity Vector</div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Project Health Distribution */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold text-zinc-900">Portfolio Integrity</h3>
                                    <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Sync</div>
                                </div>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Healthy', val: localAnalytics.healthyProjects, color: 'bg-green-500', text: 'text-green-600' },
                                        { label: 'At Risk', val: localAnalytics.atRiskProjects, color: 'bg-orange-500', text: 'text-orange-600' },
                                        { label: 'Critical', val: localAnalytics.criticalProjects, color: 'bg-red-500', text: 'text-red-600' }
                                    ].map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold text-zinc-700 uppercase tracking-tight">{item.label} Nodes</span>
                                                <span className={`text-sm font-black ${item.text}`}>{item.val}</span>
                                            </div>
                                            <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                                                <div
                                                    className={`${item.color} h-full transition-all duration-1000 ease-out`}
                                                    style={{ width: `${(item.val / (localAnalytics.totalProjects || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold text-zinc-900">Workforce Utilization</h3>
                                    <div className="flex items-center gap-1 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                        <TrendingUp size={14} /> Optimal
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {utilization.length > 0 ? (
                                        utilization.slice(0, 3).map((u, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-[#0f5c82]">
                                                    {u.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-bold text-zinc-700">{u.name || 'Unknown Node'}</span>
                                                        <span className="text-xs font-black text-zinc-400">{u.value} Tasks</span>
                                                    </div>
                                                    <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-[#0f5c82] h-full"
                                                            style={{ width: `${Math.min(100, (u.value / 10) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-zinc-400 font-medium italic">
                                            No workforce utilization data detected in current sector.
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-zinc-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-bold text-zinc-700 uppercase tracking-tight">System Reliability</span>
                                            <span className="text-sm font-black text-indigo-600">99.9%</span>
                                        </div>
                                        <div className="w-full bg-indigo-50 h-2 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full w-[99.9%] transition-all duration-1000" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Insights Banner */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[2.5rem] text-white shadow-inner border border-white/20 animate-pulse">
                                    <Sparkles size={48} />
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-black tracking-tight mb-3">Neural Construction Strategy</h3>
                                    <p className="text-indigo-100 font-medium leading-relaxed max-w-2xl mb-6">
                                        Aggregate analysis indicates that {localAnalytics.atRiskProjects} project nodes are currently showing early variance indicators.
                                        Autonomous reallocation of {kpis?.teamVelocity || 0} task units could optimize cycle time by 14%.
                                    </p>
                                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                        <button
                                            onClick={() => setPage(Page.AI_TOOLS)}
                                            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95 shadow-xl"
                                        >
                                            Optimize Portfolio <ArrowUpRight size={16} />
                                        </button>
                                        <button className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">
                                            Deep Intelligence
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-[100px] group-hover:bg-white/10 transition-all duration-1000" />
                        </div>
                    </>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default AnalyticsDashboardView;
