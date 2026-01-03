import React, { useState, useEffect } from 'react';
import { FileJson, Download, Filter, Calendar, User, Building2, AlertCircle, Search, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/services/db';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    companyId: string;
    companyName: string;
    action: string;
    resource: string;
    resourceId: string;
    metadata?: any;
    ipAddress?: string;
    severity: 'info' | 'warning' | 'error';
    details: string;
}

/**
 * SystemLogsView
 * Superadmin-only view for audit log viewing and export
 */
const SystemLogsView: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    const [dateRange, setDateRange] = useState('7d'); // 24h, 7d, 30d, ALL

    // Pagination & Detail State
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const logsPerPage = 10;

    useEffect(() => {
        const loadLogs = async () => {
            setIsLoading(true);
            try {
                // Prepare filters
                const params: any = {};
                if (filterAction !== 'ALL') params.action = filterAction;
                // Simple search mapping
                if (searchTerm && (searchTerm.startsWith('u') || searchTerm.startsWith('user'))) params.userId = searchTerm;
                else if (searchTerm) params.userId = searchTerm; // Default search to userId/userName for now

                // Date mapping
                const now = new Date();
                if (dateRange === '24h') params.startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                else if (dateRange === '7d') params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                else if (dateRange === '30d') params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

                params.limit = 100; // default

                const data = await db.getGlobalAuditLogs(params);

                // Adapt to view model
                const viewLogs = (data || []).map((l: any) => ({
                    id: l.id,
                    timestamp: l.timestamp || new Date().toISOString(),
                    userId: l.userId,
                    userName: l.userName || 'Unknown',
                    companyId: l.companyId || l.tenantId, // backend uses companyId
                    companyName: 'Tenant ' + (l.companyId || l.tenantId),
                    action: l.action,
                    resource: l.resource,
                    resourceId: l.resourceId,
                    metadata: l.metadata || l.changes, // standardize
                    severity: (l.status === 'failure' ? 'error' : 'info') as 'info' | 'warning' | 'error',
                    ipAddress: l.ipAddress || '127.0.0.1',
                    details: l.details || `${l.action} on ${l.resource}/${l.resourceId}`
                }));
                setLogs(viewLogs);
            } catch (error) {
                console.error("Failed to load audit logs", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(loadLogs, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchTerm, filterAction, dateRange]); // Re-fetch on filter change

    // Filtering Logic (Client-side Search for non-exact matches if needed, but we rely mostly on server now)
    // We can keep client-side filtering for displayed logs if we want to filter the *fetched* set further
    // But since we fetch based on filters, we can just display `logs`.
    // However, the `searchTerm` in backend is `userId` only.
    // So if user searches for "UPDATE", backend won't catch it unless we map it.
    // Let's keep `filteredLogs = logs` since we assume server does heavy lifting, OR do hybrid.
    // To simplify: let's treat `logs` as the source of truth, but maybe filter strict text locally?
    // Actually, let's just use `logs` directly and assume backend is doing the work.

    // Pagination Logic
    const filteredLogs = logs; // Direct mapping
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const displayedLogs = filteredLogs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    // Get unique actions for filter dropdown (can still be dynamic from fetched, or hardcoded)
    const uniqueActions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

    const getSeverityStyles = (severity: string) => {
        const styles: Record<string, string> = {
            info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return styles[severity] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300';
    };

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'User', 'Company', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Severity'].join(','),
            ...filteredLogs.map(log => [
                log.timestamp,
                log.userName,
                log.companyName,
                log.action,
                log.resource,
                log.resourceId,
                log.ipAddress || '',
                log.severity,
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        System Logs
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Audit trail and system activity monitoring
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Export CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Logs</p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                                {logs.length}
                            </p>
                        </div>
                        <FileJson className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Info</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                                {logs.filter(l => l.severity === 'info').length}
                            </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Warnings</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">
                                {logs.filter(l => l.severity === 'warning').length}
                            </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Errors</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                {logs.filter(l => l.severity === 'error').length}
                            </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by User ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    >
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                    {['24h', '7d', '30d', 'ALL'].map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === range
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center text-zinc-500">Loading logs...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Details
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {displayedLogs.map((log) => {
                                    return (
                                        <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                        {log.userId?.slice(0, 2).toUpperCase() || 'SY'}
                                                    </span>
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                        {log.userId || 'System'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getSeverityStyles(log.severity)}`}>
                                                    {log.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.action.includes('DELETE') || log.action.includes('SUSPEND') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                    log.action.includes('UPDATE') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                                                {log.details}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {displayedLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                                            No logs found matching your criteria
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Showing <span className="font-medium">{(currentPage - 1) * logsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * logsPerPage, filteredLogs.length)}</span> of <span className="font-medium">{filteredLogs.length}</span> results
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 disabled:opacity-50 flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 disabled:opacity-50 flex items-center gap-1"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="bg-zinc-900 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedLog.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                                    selectedLog.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    <FileJson className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold leading-none">{selectedLog.action}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Audit Log Details</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">User ID</label>
                                    <p className="text-sm font-medium dark:text-white">{selectedLog.userId}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Timestamp</label>
                                    <p className="text-sm font-medium dark:text-white">{selectedLog.timestamp}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">IP Address</label>
                                    <p className="text-sm font-medium dark:text-white">{selectedLog.ipAddress || '127.0.0.1'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Severity</label>
                                    <p className={`text-sm font-bold uppercase ${selectedLog.severity === 'error' ? 'text-red-500' :
                                        selectedLog.severity === 'warning' ? 'text-amber-500' :
                                            'text-blue-500'
                                        }`}>{selectedLog.severity}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">Affected Fields</label>
                                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                    {selectedLog.metadata && typeof selectedLog.metadata === 'object' && Object.keys(selectedLog.metadata).length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Field</th>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">New Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                                {Object.entries(selectedLog.metadata).map(([key, value]) => (
                                                    <tr key={key} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                                                        <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-400">{key}</td>
                                                        <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400 break-all">
                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-4 text-zinc-500 italic text-sm text-center">No field changes recorded or metadata unavailable.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-all active:scale-95 text-zinc-700 dark:text-zinc-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemLogsView;
