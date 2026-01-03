
import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowRight, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';

interface MaintenanceViewProps {
    onAdminLogin: () => void;
}

const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onAdminLogin }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { user, error } = await login(email, password);

            if (error) throw error;
            if (!user) throw new Error("Authentication failed - No user returned");

            console.log("Maintenance Login Success:", user.email, user.role);

            if (user.role === UserRole.SUPERADMIN) {
                onAdminLogin();
            } else {
                console.warn("Maintenance Access Denied. User role:", user.role);
                setError(`Access Denied: Only Superadmins can access (You are: ${user.role})`);
            }

        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-900 text-white p-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-red-500 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 animate-pulse border border-red-500/20">
                    <ShieldAlert size={48} className="text-red-500" />
                </div>

                <h1 className="text-4xl font-bold mb-4 text-center tracking-tight">System Under Maintenance</h1>
                <p className="text-zinc-400 text-center text-lg mb-10 leading-relaxed">
                    BuildPro is currently undergoing critical scheduled maintenance to improve performance and security.
                    <br /><br />
                    We expect to be back online shortly. Thank you for your patience.
                </p>

                {!showLogin ? (
                    <div className="flex flex-col gap-4 w-full">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-200 transition-all font-medium border border-zinc-700/50 hover:border-zinc-500"
                        >
                            Refresh Status
                        </button>

                        <button
                            onClick={() => setShowLogin(true)}
                            className="text-xs text-zinc-600 hover:text-zinc-400 mt-4 transition-colors flex items-center justify-center gap-1"
                        >
                            <Lock size={12} /> Admin Override
                        </button>
                    </div>
                ) : (
                    <div className="w-full bg-zinc-800/50 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">Admin Access</h3>
                            <button onClick={() => setShowLogin(false)} className="text-zinc-500 hover:text-white text-xs">Cancel</button>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <input
                                    type="email"
                                    placeholder="Admin Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg font-medium shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader size={16} className="animate-spin" /> : <>Login & Bypass <ArrowRight size={16} /></>}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-[10px] font-mono text-zinc-700">
                    SYSTEM_STATUS: <span className="text-red-500">MAINTENANCE_ACTIVE</span> • ID: {Date.now().toString().slice(-6)}
                </div>
            </div>
        </div>
    );
};

export default MaintenanceView;
