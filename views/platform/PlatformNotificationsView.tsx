
import React, { useState, useEffect } from 'react';
import { Zap, Bell, Check, Trash2, Filter, AlertTriangle, Info, Calendar, RefreshCcw } from 'lucide-react';
import { db } from '@/services/db';

interface SystemEvent {
    id: string;
    type: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    source: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
}

const PlatformNotificationsView: React.FC = () => {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterLevel, setFilterLevel] = useState<'ALL' | 'info' | 'warning' | 'critical'>('ALL');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const loadEvents = async () => {
        setIsLoading(true);
        try {
            const data = await db.getPlatformEvents(100);
            setEvents(data);
        } catch (error) {
            // Silently fail for non-critical notifications
            console.error('Failed to load system events', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await db.markPlatformEventRead(id);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
        } catch (e) {
            // Failure is non-critical
        }
    };

    const handleMarkAllRead = async () => {
        if (!confirm('Mark all alerts as read?')) return;
        try {
            await db.markAllPlatformEventsRead();
            setEvents(prev => prev.map(e => ({ ...e, is_read: true })));
        } catch (e) {
            // Failure is non-critical
        }
    };

    const filteredEvents = (events || []).filter(e => {
        if (filterLevel !== 'ALL' && e.level !== filterLevel) return false;
        if (showUnreadOnly && e.is_read) return false;
        return true;
    });

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'critical': return <AlertTriangle className="text-red-500" />;
            case 'warning': return <AlertTriangle className="text-amber-500" />;
            default: return <Info className="text-blue-500" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Zap className="text-amber-500" />
                        Platform Alerts
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Critical operational events and infrastructure notifications
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadEvents}
                        className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleMarkAllRead}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 transition-all flex items-center gap-2"
                    >
                        <Check size={16} /> Mark All Read
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 font-medium text-sm text-zinc-600 dark:text-zinc-400">
                    <Filter size={16} /> Filter by Severity:
                </div>
                <div className="flex items-center gap-2">
                    {['ALL', 'info', 'warning', 'critical'].map(level => (
                        <button
                            key={level}
                            onClick={() => setFilterLevel(level as any)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all capitalize ${filterLevel === level
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showUnreadOnly}
                        onChange={e => setShowUnreadOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Unread Only</span>
                </label>
            </div>

            {/* Event List */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center animate-pulse">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-4" />
                        <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 mx-auto rounded" />
                    </div>
                ) : (filteredEvents || []).length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-zinc-300 dark:text-zinc-700" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">All clear!</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">No system alerts found matching your filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {(filteredEvents || []).map(event => (
                            <div
                                key={event.id}
                                className={`p-4 md:p-6 transition-colors group flex gap-4 ${event.is_read ? 'bg-white dark:bg-zinc-900' : 'bg-blue-50/20 dark:bg-blue-900/10 border-l-4 border-blue-500'}`}
                            >
                                <div className="mt-1 shrink-0">
                                    {getLevelIcon(event.level)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{event.type}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${event.level === 'critical' ? 'bg-red-100 text-red-700' :
                                                event.level === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {event.level}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(event.created_at).toLocaleString()}
                                            </div>
                                            {!event.is_read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(event.id)}
                                                    className="text-blue-600 hover:text-blue-700 font-bold uppercase tracking-tight"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                                        {event.message}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                            SOURCE: {event.source}
                                        </div>
                                        {event.metadata && (
                                            <pre className="text-[10px] bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded text-zinc-600 dark:text-zinc-400 overflow-x-auto max-w-full">
                                                {JSON.stringify(event.metadata, null, 2)}
                                            </pre>
                                        )}
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

export default PlatformNotificationsView;
