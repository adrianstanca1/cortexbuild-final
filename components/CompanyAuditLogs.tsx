import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Search,
    Filter,
    Calendar,
    User,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle,
    Info
} from 'lucide-react';

interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    userid: string;
    resourcetype: string | null;
    resourceid: string | null;
    details: any | null;
    metadata: Record<string, any> | null;
    ipaddress: string | null;
    users: {
        id: string;
        email: string;
        role: string;
    } | null;
}

interface CompanyAuditLogsProps {
    companyId: string;
}

export default function CompanyAuditLogs({ companyId }: CompanyAuditLogsProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d' | '90d'>('30d');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [companyId, filterAction, filterUser, dateRange, page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);

            let url = `/api/audit/companies/${companyId}/timeline?limit=50&offset=${page * 50}`;

            if (filterAction) url += `&action=${encodeURIComponent(filterAction)}`;
            if (filterUser) url += `&actor=${encodeURIComponent(filterUser)}`;

            // Add date range filter
            if (dateRange !== 'all') {
                const now = new Date();
                const ranges = {
                    '24h': 1,
                    '7d': 7,
                    '30d': 30,
                    '90d': 90
                };
                const daysAgo = ranges[dateRange];
                const since = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                url += `&since=${since.toISOString()}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch audit logs');

            const data = await res.json();
            const newLogs = data.events || [];

            if (page === 0) {
                setLogs(newLogs);
            } else {
                setLogs(prev => [...prev, ...newLogs]);
            }

            setHasMore(newLogs.length === 50);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const url = `/api/audit/companies/${companyId}/export?format=csv`;
            const res = await fetch(url, { credentials: 'include' });

            if (!res.ok) throw new Error('Failed to export logs');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit-logs-${companyId}-${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to export logs:', error);
            alert('Failed to export audit logs');
        }
    };

    const getActionIcon = (action: string) => {
        if (action.includes('CREATE') || action.includes('INVITE')) {
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        }
        if (action.includes('DELETE') || action.includes('SUSPEND')) {
            return <XCircle className="w-4 h-4 text-red-600" />;
        }
        if (action.includes('UPDATE') || action.includes('MODIFY')) {
            return <Activity className="w-4 h-4 text-blue-600" />;
        }
        if (action.includes('ERROR') || action.includes('FAIL')) {
            return <AlertCircle className="w-4 h-4 text-orange-600" />;
        }
        return <Info className="w-4 h-4 text-gray-600" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE') || action.includes('INVITE')) return 'bg-green-50 text-green-700';
        if (action.includes('DELETE') || action.includes('SUSPEND')) return 'bg-red-50 text-red-700';
        if (action.includes('UPDATE') || action.includes('MODIFY')) return 'bg-blue-50 text-blue-700';
        if (action.includes('ERROR') || action.includes('FAIL')) return 'bg-orange-50 text-orange-700';
        return 'bg-gray-50 text-gray-700';
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const detailsStr = typeof log.details === 'string'
            ? log.details
            : (log.details ? JSON.stringify(log.details) : '');

        return (
            log.action.toLowerCase().includes(term) ||
            log.users?.email.toLowerCase().includes(term) ||
            detailsStr.toLowerCase().includes(term) ||
            log.resourcetype?.toLowerCase().includes(term)
        );
    });

    const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();
    const uniqueUsers = Array.from(
        new Set(logs.map(log => log.users?.email).filter(Boolean))
    ).sort();

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex items-center justify-between">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Filter className="inline w-4 h-4 mr-1" />
                        Action Type
                    </label>
                    <select
                        value={filterAction}
                        onChange={(e) => {
                            setFilterAction(e.target.value);
                            setPage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="inline w-4 h-4 mr-1" />
                        User
                    </label>
                    <select
                        value={filterUser}
                        onChange={(e) => {
                            setFilterUser(e.target.value);
                            setPage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Users</option>
                        {uniqueUsers.map(email => (
                            <option key={email} value={email}>{email}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Time Range
                    </label>
                    <select
                        value={dateRange}
                        onChange={(e) => {
                            setDateRange(e.target.value as typeof dateRange);
                            setPage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {loading && page === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p>Loading audit logs...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg font-medium">No audit logs found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Resource
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {log.users?.email || 'System'}
                                                    </div>
                                                    {log.users?.role && (
                                                        <div className="text-xs text-gray-500">{log.users.role}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.resourcetype ? (
                                                <div>
                                                    <div className="font-medium">{log.resourcetype}</div>
                                                    {log.resourceid && (
                                                        <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                                            {log.resourceid}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {log.details || <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {log.ipaddress || <span className="text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasMore && !loading && filteredLogs.length > 0 && (
                <div className="text-center">
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Load More
                    </button>
                </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-gray-500 text-center">
                Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
                {searchTerm && ` matching "${searchTerm}"`}
            </div>
        </div>
    );
}
