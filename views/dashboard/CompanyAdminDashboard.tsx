import React, { useState, useEffect } from 'react';
import {
    Activity, Clock, DollarSign, Users, Briefcase, HardHat, CheckSquare,
    TrendingUp, TrendingDown, AlertCircle, Sparkles, Navigation, Plus, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Page, UserRole } from '@/types';
import { db } from '@/services/db';

// Shared Dashboard Components
import { AIDailyBriefing } from '@/components/dashboard/AIDailyBriefing';
import { QuickActionsGrid } from '@/components/dashboard/QuickActions';
import PredictiveInsights from '@/components/PredictiveInsights';
import HighRiskProjectsWidget from '@/components/HighRiskProjectsWidget';
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { TenantUsageWidget } from '@/components/TenantUsageWidget';
import { DynamicDashboardLoader } from '../DynamicDashboardLoader';
import { SkeletonCard } from '@/components/Skeleton';

interface CompanyAdminDashboardProps {
    setPage: (page: Page) => void;
}

export const CompanyAdminDashboard: React.FC<CompanyAdminDashboardProps> = ({ setPage }) => {
    const { user } = useAuth();
    const { projects } = useProjects();
    const { currentTenant } = useTenant();
    const { lastMessage } = useWebSocket();
    const [kpis, setKpis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchKPIs = async () => {
        try {
            const data = await db.getKPIs();
            setKpis(data.data);
        } catch (error) {
            console.error('Failed to fetch KPIs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKPIs();
    }, [currentTenant?.id]);

    // Real-time synchronization
    useEffect(() => {
        if (!lastMessage) return;
        const relevantTypes = ['projects', 'tasks', 'safety_incidents', 'rfis', 'team_messages'];
        if (['entity_create', 'entity_update', 'entity_delete'].includes(lastMessage.type) &&
            relevantTypes.includes(lastMessage.entityType)) {
            fetchKPIs();
        }
    }, [lastMessage]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 bg-zinc-950 text-white min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-sky-400 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-white font-black text-2xl border border-white/10 shadow-2xl relative z-10">
                            {user?.avatarInitials}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-sky-400 font-black uppercase tracking-[0.3em] mb-1">Command & Control</div>
                        <div className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                            Strategic Overview <Activity size={20} className="text-sky-500 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <TenantUsageWidget />
                </div>
            </header>

            <AIDailyBriefing role={UserRole.COMPANY_ADMIN} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign size={64} className="text-sky-400" />
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Capital Velocity</span>
                                <div className="text-4xl font-black text-white tracking-tighter mb-2">
                                    £{((kpis?.budgetHealth?.totalBudget || 0) / 1000000).toFixed(1)}M
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                    <TrendingUp size={14} /> +12.4% <span className="text-zinc-500 font-medium">vs last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={64} className="text-indigo-400" />
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Labour Efficiency</span>
                                <div className="text-4xl font-black text-white tracking-tighter mb-2">
                                    {kpis?.safetyScore || 94}%
                                </div>
                                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                                    <TrendingUp size={14} /> Optimal <span className="text-zinc-500 font-medium">Integrity Matrix</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <QuickActionsGrid setPage={setPage} />

                    {/* Active Nodes Table */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Briefcase size={20} className="text-sky-400" />
                                <h3 className="font-black text-lg tracking-tight">Active Nodes</h3>
                            </div>
                            <button
                                onClick={() => setPage(Page.PROJECTS)}
                                className="text-[10px] font-black text-sky-400 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Access Archive
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/[0.03] text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Node Identity</th>
                                        <th className="px-8 py-4 text-right">Capital Value</th>
                                        <th className="px-8 py-4">Velocity</th>
                                        <th className="px-8 py-4">Integrity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {projects.length > 0 ? projects.map((p, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setPage(Page.PROJECT_DETAILS)}>
                                            <td className="px-8 py-6">
                                                <div className="font-black text-white text-base tracking-tight group-hover:text-sky-400 transition-colors">{p.name}</div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Regional: {currentTenant?.location || 'HQ'}</div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-zinc-300 tracking-tighter text-lg">
                                                £{(p.budget / 1000000).toFixed(1)}M
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-32 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${(p.health || '').toLowerCase() === 'good'
                                                                ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                                                                : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                                                                }`}
                                                            style={{ width: (p.progress || 0) + '%' }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-zinc-400">{p.progress || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${(p.health || '').toLowerCase() === 'good'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    }`}>
                                                    <div className={`w-1 h-1 rounded-full animate-pulse ${(p.health || '').toLowerCase() === 'good' ? 'bg-emerald-400' : 'bg-amber-400'
                                                        }`} />
                                                    {p.health || 'Neutral'}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="text-zinc-500 font-black uppercase text-xs tracking-[0.3em]">No Active Nodes Found</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Intelligent Sidebar */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        {projects.length > 0 && <PredictiveInsights projectId={projects[0].id} />}
                        <HighRiskProjectsWidget />

                        <div className="pt-8 border-t border-white/5">
                            <ActivityFeed limit={5} isDashboard={true} />
                        </div>
                    </div>

                    <DynamicDashboardLoader />
                </div>
            </div>
        </div>
    );
};
