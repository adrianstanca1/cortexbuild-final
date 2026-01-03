import React, { useState } from 'react';
import {
    Download, FileSpreadsheet, FileText, Users, Building2,
    ScrollText, MessageSquare, Activity, Calendar, Filter
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { db } from '@/services/db';
import { supabase } from '@/services/supabaseClient';

const ExportView: React.FC = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handleExport = async (type: string, format: 'excel' | 'pdf') => {
        try {
            setLoading(type);

            if (format === 'excel') {
                // Direct download for Excel files
                const url = `${import.meta.env.VITE_API_URL}/platform/export/${type}/excel`;

                const { data: { session: authSession } } = await supabase.auth.getSession();
                const token = authSession?.access_token || '';

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Export failed');

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${type}-export-${Date.now()}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                addToast(`${type} exported successfully`, 'success');
            } else {
                // PDF generation would happen here
                addToast('PDF export coming soon', 'info');
            }
        } catch (error) {
            console.error('Export failed:', error);
            addToast('Export failed', 'error');
        } finally {
            setLoading(null);
        }
    };

    const exportOptions = [
        {
            id: 'users',
            title: 'User Directory',
            description: 'All users with roles, companies, and status',
            icon: Users,
            color: 'blue',
            fields: ['Name', 'Email', 'Role', 'Company', 'Status', 'Created Date']
        },
        {
            id: 'companies',
            title: 'Company Registry',
            description: 'All companies with plans, users, and projects',
            icon: Building2,
            color: 'green',
            fields: ['Name', 'Plan', 'Status', 'Users', 'Projects', 'Created Date']
        },
        {
            id: 'audit-logs',
            title: 'Audit Logs',
            description: 'Complete audit trail of all platform actions',
            icon: ScrollText,
            color: 'yellow',
            fields: ['User', 'Action', 'Resource', 'IP Address', 'Timestamp'],
            hasFilters: true
        },
        {
            id: 'support-tickets',
            title: 'Support Tickets',
            description: 'All support tickets with status and resolution',
            icon: MessageSquare,
            color: 'red',
            fields: ['Subject', 'Status', 'Priority', 'Created By', 'Created At']
        },
        {
            id: 'system-events',
            title: 'System Events',
            description: 'Platform alerts and system-level events',
            icon: Activity,
            color: 'purple',
            fields: ['Type', 'Level', 'Message', 'Source', 'Timestamp']
        }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Data Export Center
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Export platform data in Excel or PDF format
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-300">
                        Export Tools
                    </span>
                </div>
            </div>

            {/* Export Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exportOptions.map(option => {
                    const Icon = option.icon;
                    const isLoading = loading === option.id;

                    return (
                        <div
                            key={option.id}
                            className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 bg-${option.color}-100 dark:bg-${option.color}-900/30 rounded-lg`}>
                                    <Icon className={`w-6 h-6 text-${option.color}-600 dark:text-${option.color}-400`} />
                                </div>
                                {option.hasFilters && (
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                        title="Filters"
                                    >
                                        <Filter size={16} />
                                    </button>
                                )}
                            </div>

                            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">
                                {option.title}
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                {option.description}
                            </p>

                            {/* Fields Preview */}
                            <div className="mb-4">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                    Included Fields
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {option.fields.slice(0, 3).map(field => (
                                        <span
                                            key={field}
                                            className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded"
                                        >
                                            {field}
                                        </span>
                                    ))}
                                    {option.fields.length > 3 && (
                                        <span className="text-xs px-2 py-0.5 text-zinc-500">
                                            +{option.fields.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Export Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExport(option.id, 'excel')}
                                    disabled={isLoading}
                                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    {isLoading ? (
                                        <>Exporting...</>
                                    ) : (
                                        <>
                                            <FileSpreadsheet size={14} />
                                            Excel
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleExport(option.id, 'pdf')}
                                    disabled={isLoading}
                                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    <FileText size={14} />
                                    PDF
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Platform Data Summary</h3>
                        <p className="text-sm text-indigo-100">Real-time ledger and data exports available</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-right">
                            <p className="text-xs text-indigo-200">Export Formats</p>
                            <p className="text-2xl font-bold">2</p>
                            <p className="text-xs text-indigo-200">Excel & PDF</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-indigo-200">Data Sources</p>
                            <p className="text-2xl font-bold">{exportOptions.length}</p>
                            <p className="text-xs text-indigo-200">Available</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Range Filter Modal (for Audit Logs) */}
            {showFilters && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Calendar size={20} />
                                Export Filters
                            </h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                                    value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                                    value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    handleExport('audit-logs', 'excel');
                                    setShowFilters(false);
                                }}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                Apply & Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportView;
