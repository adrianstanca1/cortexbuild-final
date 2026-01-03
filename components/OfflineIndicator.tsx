import React, { useState, useEffect } from 'react';
import { WifiOff, X, RefreshCw } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';

export const OfflineIndicator: React.FC = () => {
    const { isOnline, pendingCount } = useSync();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!isOnline || pendingCount > 0) {
            setIsVisible(true);
        } else {
            setIsVisible(false); // Auto-hide when back online and synced
        }
    }, [isOnline, pendingCount]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 bg-zinc-900 border border-zinc-700 text-white p-4 rounded-lg shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${!isOnline ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                    {!isOnline ? (
                        <WifiOff className="w-5 h-5 text-red-400" />
                    ) : (
                        <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                    )}
                </div>
                <div>
                    <h3 className="font-medium text-sm">
                        {!isOnline ? 'You are offline' : 'Syncing changes...'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                        {pendingCount > 0
                            ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending sync.`
                            : 'Changes will be synced when you reconnect.'}
                    </p>
                </div>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
                <X className="w-4 h-4 text-zinc-400" />
            </button>
        </div>
    );
};
