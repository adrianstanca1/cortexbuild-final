import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock, CheckSquare, CheckCircle2, Link
} from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/db';
import { Page, UserRole } from '@/types';
import { AIDailyBriefing } from '@/components/dashboard/AIDailyBriefing';

interface OperativeDashboardProps {
    setPage: (page: Page) => void;
}

export const OperativeDashboard: React.FC<OperativeDashboardProps> = ({ setPage }) => {
    const { tasks } = useProjects();
    const { user } = useAuth();
    const [clockStatus, setClockStatus] = useState({ isClockedIn: false, startTime: '' });

    useEffect(() => {
        if (!user) return;
        db.getTimesheets().then(sheets => {
            const today = new Date().toISOString().split('T')[0];
            const myToday = sheets.find(s => s.userId === user.id && s.date === today && s.status === 'Active');
            if (myToday) {
                setClockStatus({ isClockedIn: true, startTime: myToday.startTime });
            }
        });
    }, [user]);

    const myTasks = useMemo(() => {
        if (!user) return [];
        return tasks.filter(t => {
            if (t.status === 'Done') return false;
            if (t.assigneeType === 'role') {
                if (user.role === UserRole.SUPERADMIN && t.assigneeName === 'Operative') return true;
                if (user.role === UserRole.OPERATIVE && t.assigneeName === 'Operative') return true;
            }
            if (t.assigneeType === 'user' && t.assigneeName === user.name) return true;
            return false;
        });
    }, [tasks, user]);

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10 bg-zinc-950 text-white min-h-screen">
            <header className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Field Operative Node</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">Worker Portal</h1>
                <p className="text-zinc-500 font-medium text-lg mt-1 tracking-tight">Active protocols for {user?.name.split(' ')[0]}.</p>
            </header>

            <AIDailyBriefing role={UserRole.OPERATIVE} />

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-30" />
                <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Pulse Integrity</div>
                <div className={`text-5xl font-black ${clockStatus.isClockedIn ? 'text-emerald-400' : 'text-zinc-400'} mb-2 tracking-tighter`}>
                    {clockStatus.isClockedIn ? 'Clocked In' : 'Off Clock'}
                </div>
                <div className="text-zinc-400 font-bold text-sm mb-10 tracking-tight">
                    {clockStatus.isClockedIn ? `Active since ${clockStatus.startTime} (GMT)` : 'No active session detected.'}
                </div>

                <div className="flex gap-6 w-full max-w-md">
                    <button className={`flex-1 ${clockStatus.isClockedIn ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'} py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all border border-current text-xs shadow-lg`}>
                        {clockStatus.isClockedIn ? 'Clock Out' : 'Clock In'}
                    </button>
                    <button className="flex-1 bg-white/5 text-zinc-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 text-xs">
                        Interval / Break
                    </button>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setPage(Page.DAILY_LOGS)} className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-white/10 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <CheckSquare size={24} />
                    </div>
                    <span className="font-black text-white tracking-tight">Daily Log</span>
                </button>
                <button onClick={() => setPage(Page.RFI)} className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-white/10 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                        <Link size={24} />
                    </div>
                    <span className="font-black text-white tracking-tight">Raise RFI</span>
                </button>
            </div>

            {/* Assigned Tasks */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckSquare size={20} className="text-sky-400" />
                        <h3 className="font-black text-lg text-white tracking-tight">Assigned Protocols ({myTasks.length})</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {myTasks.length > 0 ? myTasks.map((task) => (
                        <div key={task.id} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 hover:border-sky-400/30 transition-all group shadow-xl">
                            <div className="flex items-center gap-5">
                                <button className="w-8 h-8 rounded-xl border-2 border-white/10 group-hover:border-sky-400 flex items-center justify-center text-transparent group-hover:text-sky-400 transition-all bg-white/5 shadow-inner">
                                    <CheckCircle2 size={16} />
                                </button>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="font-black text-white text-lg tracking-tight group-hover:text-sky-400 transition-colors">{task.title}</div>
                                        {task.assigneeType === 'role' && (
                                            <span className="text-[9px] bg-sky-500/20 text-sky-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-sky-500/10">
                                                {task.assigneeName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
                                                <Clock size={14} className="text-sky-400" /> Due {task.dueDate}
                                            </div>
                                            {task.dependencies && task.dependencies.length > 0 && (
                                                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                                    <Link size={12} className="text-indigo-400" />
                                                    {task.dependencies.length} Chains
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white/5 border border-dashed border-white/10 p-12 rounded-[2rem] text-center text-zinc-500 font-bold italic">
                            No assignment vectors detected for current shift.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
