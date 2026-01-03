import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, FileText, Loader2, Link2, Ghost } from 'lucide-react';
import { db } from '@/services/db';

interface ActivityItem {
    id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata?: any;
    created_at: string;
}

interface ActivityFeedProps {
    projectId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps & { isDashboard?: boolean }> = ({
    projectId,
    entityType,
    entityId,
    limit = 50,
    isDashboard = false
}) => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
        const interval = setInterval(loadActivities, 30000);
        return () => clearInterval(interval);
    }, [projectId, entityType, entityId]);

    const loadActivities = async () => {
        try {
            const data = await db.getActivities({ limit, projectId, entityType });
            setActivities(data);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        const normalizedAction = action.toLowerCase();
        if (normalizedAction.includes('create') || normalizedAction.includes('add')) {
            return <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={16} /></div>;
        }
        if (normalizedAction.includes('update') || normalizedAction.includes('edit')) {
            return <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={16} /></div>;
        }
        if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) {
            return <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={16} /></div>;
        }
        if (normalizedAction.includes('comment')) {
            return <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText size={16} /></div>;
        }
        return <div className="p-2 bg-zinc-50 text-zinc-600 rounded-lg"><Activity size={16} /></div>;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (loading && activities.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg" />
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-zinc-100 rounded w-3/4" />
                                <div className="h-3 bg-zinc-50 rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`${isDashboard ? 'bg-transparent border-none shadow-none' : 'bg-white rounded-2xl border border-zinc-200 shadow-sm'} overflow-hidden flex flex-col h-full`}>
            <div className={`${isDashboard ? 'px-0 pb-4 pt-0 bg-transparent border-none' : 'px-6 py-4 border-b border-zinc-100 bg-zinc-50/50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-sky-400" />
                    <h3 className={`font-black uppercase tracking-widest text-xs ${isDashboard ? 'text-white' : 'text-zinc-900'}`}>Project Activity</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live Feed
                </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className={`p-12 text-center flex flex-col items-center ${isDashboard ? 'bg-transparent text-zinc-600' : 'bg-white text-zinc-400'}`}>
                        <Ghost size={48} className="mb-4 opacity-10" />
                        <p className="text-sm font-medium">No activity logged yet.</p>
                        <p className="text-[10px] uppercase font-bold mt-1 opacity-60">Actions will appear here as they happen</p>
                    </div>
                ) : (
                    <div className={`divide-y ${isDashboard ? 'divide-white/5' : 'divide-zinc-50'}`}>
                        {activities.map((activity) => (
                            <div key={activity.id} className={`p-4 transition-colors group ${isDashboard ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}>
                                <div className="flex gap-4">
                                    <div className="shrink-0">{getActionIcon(activity.action)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <p className={`text-sm leading-snug ${isDashboard ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                <span className={`font-black ${isDashboard ? 'text-white' : 'text-zinc-900'}`}>{activity.user_name}</span>
                                                {' '}
                                                <span className="font-medium">{activity.action}</span>
                                                {' '}
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${isDashboard ? 'bg-white/10 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                                                    {activity.entity_type.replace('_', ' ')}
                                                </span>
                                            </p>
                                            <div className="shrink-0 flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase">
                                                <Clock size={10} className="text-sky-400" />
                                                {formatTime(activity.created_at)}
                                            </div>
                                        </div>

                                        {activity.metadata && (
                                            <div className="mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-100 border-dashed text-[11px] text-zinc-500 font-medium overflow-hidden truncate">
                                                {typeof activity.metadata === 'string'
                                                    ? activity.metadata
                                                    : JSON.stringify(activity.metadata)}
                                            </div>
                                        )}

                                        <div className="mt-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-[10px] font-bold text-[#0f5c82] hover:underline flex items-center gap-1">
                                                <Link2 size={10} /> View details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
