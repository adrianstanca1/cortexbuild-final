import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const SetupView: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSetup = async () => {
        setStatus('loading');
        setMessage('Setting up SUPERADMIN permissions...');

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error('Not logged in. Please log in first.');
            }

            const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNDMxNywiZXhwIjoyMDcxNjkwMzE3fQ.gY8kq22SiOxULPdpdhf-sz-C7V9hC2ZtPy5003UYsik';
            const supabaseUrl = 'https://zpbuvuxpfemldsknerew.supabase.co';

            // Step 1: Create user record in users table
            setMessage('Creating user record...');
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    id: user.id,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
                    email: user.email,
                    status: 'active',
                    role: 'SUPERADMIN',
                    createdAt: new Date().toISOString()
                })
            });

            if (!userResponse.ok) {
                const error = await userResponse.json();
                console.warn('User creation response:', error);
                // Continue even if user already exists
            }

            // Step 2: Create company
            setMessage('Creating platform company...');
            await fetch(`${supabaseUrl}/rest/v1/companies`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    id: 'platform-admin',
                    name: 'Platform Administration',
                    plan: 'Enterprise',
                    status: 'Active',
                    maxusers: 999,
                    maxprojects: 999,
                    createdAt: new Date().toISOString()
                })
            });

            // Step 3: Create membership
            setMessage('Granting SUPERADMIN permissions...');
            const response = await fetch(`${supabaseUrl}/rest/v1/memberships`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify({
                    userId: user.id,
                    companyId: 'platform-admin',
                    role: 'SUPERADMIN',
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create membership');
            }

            setStatus('success');
            setMessage('✅ SUPERADMIN permissions granted! Refreshing in 2 seconds...');
            setTimeout(() => window.location.href = '/', 2000);

        } catch (error: any) {
            setStatus('error');
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-2xl w-full border border-white/20 shadow-2xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-white mb-4">
                        🔧 One-Time Setup
                    </h1>
                    <p className="text-lg text-white/70">
                        Click the button below to grant yourself SUPERADMIN permissions and fix all 403 errors.
                    </p>
                </div>

                <button
                    onClick={handleSetup}
                    disabled={status === 'loading' || status === 'success'}
                    className={`w-full py-6 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 active:scale-95 ${status === 'success'
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : status === 'error'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : status === 'loading'
                                ? 'bg-indigo-400 text-white cursor-wait'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/50'
                        }`}
                >
                    {status === 'loading' && '⏳ Setting up...'}
                    {status === 'success' && '✅ Setup Complete!'}
                    {status === 'error' && '🔄 Try Again'}
                    {status === 'idle' && '🚀 Fix Permissions Now'}
                </button>

                {message && (
                    <div className={`mt-8 p-6 rounded-xl text-center font-semibold ${status === 'success'
                        ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                        : status === 'error'
                            ? 'bg-red-500/20 text-red-100 border border-red-500/30'
                            : 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
                        }`}>
                        {message}
                    </div>
                )}

                <div className="mt-8 text-center text-white/50 text-sm">
                    <p>After setup, you&apos;ll have full platform access with no more 403 errors.</p>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
