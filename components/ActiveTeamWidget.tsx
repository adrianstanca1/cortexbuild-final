import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Users, Circle, Briefcase } from 'lucide-react';

export const ActiveTeamWidget: React.FC = React.memo(() => {
    const { workforce } = useTenant();

    // Show top 5 members for the dashboard-sized widget
    const displayedMembers = workforce.slice(0, 5);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-sky-400" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-white">Active Team</h3>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                    {workforce.length} Total
                </span>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {displayedMembers.length > 0 ? displayedMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className={`w-8 h-8 rounded-full ${member.color || 'bg-zinc-500'} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
                            {member.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-white truncate">{member.name}</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">{member.role}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Briefcase size={10} className="text-zinc-600" />
                            <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'On Site' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-zinc-700'}`} />
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                        <Users size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No members deployed</p>
                    </div>
                )}
            </div>

            {workforce.length > 5 && (
                <div className="mt-3 pt-3 border-t border-white/5 text-center">
                    <button className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hover:text-sky-400 transition-colors">
                        View All Team Members (+{workforce.length - 5})
                    </button>
                </div>
            )}
        </div>
    );
});

ActiveTeamWidget.displayName = 'ActiveTeamWidget';

export default ActiveTeamWidget;
