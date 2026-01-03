import React, { useState, useEffect } from 'react';
import {
    MessageSquare, AlertCircle, CheckCircle2,
    Clock, Search, Filter, MoreHorizontal,
    User, Building2, ExternalLink, ShieldQuestion,
    ArrowUpRight, LifeBuoy, Send, X, CornerUpLeft
} from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

/**
 * SupportTicketsView
 * Centralized support ticket management for SuperAdmins
 */
const SupportTicketsView: React.FC = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [ticketMessages, setTicketMessages] = useState<any[]>([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            setIsLoading(true);
            const data = await db.getTickets();
            setTickets(data);
        } catch (error) {
            console.error("Failed to load tickets", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        try {
            const messages = await db.getTicketMessages(ticket.id);
            setTicketMessages(messages);
        } catch (error) {
            addToast('Failed to load conversation', 'error');
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        setIsSending(true);
        try {
            const newMessage = await db.replyToTicket(selectedTicket.id, replyMessage);
            setTicketMessages(prev => [...prev, newMessage]);
            setReplyMessage('');
            addToast('Response sent', 'success');

            // If ticket was open, move to pending
            if (selectedTicket.status === 'open') {
                handleUpdateStatus(selectedTicket.id, 'pending');
            }
        } catch (error) {
            addToast('Failed to send reply', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
        try {
            await db.updateTicketStatus(ticketId, newStatus);
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
            addToast(`Ticket status updated to ${newStatus}`, 'success');
        } catch (error) {
            addToast('Failed to update ticket status', 'error');
        }
    };

    const filteredTickets = (tickets || []).filter(t => {
        const matchesSearch = (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (isLoading && tickets.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 relative h-[calc(100vh-100px)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <LifeBuoy className="w-8 h-8 text-indigo-600" />
                        Support Center
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Cross-tenant support request management and resolution
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
                        value={filterStatus}
                        onChange={(e: any) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Tickets Table */}
                <div className="flex-1 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1 h-full scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Priority</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Ticket</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Company</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {(filteredTickets || []).map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors group cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                                        onClick={() => handleOpenTicket(ticket)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit ${ticket.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                    'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                }`}>
                                                <AlertCircle size={10} />
                                                {ticket.priority.toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{ticket.subject}</span>
                                                <span className="text-xs text-zinc-500 mt-0.5">{ticket.author}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-zinc-400" />
                                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{ticket.companyName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center gap-2 text-xs font-bold ${ticket.status === 'open' ? 'text-red-500' :
                                                ticket.status === 'pending' ? 'text-amber-500' :
                                                    'text-green-500'
                                                }`}>
                                                {ticket.status === 'open' && <Clock size={14} />}
                                                {ticket.status === 'pending' && <Clock size={14} />}
                                                {ticket.status === 'resolved' && <CheckCircle2 size={14} />}
                                                {ticket.status.toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg shadow-sm"
                                                    title="Quick Resolve"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateStatus(ticket.id, 'resolved');
                                                    }}
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg shadow-sm"
                                                    title="Launch Tenant Control"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToast('Launching tenant control...', 'info');
                                                    }}
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(filteredTickets || []).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                            <LifeBuoy size={48} className="mx-auto mb-4 opacity-10" />
                                            <p className="font-medium">No tickets matching your filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Conversation View */}
                <div className={`w-[450px] bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden flex flex-col transition-transform duration-300 ${selectedTicket ? 'translate-x-0' : 'translate-x-[500px] absolute right-0 top-0 bottom-0'}`}>
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-700 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                        {selectedTicket.subject.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{selectedTicket.subject}</h3>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedTicket.companyName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                                    <X size={20} className="text-zinc-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
                                {(ticketMessages || []).map((msg, idx) => (
                                    <div key={msg.id || idx} className={`flex flex-col ${msg.isAgent ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.isAgent ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-tl-none border border-zinc-200 dark:border-zinc-600'}`}>
                                            <p className="leading-relaxed">{msg.message}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 px-1">
                                            <span className="font-bold">{msg.author}</span>
                                            <span>•</span>
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-zinc-100 dark:border-zinc-700">
                                <form onSubmit={handleSendReply} className="relative">
                                    <textarea
                                        rows={3}
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder="Type your response here..."
                                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-inner"
                                    />
                                    <div className="absolute right-3 bottom-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                                            className="p-2 text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                                            title="Direct Resolve"
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                        <button
                                            disabled={!replyMessage.trim() || isSending}
                                            type="submit"
                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
                                        >
                                            {isSending ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <Send size={20} />
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                            <CornerUpLeft size={48} className="mb-4 opacity-10" />
                            <p className="font-medium">Select a ticket to view the conversation history and provide support.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                {[
                    { label: 'Total Tickets', value: (tickets || []).length, color: 'indigo' },
                    { label: 'Global SLA', value: '99.2%', color: 'green' },
                    { label: 'Avg Resolution', value: '4.2h', color: 'blue' },
                    { label: 'Satisfied Tenants', value: '96%', color: 'purple' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-2 h-8 rounded-full bg-${stat.color}-500/20`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SupportTicketsView;
