import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { Page } from '@/types';

interface ConfirmPasswordResetViewProps {
    setPage: (page: Page) => void;
}

const ConfirmPasswordResetView: React.FC<ConfirmPasswordResetViewProps> = ({ setPage }) => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            setError('Missing or invalid reset token.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/users/reset-password-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to reset password');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">Invalid Recovery Link</h2>
                    <p className="text-slate-400 mb-8">This password reset link is invalid or has expired.</p>
                    <button
                        onClick={() => setPage(Page.LOGIN)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-indigo-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-purple-600/10 blur-[120px] rounded-full" />

            <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10">
                {!isSuccess ? (
                    <>
                        <div className="mb-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-2xl mb-6">
                                <ShieldCheck className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-3">Reset Access Key</h1>
                            <p className="text-slate-400 font-medium">Create a new secure password for your account.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="group">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-indigo-400 transition-colors">New Access Key</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-indigo-400 transition-colors">Confirm New Key</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <span>Update Access Key</span>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-8">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4">Access Restored</h2>
                        <p className="text-slate-400 mb-10 leading-relaxed">
                            Your access key has been successfully updated. You can now use your new password to sign in.
                        </p>
                        <button
                            onClick={() => setPage(Page.LOGIN)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20"
                        >
                            Sign In Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmPasswordResetView;
