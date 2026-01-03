import React, { useMemo } from 'react';
import {
    Users,
    Box,
    AlertTriangle,
    Activity,
    TrendingUp,
    Calendar,
    Building2,
    HardDrive,
    Cpu,
    BarChart3
} from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export const ResourceOptimizationView: React.FC = () => {
    const { projects, tasks, equipment } = useProjects();
    const { workforce } = useTenant();
    const teamMembers = workforce; // Map for compatibility
    const { user } = useAuth();

    // Metrics calculation
    const metrics = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'Active').length;
        const totalResourceLoad = teamMembers.length > 0
            ? (tasks.filter(t => t.status !== 'Done').length / teamMembers.length).toFixed(1)
            : '0';

        // Find over-allocated members
        const memberTaskCount: Record<string, number> = {};
        tasks.filter(t => t.status !== 'Done').forEach(t => {
            if (t.assigneeName) {
                memberTaskCount[t.assigneeName] = (memberTaskCount[t.assigneeName] || 0) + 1;
            }
        });

        const highLoadCount = Object.values(memberTaskCount).filter(count => count > 3).length;

        return {
            activeProjects,
            totalResourceLoad,
            highLoadCount,
            equipmentUtilization: '78%'
        };
    }, [projects, teamMembers, tasks]);

    if (!user || ![UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN].includes(user.role as UserRole)) {
        return <div className="p-12 text-center text-zinc-500 font-bold">Access Restricted to Administrators</div>;
    }

    return (
        <div className="p-8 bg-zinc-50 min-h-full space-y-8">
            <div>
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Resource Optimization</h1>
                <p className="text-zinc-500">Cross-project resource leveling and allocation intelligence.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Users size={24} /></div>
                        <TrendingUp size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{metrics.totalResourceLoad}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Avg Task Load</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600"><AlertTriangle size={24} /></div>
                        <Activity size={16} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{metrics.highLoadCount}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Over-allocated Staff</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Box size={24} /></div>
                        <TrendingUp size={16} className="text-purple-500" />
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{metrics.equipmentUtilization}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Fleet Utilization</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600"><Building2 size={24} /></div>
                        <TrendingUp size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{metrics.activeProjects}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Active Sites</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Resource Allocation List */}
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                        <h3 className="font-black text-zinc-900 uppercase tracking-widest text-sm">Critical Allocation Needs</h3>
                        <button className="text-xs font-bold text-blue-600 hover:underline">Manage All →</button>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {teamMembers.slice(0, 5).map(member => (
                            <div key={member.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${member.color}`}>
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-zinc-900">{member.name}</div>
                                        <div className="text-xs text-zinc-500 font-medium">{member.role} • {member.status}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-zinc-900">
                                        {tasks.filter(t => t.assigneeName === member.name && t.status !== 'Done').length} Active Tasks
                                    </div>
                                    <div className="w-24 bg-zinc-100 h-1.5 rounded-full mt-2">
                                        <div
                                            className="bg-blue-600 h-full rounded-full"
                                            style={{ width: `${Math.min((tasks.filter(t => t.assigneeName === member.name).length / 5) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Allocation trends / AI insights */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-4">
                                <Cpu size={16} /> Gemini Resource Optimization
                            </div>
                            <h3 className="text-2xl font-black mb-4 leading-tight">Projected bottle-neck detected in MEP labor for Q1.</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                Demand for Plumbing and HVAC across &quot;Highline Residences&quot; and &quot;The Wharf&quot; exceeds available capacity by 24% between Jan 15 - Feb 10. Recommend re-allocating 2 junior operatives from site maintenance.
                            </p>
                            <button className="bg-white text-zinc-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all">
                                Apply Optimization
                            </button>
                        </div>
                        <TrendingUp size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart3 className="text-zinc-400" />
                            <h3 className="font-black text-zinc-900 uppercase tracking-widest text-sm">Site Capacity Balance</h3>
                        </div>
                        <div className="space-y-4">
                            {projects.slice(0, 3).map(p => (
                                <div key={p.id}>
                                    <div className="flex justify-between items-center text-xs font-bold text-zinc-500 mb-2">
                                        <span>{p.name}</span>
                                        <span className="text-zinc-900">{75 + (p.name.length % 20)}% Capacity</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 h-2 rounded-full">
                                        <div className="bg-zinc-900 h-full rounded-full" style={{ width: `${75 + (p.name.length % 20)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceOptimizationView;
