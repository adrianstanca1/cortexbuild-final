
import React, { useState, useEffect } from 'react';
import { Bell, Check, Zap, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface PlatformEvent {
    id: string;
    type: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    source: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
}

const PlatformNotificationBell: React.FC = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const [events, setEvents] = useState<PlatformEvent[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = events.filter(e => !e.is_read).length;

    useEffect(() => {
        if (!user || user.role !== 'SUPERADMIN') return;

        // Load initial events
        const loadEvents = async () => {
            try {
                const data = await db.getPlatformEvents(10);
                setEvents(data);
            } catch (error) {
                // Silently fail for non-critical notifications
                console.error('Failed to load platform events', error);
            }
        };

        loadEvents();

        // Socket Listener
        // We assume the socket connection from NotificationContext is globally accessible or we reuse it?
        // Actually, let's just listen on the same protocol as NotificationContext but for SYSTEM_EVENT

        const apiUrl = import.meta.env?.VITE_API_URL || 'https://api.cortexbuildpro.com';
        const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/live';
        let ws: WebSocket;

        const connect = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'SYSTEM_EVENT') {
                        const newEvent = data.payload;
                        setEvents(prev => [newEvent, ...prev].slice(0, 20));

                        // Show toast for critical events
                        if (newEvent.level === 'critical' || newEvent.level === 'warning') {
                            addToast(`SYSTEM: ${newEvent.message}`, newEvent.level === 'critical' ? 'error' : 'warning');
                        }
                    }
                } catch (e) {
                    // Ignore JSON parsing errors from socket
                }
            };
            ws.onclose = () => setTimeout(connect, 5000);
        };

        connect();
        return () => ws?.close();
    }, [user, token, addToast]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await db.markPlatformEventRead(id);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
        } catch (e) {
            // Silently fail if marking as read fails
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await db.markAllPlatformEventsRead();
            setEvents(prev => prev.map(e => ({ ...e, is_read: true })));
        } catch (e) {
            // Silently fail
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
                title="Platform Alerts"
            >
                <Zap size={20} className={unreadCount > 0 ? 'text-amber-500 fill-amber-500' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2">
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" />
                            Platform Alerts
                        </h4>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-tighter">
                                Mark All Read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {events.length === 0 ? (
                            <div className="p-8 text-center text-zinc-400 text-xs">
                                No recent system events.
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        className={`p-4 transition-colors relative group ${event.is_read ? 'opacity-60' : 'bg-blue-50/20 dark:bg-blue-900/10 border-l-2 border-blue-500'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {event.level === 'critical' ? <AlertTriangle size={16} className="text-red-500" /> :
                                                    event.level === 'warning' ? <AlertTriangle size={16} className="text-amber-500" /> :
                                                        <Info size={16} className="text-blue-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{event.type.replace('_', ' ')}</span>
                                                    <span className="text-[10px] text-zinc-400">{new Date(event.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-1 font-medium">{event.message}</p>
                                                <p className="text-[10px] text-zinc-500 mt-1">Source: {event.source}</p>

                                                {!event.is_read && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(event.id)}
                                                        className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                    >
                                                        <Check size={10} /> Mark as seen
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {/* Navigate to full notifications view */ }}
                        className="w-full p-2 text-center text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 uppercase tracking-widest"
                    >
                        View Full History
                    </button>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
};

export default PlatformNotificationBell;
