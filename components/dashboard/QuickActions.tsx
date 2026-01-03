import React from 'react';
import {
    LayoutDashboard, Activity, Database, Server, Shield, Power, Sparkles,
    Settings, Search, Plus, Map as MapIcon, BookOpen, Camera, Pin,
    CheckSquare, Users, FileText, Calendar, DollarSign, TrendingUp,
    Briefcase, FileBarChart, RotateCcw, MessageSquare, AlertTriangle,
    HelpCircle, ChevronRight, Video, Link, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Page } from '@/types';
import { useTenant } from '@/contexts/TenantContext';

interface QuickActionCardProps {
    icon: any;
    title: string;
    desc: string;
    onClick: () => void;
    color?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon: Icon, title, desc, onClick, color = "text-sky-400" }) => (
    <button
        onClick={onClick}
        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] text-left transition-all duration-500 hover:scale-[1.03] hover:border-white/20 hover:shadow-2xl hover:shadow-sky-500/10 active:scale-[0.98]"
    >
        <div className={`p-3 bg-white/5 rounded-2xl w-fit mb-4 transition-all duration-500 group-hover:rotate-6 group-hover:bg-white/10 ${color}`}>
            <Icon size={20} />
        </div>
        <div className="space-y-1">
            <h3 className="text-white font-bold text-sm tracking-tight">{title}</h3>
            <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">{desc}</p>
        </div>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <ChevronRight size={14} className="text-sky-400" />
        </div>
    </button>
);

interface QuickActionsGridProps {
    setPage: (page: Page) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = React.memo(({ setPage }) => {
    const { checkFeature } = useTenant();

    const actions = [
        { icon: LayoutDashboard, title: "Insights", desc: "Global Analytics", page: Page.ANALYTICS, feature: 'ANALYTICS' },
        { icon: Activity, title: "Live View", desc: "Neural Stream", page: Page.LIVE, feature: 'LIVE_VIEW' },
        { icon: Database, title: "Inventory", desc: "Asset Ledger", page: Page.PROJECT_DETAILS, feature: 'INVENTORY', color: "text-emerald-400" },
        { icon: Shield, title: "Safety HQ", desc: "Compliance Node", page: Page.SAFETY, feature: 'SAFETY', color: "text-rose-400" },
        { icon: Calendar, title: "Schedule", desc: "View timeline", page: Page.SCHEDULE, feature: 'SCHEDULE', color: "text-orange-600" },
        { icon: Briefcase, title: "CRM", desc: "Client Relations", page: Page.CLIENTS, feature: 'CLIENTS' },
        { icon: Sparkles, title: "AI Tools", desc: "Deep Analysis", page: Page.AI_TOOLS, feature: 'AI_TOOLS', color: "text-blue-600" },
        { icon: FileBarChart, title: "Reports", desc: "Business Intelligence", page: Page.REPORTS, feature: 'REPORTS', color: "text-teal-600" },
        { icon: RotateCcw, title: "Variations", desc: "Track changes", page: Page.PROJECTS, feature: 'PROJECTS', color: "text-red-500" },
        { icon: MessageSquare, title: "AI Advisor", desc: "Ask BuildPro", page: Page.CHAT, feature: 'CHAT', color: "text-indigo-600" }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-700 font-semibold px-2">
                <Settings size={14} className="text-[#0f5c82]" />
                <span className="text-[10px] font-black uppercase tracking-widest">Strategic Controls</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {actions.filter(a => !a.feature || checkFeature(a.feature)).map((action, i) => (
                    <QuickActionCard
                        key={i}
                        icon={action.icon}
                        title={action.title}
                        desc={action.desc}
                        onClick={() => setPage(action.page)}
                        color={action.color}
                    />
                ))}
            </div>
        </div>
    );
});

QuickActionsGrid.displayName = 'QuickActionsGrid';
