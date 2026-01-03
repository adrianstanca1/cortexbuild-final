import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, AlertCircle, Loader2, ArrowRight, User, Lock } from 'lucide-react';

interface InvitationData {
    email: string;
    role: string;
    companyId: string;
    companyName?: string;
    metadata?: Record<string, any>;
}

const AcceptInvitationView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (!token) {
            setError('Invitation token is missing.');
            setLoading(false);
            return;
        }

        const validateToken = async () => {
            try {
                const response = await fetch('/api/invitations/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to validate invitation');
                }

                setInvitationData(result.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    name: formData.name,
                    password: formData.password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to accept invitation');
            }

            // Save token to localStorage for AuthContext to pick up
            if (result.token) {
                localStorage.setItem('auth_token', result.token);
            }

            // Redirect to dashboard
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">Validating your invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitationData) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Invitation Error</h2>
                    <p className="text-zinc-400 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-indigo-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-purple-600/10 blur-[120px] rounded-full" />

            <div className="bg-zinc-800/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-2xl mb-6">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Welcome to BuildPro</h1>
                    <p className="text-zinc-400">
                        You&apos;ve been invited to join <span className="text-white font-semibold">BuildPro</span> as a <span className="text-indigo-400 font-semibold">{invitationData?.role}</span>.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleAccept} className="space-y-6">
                    <div>
                        <label className="block text-zinc-400 text-sm font-medium mb-2 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="text"
                                required
                                placeholder="Enter your full name"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-sm font-medium mb-2 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="password"
                                required
                                placeholder="Create a password"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-sm font-medium mb-2 ml-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="password"
                                required
                                placeholder="Confirm your password"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {invitationData?.role === 'COMPANY_OWNER' ? 'Activating your company...' : 'Setting up your account...'}
                            </>
                        ) : (
                            <>
                                {invitationData?.role === 'COMPANY_OWNER' ? '🚀 Activate Company & Join' : 'Join Organization'}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-zinc-500 text-xs mt-6">
                        By joining, you agree to BuildPro&apos;s <span className="text-zinc-400 hover:text-white cursor-pointer underline">Terms of Service</span> and <span className="text-zinc-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvitationView;
