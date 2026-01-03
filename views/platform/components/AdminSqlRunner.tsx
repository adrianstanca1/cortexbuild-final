import React, { useState } from 'react';
import { RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

export const AdminSqlRunner: React.FC = () => {
    const { addToast } = useToast();
    const [sqlQuery, setSqlQuery] = useState('');
    const [sqlResult, setSqlResult] = useState<any>(null);
    const [sqlError, setSqlError] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);

    const handleExecuteSql = async () => {
        if (!sqlQuery.trim()) return;

        if ((sqlQuery.toLowerCase().includes('drop') || sqlQuery.toLowerCase().includes('delete')) &&
            !confirm('WARNING: You are about to execute a DESTRUCTIVE command. This cannot be undone. Are you sure?')) {
            return;
        }

        setIsExecuting(true);
        setSqlError('');
        setSqlResult(null);

        try {
            const res = await db.executeSql(sqlQuery);
            if (res.result) {
                setSqlResult(res.result);
                addToast('Query executed successfully', 'success');
            } else {
                setSqlResult(res);
            }
        } catch (e: any) {
            setSqlError(e.message || 'Query execution failed');
            addToast('Query execution failed', 'error');
        } finally {
            setIsExecuting(false);
        }
    };

    const renderSqlResult = () => {
        if (!sqlResult) return null;
        if (Array.isArray(sqlResult) && sqlResult.length > 0) {
            const keys = Object.keys(sqlResult[0]);
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300 font-mono">
                        <thead className="bg-white text-zinc-400">
                            <tr>{keys.map(k => <th key={k} className="p-2 border-b border-zinc-700">{k}</th>)}</tr>
                        </thead>
                        <tbody>
                            {sqlResult.map((row: any, idx: number) => (
                                <tr key={idx} className="border-b border-zinc-800 hover:bg-white/50">
                                    {keys.map(k => (
                                        <td key={k} className="p-2 truncate max-w-[200px]" title={String(row[k])}>
                                            {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        return <pre className="text-emerald-400 font-mono text-sm p-4">{JSON.stringify(sqlResult, null, 2)}</pre>;
    };

    return (
        <div className="bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-zinc-700 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between p-3 bg-[#252526] border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 ml-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono ml-3">mysql@hostinger-db:3306</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setSqlQuery('')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"><RefreshCw size={14} /></button>
                    <button onClick={handleExecuteSql} disabled={isExecuting || !sqlQuery.trim()} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"><Play size={12} fill="currentColor" /> Run Query</button>
                </div>
            </div>
            <div className="relative flex-1 bg-[#1e1e1e]">
                <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} className="w-full h-full bg-transparent text-zinc-300 font-mono text-sm p-4 outline-none resize-none" placeholder="SELECT * FROM users LIMIT 10;" spellCheck={false} />
            </div>
            <div className="h-[350px] bg-[#000000] border-t border-zinc-700 flex flex-col">
                <div className="px-4 py-2 bg-[#2d2d2d] border-b border-zinc-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Query Results</span>
                    {sqlResult && Array.isArray(sqlResult) && <span className="text-xs text-emerald-400 font-mono">{sqlResult.length} rows affected</span>}
                </div>
                <div className="flex-1 overflow-auto">
                    {isExecuting ? (
                        <div className="flex items-center justify-center h-full gap-2 text-zinc-400 animate-pulse"><RefreshCw size={20} className="animate-spin" /> Executing...</div>
                    ) : sqlError ? (
                        <div className="p-4 flex items-start gap-3 text-red-400 bg-red-900/10"><AlertTriangle size={20} className="flex-shrink-0 mt-0.5" /><pre className="whitespace-pre-wrap font-mono text-sm">{sqlError}</pre></div>
                    ) : sqlResult ? renderSqlResult() : (
                        <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Enter a query above to view results</div>
                    )}
                </div>
            </div>
        </div >
    );
};
