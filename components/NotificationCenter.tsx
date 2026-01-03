import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Trash2, Settings, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/db';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
}

export const NotificationCenter: React.FC = () => {
    const { user } = useAuth();
    const { lastMessage } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await db.getNotifications();
            // Map backend fields to frontend Notification interface
            const mapped = data.map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type || 'info',
                timestamp: new Date(n.createdAt),
                read: n.isRead === 1 || n.isRead === true,
                actionUrl: n.link
            }));
            setNotifications(mapped);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    // Listen for real-time notifications via WebSocket
    useEffect(() => {
        if (lastMessage?.type === 'notification') {
            const newNote = lastMessage;
            setNotifications(prev => [{
                id: newNote.id,
                title: newNote.title,
                message: newNote.message,
                type: newNote.notificationType || 'info',
                timestamp: new Date(newNote.createdAt),
                read: false,
                actionUrl: newNote.link
            }, ...prev]);
        }
    }, [lastMessage]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const markAsRead = async (id: string) => {
        try {
            await db.markNoteAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await db.markAllNotesAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        }
    };

    const deleteNotification = (id: string) => {
        // Backend currently doesn't have a delete specific notification endpoint in this context, 
        // but we'll keep it optimistic or local for now. 
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getTypeColor = (type: Notification['type']) => {
        switch (type) {
            case 'success': return 'text-green-600 bg-green-50';
            case 'warning': return 'text-orange-600 bg-orange-50';
            case 'error': return 'text-red-600 bg-red-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
                <Bell size={20} className="text-zinc-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-12 w-96 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                            <div>
                                <h3 className="font-bold text-zinc-900">Notifications</h3>
                                <p className="text-xs text-zinc-500">
                                    {unreadCount} unread
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={markAllAsRead}
                                    disabled={unreadCount === 0}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Mark all read
                                </button>
                                <button className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors">
                                    <Settings size={16} className="text-zinc-600" />
                                </button>
                            </div>
                        </div>

                        {/* Filter */}
                        <div className="p-3 border-b border-zinc-100 flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${filter === 'all'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-zinc-600 hover:bg-zinc-50'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${filter === 'unread'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-zinc-600 hover:bg-zinc-50'
                                    }`}
                            >
                                Unread ({unreadCount})
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell size={48} className="mx-auto text-zinc-300 mb-3" />
                                    <p className="text-sm font-medium text-zinc-500">
                                        {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                                    </p>
                                </div>
                            ) : (
                                filteredNotifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors group ${!notification.read ? 'bg-blue-50/50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-semibold text-sm text-zinc-900 truncate">
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                                                        {getTimeAgo(notification.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-600 line-clamp-2 mb-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                        >
                                                            <Check size={12} /> Mark read
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="text-xs font-medium text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {filteredNotifications.length > 0 && (
                            <div className="p-3 border-t border-zinc-100 bg-zinc-50">
                                <button className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2">
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
