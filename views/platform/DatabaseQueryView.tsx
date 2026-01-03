import React, { useState } from 'react';
import { Database, Play, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

const DatabaseQueryView: React.FC = () => {
    const [query, setQuery] = useState('SELECT * FROM users LIMIT 10');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const { addToast } = useToast();

    const handleRunQuery = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const response = await db.executeSql(query);
            if (response.success && response.result) {
                setResults(Array.isArray(response.result) ? response.result : [response.result]);
                addToast(`Query executed in ${response.duration}`, 'success');
                if (!history.includes(query)) {
                    setHistory(prev => [query, ...prev].slice(0, 10));
                }
            } else {
                throw new Error(response.error || 'Query failed');
            }
        } catch (e: any) {
            setError(e.message || 'Execution failed');
            addToast('Query execution failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (results.length === 0) return;
        const headers = Object.keys(results[0]).join(',');
        const csv = [
            headers,
            ...results.map(row => Object.values(row).map(v => JSON.stringify(v)).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${Date.now()}.csv`;
        a.click();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="w-6 h-6 text-purple-600" /> SQL Console
                    </h1>
                    <p className="text-gray-500">Execute raw SQL queries against the production database</p>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                    <h3 className="font-bold text-yellow-900">Warning: Production Database Access</h3>
                    <p className="text-yellow-800 text-sm">
                        Queries executed here run directly against the live database.
                        Use strictly for READ operations (SELECT). avoid DROP, DELETE, or UPDATE unless absolutely necessary.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-40 font-mono text-sm p-4 bg-gray-900 text-green-400 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-y"
                            placeholder="SELECT * FROM table..."
                        />
                        <div className="flex justify-between mt-3">
                            <span className="text-xs text-gray-500">Cmd+Enter to run</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setQuery('')}
                                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4" /> Clear
                                </button>
                                <button
                                    onClick={handleRunQuery}
                                    disabled={loading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Play className="w-4 h-4" />}
                                    Execute
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {error}
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <span className="font-medium text-sm text-gray-700">{results.length} rows returned</span>
                                <button
                                    onClick={handleExport}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                    <Download className="w-4 h-4" /> Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0">
                                        <tr>
                                            {Object.keys(results[0]).map(key => (
                                                <th key={key} className="px-4 py-2 border-b whitespace-nowrap">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 font-mono text-xs">
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j} className="px-4 py-2 whitespace-nowrap max-w-xs truncate" title={String(val)}>
                                                        {val === null ? <span className="text-gray-400">NULL</span> : String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3">Query History</h3>
                        <div className="space-y-2">
                            {history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(h)}
                                    className="w-full text-left p-2 text-xs font-mono text-gray-600 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 truncate"
                                >
                                    {h}
                                </button>
                            ))}
                            {history.length === 0 && <p className="text-xs text-gray-400 italic">No history yet</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseQueryView;
