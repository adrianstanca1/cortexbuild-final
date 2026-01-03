import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface FieldCardProps {
    title: string;
    icon: LucideIcon;
    onClick: () => void;
    addAction?: () => void;
}

export const FieldCard: React.FC<FieldCardProps> = React.memo(({ title, icon: Icon, onClick, addAction }) => (
    <div
        onClick={onClick}
        className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-sky-500/10 hover:border-sky-400/30 transition-all cursor-pointer group relative flex flex-col justify-between min-h-[140px] overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/5 group-hover:to-transparent transition-all duration-500" />
        <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-sky-400 group-hover:text-white transition-all duration-300 text-sky-400 shadow-inner">
                <Icon size={24} strokeWidth={1.5} />
            </div>
            {addAction && (
                <button
                    onClick={(e) => { e.stopPropagation(); addAction(); }}
                    className="p-1.5 bg-white/5 hover:bg-sky-400 hover:text-white rounded-lg text-zinc-500 transition-all border border-white/5"
                >
                    <Plus size={16} />
                </button>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="font-black text-white text-sm mb-1 tracking-tight group-hover:text-sky-400 transition-colors">{title}</h3>
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] group-hover:text-sky-300/50 transition-colors">Initialize Module</p>
        </div>
    </div>
));

FieldCard.displayName = 'FieldCard';
