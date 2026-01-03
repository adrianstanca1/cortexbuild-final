import React, { useState, useEffect } from 'react';
import {
    Shield, ShieldAlert, ShieldCheck, Lock,
    UserX, Globe, AlertTriangle,
    RefreshCcw, Search, MoreHorizontal,
    Fingerprint, Key, LogOut, Eye
} from 'lucide-react';
import { db } from '@/services/db';

/**
 * SecurityDashboardView
 * Platform-wide security monitoring for SuperAdmins
 */
const SecurityDashboardView: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [alerts, setPlatformAlerts] = useState<any[]>([]);
    const [impersonationSessions, setImpersonationSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSecurityData = async () => {
            try {
                const [statsData, alertsData, sessionsData] = await Promise.all([
                    db.getSecurityStats(),
                    db.getPlatformAlerts(),
                    db.getActiveImpersonationSessions()
                ]);
                setStats(statsData);
                setPlatformAlerts((alertsData || []).filter(a => a.type === 'security'));
                setImpersonationSessions(sessionsData || []);
            } catch (error) {
                console.error("Failed to load security data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSecurityData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-600" />
                        Security Center
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Global security posture and real-time threat detection
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                    <RefreshCcw className="w-5 h-5 text-zinc-500" />
                </button>
            </div>

            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><ShieldCheck size={60} className="text-indigo-600" /></div>
                    <p className="text-sm font-medium text-zinc-500 mb-1">Security Score</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-indigo-600">{stats?.securityScore}%</p>
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-medium">Optimal posture</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">MFA Adoption</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats?.mfaAdoption}%</p>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-700 h-1.5 rounded-full mt-3">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${stats?.mfaAdoption}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Failed Logins (24h)</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats?.failedLogins24h}</p>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Normal range</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm border-l-4 border-l-red-500">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Unusual Logins</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-red-600">{stats?.unusualLogins}</p>
                        <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                    <p className="text-xs text-red-500/80 mt-2 font-medium">Action required</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Impersonation Sessions */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden h-fit">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                        <h2 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Eye className="w-4 h-4 text-purple-600" />
                            Active Impersonation Sessions
                        </h2>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold uppercase">Live Audit</span>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                        {(impersonationSessions || []).length > 0 ? (impersonationSessions || []).map((session) => (
                            <div key={session.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                                        <Shield size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                            {session.admin_name} <span className="text-zinc-400 font-normal mx-1">impersonating</span> {session.target_name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            Started {new Date(session.created_at).toLocaleTimeString()} • Reason: {session.reason || 'Not specified'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1 justify-end">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Active
                                    </span>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">{session.id.slice(0, 8)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-zinc-500">
                                <Eye className="mx-auto mb-3 opacity-20" size={40} />
                                <p>No active impersonation sessions</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Security Alerts */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden h-fit">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                        <h2 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            Active Security Threats
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                        {(alerts || []).length > 0 ? (alerts || []).map((alert) => (
                            <div key={alert.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{alert.message}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                                </div>
                                <button className="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                                    Resolve
                                </button>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-zinc-500">
                                <ShieldCheck size={40} className="mx-auto mb-3 opacity-20" />
                                <p>No active security threats detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Controls & Tools */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
                    <h2 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-600" />
                        Global Security Policies
                    </h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Enforce MFA for Admins', icon: Fingerprint, enabled: true },
                            { label: 'Block IP Range (Anomalous)', icon: Globe, enabled: false },
                            { label: 'Automated Threat Locking', icon: ShieldAlert, enabled: true },
                            { label: 'Session Rotation (24h)', icon: RefreshCcw, enabled: true },
                        ].map((policy, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                        <policy.icon size={16} className="text-indigo-600" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{policy.label}</span>
                                </div>
                                <button className={`w-10 h-5 rounded-full relative transition-colors ${policy.enabled ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${policy.enabled ? 'left-5.5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-900 rounded-xl shadow-lg p-6 text-white overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <h2 className="font-bold mb-4 flex items-center gap-2 relative z-10">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        Administrative Cleanup
                    </h2>
                    <div className="space-y-3 relative z-10">
                        <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold flex items-center justify-between transition-all">
                            <span>Revoke All SuperAdmin Sessions</span>
                            <LogOut size={16} className="text-indigo-400" />
                        </button>
                        <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold flex items-center justify-between transition-all">
                            <span>Rotate Global API Keys</span>
                            <Key size={16} className="text-indigo-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityDashboardView;
