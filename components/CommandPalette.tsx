import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight, FileText, Users, Folder, Settings } from 'lucide-react';
import { Page } from '@/types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    setPage: (page: Page) => void;
}

interface SearchItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
    category: 'Navigation' | 'Projects' | 'Tasks' | 'Team' | 'Documents';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, setPage }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        const stored = localStorage.getItem('buildpro-recent-searches');
        return stored ? JSON.parse(stored) : [];
    });
    const inputRef = useRef<HTMLInputElement>(null);

    // Sample search items - in production, this would come from context/API
    const searchItems: SearchItem[] = [
        {
            id: 'nav-dashboard',
            title: 'Dashboard',
            icon: <Folder size={16} />,
            action: () => { setPage(Page.DASHBOARD); onClose(); },
            category: 'Navigation'
        },
        {
            id: 'nav-projects',
            title: 'Projects',
            icon: <Folder size={16} />,
            action: () => { setPage(Page.PROJECTS); onClose(); },
            category: 'Navigation'
        },
        {
            id: 'nav-financials',
            title: 'Financials',
            icon: <FileText size={16} />,
            action: () => { setPage(Page.FINANCIALS); onClose(); },
            category: 'Navigation'
        },
        {
            id: 'nav-team',
            title: 'Team',
            icon: <Users size={16} />,
            action: () => { setPage(Page.TEAM); onClose(); },
            category: 'Navigation'
        },
        {
            id: 'nav-settings',
            title: 'Settings',
            icon: <Settings size={16} />,
            action: () => { setPage(Page.PROFILE); onClose(); },
            category: 'Navigation'
        },
    ];

    const filteredItems = query.length > 0
        ? searchItems.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.subtitle?.toLowerCase().includes(query.toLowerCase())
        )
        : searchItems.slice(0, 5);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
            e.preventDefault();
            filteredItems[selectedIndex].action();
            addToRecentSearches(filteredItems[selectedIndex].title);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const addToRecentSearches = (search: string) => {
        const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('buildpro-recent-searches', JSON.stringify(updated));
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-zinc-200 dark:border-zinc-700 animate-in zoom-in-95 slide-in-from-top-4">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-700">
                    <Search size={20} className="text-zinc-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search projects, tasks, team..."
                        className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none text-lg"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-zinc-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {query.length === 0 && recentSearches.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={12} />
                                Recent Searches
                            </div>
                            {recentSearches.map((search, index) => (
                                <button
                                    key={index}
                                    onClick={() => setQuery(search)}
                                    className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"
                                >
                                    <Clock size={14} />
                                    {search}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredItems.length > 0 ? (
                        <div className="p-2">
                            {filteredItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        item.action();
                                        addToRecentSearches(item.title);
                                    }}
                                    className={`w-full px-3 py-3 text-left rounded-lg transition-all flex items-center justify-between group ${index === selectedIndex
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${index === selectedIndex
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                            }`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</div>
                                            {item.subtitle && (
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.subtitle}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-zinc-400 uppercase">{item.category}</span>
                                        <ArrowRight size={14} className={`${index === selectedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                            } transition-opacity`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.length > 0 ? (
                        <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                            <Search size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No results found for &quot;{query}&quot;</p>
                            <p className="text-sm mt-1">Try searching for projects, tasks, or team members</p>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded">↵</kbd>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded">esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
