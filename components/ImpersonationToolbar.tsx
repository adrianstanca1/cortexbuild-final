import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, LogOut, Ghost, AlertTriangle } from 'lucide-react';

export const ImpersonationToolbar: React.FC = () => {
    const { user, isImpersonating, stopImpersonating } = useAuth();

    if (!isImpersonating || !user) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-slide-down">
            <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white shadow-lg border-b border-orange-400/30 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/20 px-2 py-1 rounded shadow-inner">
                            <Ghost className="w-4 h-4 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Ghost Mode</span>
                        </div>

                        <div className="h-4 w-px bg-white/30 hidden sm:block" />

                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium opacity-90 hidden sm:inline">Currently Impersonating:</span>
                            <span className="font-bold flex items-center gap-1.5 bg-orange-700/50 px-3 py-1 rounded-full border border-orange-400/30">
                                <Shield className="w-4 h-4 text-orange-200" />
                                {user.name}
                                <span className="text-orange-200 opacity-70 font-normal">({user.companyId})</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 text-xs bg-orange-700/30 px-3 py-1 rounded border border-orange-400/20">
                            <AlertTriangle className="w-3 h-3 text-orange-200" />
                            <span className="opacity-90">Actions perform as this user. Data changes are PERMANENT.</span>
                        </div>

                        <button
                            onClick={stopImpersonating}
                            className="flex items-center gap-2 px-4 py-1.5 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95 group"
                        >
                            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            Stop Impersonating
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


