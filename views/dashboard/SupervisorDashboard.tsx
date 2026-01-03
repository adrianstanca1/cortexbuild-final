import React from 'react';
import {
    Plus, Navigation, ArrowRight, Shield, Video, Aperture, Briefcase, Zap, HelpCircle, Users, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Page, UserRole } from '@/types';

// Shared Dashboard Components
import { AIDailyBriefing } from '@/components/dashboard/AIDailyBriefing';
import { QuickActionsGrid } from '@/components/dashboard/QuickActions';
import { FieldCard } from '@/components/dashboard/FieldCard';
import PredictiveInsights from '@/components/PredictiveInsights';
import { ActiveTeamWidget } from '@/components/ActiveTeamWidget';

interface SupervisorDashboardProps {
    setPage: (page: Page) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ setPage }) => {
    const { user } = useAuth();
    const { projects } = useProjects();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 bg-zinc-950 text-white min-h-screen">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-sky-400 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white font-black text-xl border border-white/20 shadow-2xl relative z-10 transform transition-transform group-hover:scale-105">
                            {user?.avatarInitials}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-sky-400 font-black uppercase tracking-[0.3em] mb-1">Site Command</div>
                        <div className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                            Active Operations <Navigation size={18} className="text-sky-500 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                        <Zap size={20} className="text-amber-400" />
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                        <HelpCircle size={20} className="text-sky-400" />
                    </button>
                </div>
            </header>

            <AIDailyBriefing role={UserRole.SUPERVISOR} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <FieldCard
                    title="Site Daily Logs"
                    icon={Shield}
                    onClick={() => setPage(Page.DAILY_LOGS)}
                    addAction={() => setPage(Page.DAILY_LOGS)}
                />
                <FieldCard
                    title="Neural Safety Scan"
                    icon={Aperture}
                    onClick={() => setPage(Page.SAFETY)}
                    addAction={() => setPage(Page.SAFETY)}
                />
                <FieldCard
                    title="Live Site Feed"
                    icon={Video}
                    onClick={() => setPage(Page.LIVE)}
                />
                <FieldCard
                    title="RFI Management"
                    icon={Briefcase}
                    onClick={() => setPage(Page.RFI)}
                    addAction={() => setPage(Page.RFI)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <QuickActionsGrid setPage={setPage} />

                    {/* Approval Queue */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-400" /> Approval Queue
                            </h3>
                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black">3 Pending</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">JD</div>
                                    <div>
                                        <div className="font-bold text-white">John Doe</div>
                                        <div className="text-xs text-zinc-400">Time Card correction</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><CheckCircle2 size={16} /></button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-xs">JS</div>
                                    <div>
                                        <div className="font-bold text-white">Jane Smith</div>
                                        <div className="text-xs text-zinc-400">Expense: Materials</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><CheckCircle2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                                <Users size={20} className="text-sky-400" /> Active Deployment
                            </h3>
                            <button className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">Manage Team</button>
                        </div>
                        <ActiveTeamWidget />
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                    {projects.length > 0 && (
                        <div className="w-full">
                            <PredictiveInsights projectId={projects[0].id} />
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-[#0f5c82] to-indigo-900 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-white mb-4 tracking-tighter">Field Intelligence</h3>
                        <p className="text-white/60 text-xs font-medium leading-relaxed mb-6">
                            Autonomous node tracking active. 5 safety anomalies detected in sector 7G.
                        </p>
                        <button
                            onClick={() => setPage(Page.SAFETY)}
                            className="w-full py-4 bg-white text-[#0f5c82] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
                        >
                            Commencing Safety Protocol <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
