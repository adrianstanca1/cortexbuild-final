import React, { useState } from 'react';
import { HardHat, Check, Mail, Lock, Loader2, Building2, UserCircle } from 'lucide-react';
import { Page } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterViewProps {
    setPage: (page: Page) => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ setPage }) => {
    const { signup } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic Validation
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setIsLoading(false);
            return;
        }

        try {
            const { user, error } = await signup(email, password, fullName, companyName);

            if (error) throw error;
            if (!user) throw new Error("Registration succeeded but no user returned");

            // Success!
            // If we got a user and no error, check if email confirm is needed.
            // If the AuthContext returns a specific error message for "check email", it will be in catch.

            // Navigate to Dashboard or Onboarding
            setPage(Page.DASHBOARD);

        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
            {/* Left Panel - Same as LoginView for consistency, but maybe slightly different accent */}
            <div className="hidden lg:flex w-[45%] bg-zinc-50 border-r border-zinc-100 flex-col p-16 relative overflow-hidden">
                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="bg-[#0f5c82] p-2.5 rounded-xl shadow-sm">
                            <HardHat size={28} fill="white" className="text-white" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-[#0f5c82]">BuildPro</span>
                    </div>

                    <h2 className="text-4xl font-semibold leading-tight mb-6 text-zinc-800 tracking-tight">
                        Join the Intelligent Platform for Modern Construction
                    </h2>

                    <p className="text-lg text-zinc-500 mb-12 leading-relaxed max-w-md font-light">
                        Start managing your projects, teams, and financials in one unified workspace today.
                    </p>

                    <div className="space-y-5 mb-12">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Everything You Get</h3>
                        {[
                            'Unlimited Projects & Users (Trial)',
                            'AI-Powered Risk Assessment',
                            'Full Financial Suite',
                            'Field Team Mobile App',
                            '24/7 Support Access'
                        ].map((feature) => (
                            <div key={feature} className="flex items-center gap-3 text-zinc-600 group">
                                <div className="bg-green-50 p-1 rounded-full text-green-600 border border-green-100">
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <span className="font-medium text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto">
                        <p className="text-xs text-zinc-400 font-medium">© 2024 BuildPro Inc.</p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-50 rounded-full opacity-60 blur-3xl" />
                <div className="absolute top-20 right-20 w-64 h-64 bg-purple-50 rounded-full opacity-40 blur-3xl" />
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col justify-center p-8 lg:p-24 overflow-y-auto bg-white relative">
                <div className="max-w-md w-full mx-auto relative z-10">
                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Create Account</h1>
                        <p className="text-zinc-500 text-sm">Start your 14-day free trial. No credit card required.</p>
                    </div>

                    <div className="bg-white p-1 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-100/50 mb-8">
                        <div className="bg-zinc-50/30 p-6 rounded-[20px]">
                            <form onSubmit={handleRegister} className="space-y-4">

                                {/* Full Name */}
                                <div>
                                    <div className="relative">
                                        <UserCircle className="absolute left-3 top-3 text-zinc-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Company Name */}
                                <div>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 text-zinc-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Company Name"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-zinc-400" size={18} />
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-zinc-400" size={18} />
                                        <input
                                            type="password"
                                            placeholder="Password (min 6 chars)"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-start">
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[#0f5c82] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#0c4a6e] transition-colors flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Get Started'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-zinc-400 mb-6">
                            Already have an account?{' '}
                            <button
                                onClick={() => setPage(Page.LOGIN)}
                                className="text-[#0f5c82] font-semibold hover:underline"
                            >
                                Sign In
                            </button>
                        </p>

                        <div className="flex justify-center gap-6 text-xs text-zinc-400 font-medium">
                            <a href="#" className="hover:text-[#0f5c82] transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-[#0f5c82] transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterView;
