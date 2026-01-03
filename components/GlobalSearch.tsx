import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, User, LayoutDashboard, X, Loader2, ArrowRight } from 'lucide-react';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Globe } from 'lucide-react';

interface SearchResult {
    id: string;
    name: string;
    type: 'tenant' | 'user' | 'project';
    companyName?: string;
}

interface GlobalSearchProps {
    onNavigate: (type: string, id: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ tenants: SearchResult[], users: SearchResult[], projects: SearchResult[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 1) {
                setIsLoading(true);
                setIsOpen(true);
                try {
                    const data = await db.globalSearch(query, isGlobal);
                    setResults(data);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, isGlobal]);

    const ResultItem = ({ item }: { item: SearchResult }) => {
        const Icon = item.type === 'tenant' ? Building2 : item.type === 'user' ? User : LayoutDashboard;
        return (
            <button
                onClick={() => {
                    onNavigate(item.type, item.id);
                    setIsOpen(false);
                    setQuery('');
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors text-left"
            >
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">{item.name}</p>
                    {item.companyName && (
                        <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {item.companyName}
                        </p>
                    )}
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
            </button>
        );
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-md">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search tenants, users, or projects..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 1 && setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
                    >
                        <X className="w-3 h-3 text-zinc-400" />
                    </button>
                )}
            </div>

            {isSuperAdmin && (
                <div className="flex items-center gap-2 mt-2 px-1">
                    <button
                        onClick={() => setIsGlobal(!isGlobal)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${isGlobal
                                ? 'bg-purple-100 border-purple-200 text-purple-700 shadow-sm'
                                : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
                            }`}
                    >
                        <Globe className={`w-3 h-3 ${isGlobal ? 'animate-pulse' : ''}`} />
                        Platform Search {isGlobal ? 'ON' : 'OFF'}
                    </button>
                    {isGlobal && (
                        <span className="text-[10px] text-purple-500 italic font-medium animate-fade-in">
                            Searching all tenants...
                        </span>
                    )}
                </div>
            )}

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-xs font-medium uppercase tracking-widest">Searching...</span>
                        </div>
                    ) : results && (results.tenants.length > 0 || results.users.length > 0 || results.projects.length > 0) ? (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                            {results.tenants.length > 0 && (
                                <div className="p-2">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 py-1">Tenants</p>
                                    {results.tenants.map(t => <ResultItem key={t.id} item={t} />)}
                                </div>
                            )}
                            {results.users.length > 0 && (
                                <div className="p-2">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 py-1">Users</p>
                                    {results.users.map(u => <ResultItem key={u.id} item={u} />)}
                                </div>
                            )}
                            {results.projects.length > 0 && (
                                <div className="p-2">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 py-1">Projects</p>
                                    {results.projects.map(p => <ResultItem key={p.id} item={p} />)}
                                </div>
                            )}
                        </div>
                    ) : query.length > 1 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="text-sm">No results found for &quot;{query}&quot;</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
