import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Page } from '@/types';

interface RequestPasswordResetViewProps {
    setPage: (page: Page) => void;
}

const RequestPasswordResetView: React.FC<RequestPasswordResetViewProps> = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/users/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to request password reset');
            }

            setIsSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-indigo-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-purple-600/10 blur-[120px] rounded-full" />

            <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10">
                {!isSent ? (
                    <>
                        <button 
                            onClick={() => setPage(Page.LOGIN)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-bold uppercase tracking-widest">Back to Login</span>
                        </button>

                        <div className="mb-10">
                            <h1 className="text-3xl font-black text-white mb-3">Recover Access</h1>
                            <p className="text-slate-400 font-medium">Enter your email and we&apos;ll send you a secure link to reset your access key.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="group">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-indigo-400 transition-colors">Digital Identity</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
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
                                    <>
                                        <span>Send Recovery Link</span>
                                        <Sparkles size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-8">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4">Check Your Inbox</h2>
                        <p className="text-slate-400 mb-10 leading-relaxed">
                            We&apos;ve sent a secure recovery link to <span className="text-white font-bold">{email}</span>. Please check your email and follow the instructions.
                        </p>
                        <button
                            onClick={() => setPage(Page.LOGIN)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-bold text-base transition-all"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestPasswordResetView;
