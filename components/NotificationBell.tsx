
import React, { useState } from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react'; // Assuming lucide-react is installed
import { useNotifications } from '../contexts/NotificationContext';
// import { Link } from 'react-router-dom'; // If needed for navigation

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="relative">
            <button
                onClick={toggleOpen}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-[100] animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-zinc-900">Notifications</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-[#0f5c82] hover:underline font-medium">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-zinc-400 text-xs">
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-50">
                                {notifications.map(note => (
                                    <div
                                        key={note.id}
                                        className={`p-3 hover:bg-zinc-50 transition-colors flex gap-3 ${note.isRead ? 'opacity-60' : 'bg-blue-50/30'}`}
                                    >
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${note.type === 'error' ? 'bg-red-500' :
                                            note.type === 'warning' ? 'bg-orange-500' :
                                                note.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 break-words leading-tight">{note.title}</p>
                                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{note.message}</p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[10px] text-zinc-400">{new Date(note.createdAt).toLocaleTimeString()}</span>
                                                <div className="flex gap-2">
                                                    {!note.isRead && (
                                                        <button onClick={() => markAsRead(note.id)} className="text-zinc-400 hover:text-[#0f5c82]" title="Mark Read">
                                                            <Check size={12} />
                                                        </button>
                                                    )}
                                                    {note.link && (
                                                        <a href={note.link} className="text-zinc-400 hover:text-[#0f5c82]" title="View">
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
};

export default NotificationBell;
