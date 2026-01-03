import React from 'react';
import { CheckCircle, Users, Target, Clock, X } from 'lucide-react';

interface BroadcastConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionCount: number;
    targetingDetails: {
        role: string;
        plan: string;
    };
    message: string;
}

export default function BroadcastConfirmationModal({
    isOpen,
    onClose,
    sessionCount,
    targetingDetails,
    message
}: BroadcastConfirmationModalProps) {
    if (!isOpen) return null;

    const getRoleLabel = (role: string) => {
        if (role === 'all') return 'All Users';
        if (role === 'SUPERADMIN') return 'SuperAdmins Only';
        if (role === 'COMPANY_ADMIN') return 'Company Admins';
        return role;
    };

    const getPlanLabel = (plan: string) => {
        if (plan === 'all') return 'All Plans';
        return plan;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-white/20 animate-in zoom-in duration-500">
                {/* Success Header */}
                <div className="bg-white/10 backdrop-blur-sm p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4 animate-bounce">
                            <CheckCircle className="w-16 h-16 text-emerald-500" strokeWidth={3} />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2">Broadcast Sent!</h2>
                        <p className="text-white/90 text-lg font-medium">Your message has been delivered to all active sessions</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="bg-white p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Session Count */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500 rounded-lg">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Sessions Reached</span>
                            </div>
                            <p className="text-5xl font-black text-blue-900">{sessionCount}</p>
                            <p className="text-xs text-blue-600 mt-1">Active users online</p>
                        </div>

                        {/* Targeting */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500 rounded-lg">
                                    <Target className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-sm font-bold text-purple-700 uppercase tracking-wider">Targeting</span>
                            </div>
                            <p className="text-lg font-black text-purple-900">{getRoleLabel(targetingDetails.role)}</p>
                            <p className="text-xs text-purple-600 mt-1">{getPlanLabel(targetingDetails.plan)}</p>
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border-2 border-amber-200 shadow-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-bold text-amber-700 uppercase tracking-wider">Message Sent</span>
                            <span className="ml-auto text-xs text-amber-600 font-mono">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-amber-200">
                            <p className="text-gray-800 text-sm leading-relaxed">{message}</p>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg"
                    >
                        <CheckCircle className="w-6 h-6" />
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
