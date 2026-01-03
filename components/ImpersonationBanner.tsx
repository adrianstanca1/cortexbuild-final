import React, { useState, useEffect } from 'react';
import { ShieldAlert, StopCircle, RefreshCw, User } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface ImpersonationBannerProps {
    onStop: () => Promise<void>;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({ onStop }) => {
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const token = authSession?.access_token;

                if (!token) {
                    setLoading(false);
                    return;
                }

                const res = await fetch('/api/impersonation/active', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.active) {
                        setActiveSession(data.session);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch impersonation session:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, []);

    const handleStop = async () => {
        try {
            setIsStopping(true);
            await onStop();
        } catch (error) {
            console.error('Failed to stop impersonation:', error);
            setIsStopping(false);
        }
    };

    if (loading || !activeSession) return null;

    return (
        <div className="bg-amber-600 text-white py-2 px-4 flex items-center justify-between sticky top-0 z-[100] shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-3 overflow-hidden">
                <div className="bg-white/20 p-1.5 rounded-full flex-shrink-0 animate-pulse">
                    <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate">
                    <span className="font-semibold text-sm">IMPERSONATION ACTIVE</span>
                    <span className="hidden sm:inline text-white/60">|</span>
                    <span className="text-sm truncate">
                        Viewing as <span className="font-bold underline">{activeSession.targetName}</span>
                    </span>
                    <span className="hidden lg:inline text-white/40 italic ml-2 text-xs">
                        (Admin: {activeSession.adminName})
                    </span>
                </div>
            </div>

            <button
                onClick={handleStop}
                disabled={isStopping}
                className="flex items-center space-x-2 bg-white text-amber-700 px-4 py-1.5 rounded-md text-sm font-bold hover:bg-amber-50 active:scale-95 transition-all shadow-sm border border-amber-500/20 disabled:opacity-50"
            >
                {isStopping ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                    <StopCircle className="w-4 h-4" />
                )}
                <span>{isStopping ? 'Stopping...' : 'Stop Session'}</span>
            </button>
        </div>
    );
};
