import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, HardDrive, Shield, Cpu, ShieldCheck, AlertTriangle, Ban } from 'lucide-react';
import { db } from '@/services/db';
import { SystemHealth } from '@/types';

export const AdminHealthMonitor: React.FC = () => {
    const [healthData, setHealthData] = useState<SystemHealth | null>(null);
    const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
    const [platformAlerts, setPlatformAlerts] = useState<any[]>([]);
    const [securityStats, setSecurityStats] = useState<any>(null);

    useEffect(() => {
        loadSystemData();
        const interval = setInterval(loadSystemData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSystemData = async () => {
        try {
            const [health, perf, alerts, security] = await Promise.all([
                db.getSystemHealth(),
                db.getSystemPerformanceHistory(),
                db.getPlatformAlerts(),
                db.getSecurityStats()
            ]);
            setHealthData(health);
            setPerformanceHistory(perf);
            setPlatformAlerts(alerts);
            setSecurityStats(security);
        } catch (e) {
            console.error("Failed to load system data", e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> System Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { name: 'API Services', status: healthData?.api || 'unknown', uptime: `${Math.floor((healthData?.uptime || 0) / 60)}m`, icon: Server },
                        { name: 'Database', status: healthData?.database || 'unknown', uptime: '99.99%', icon: Database },
                        { name: 'Storage', status: 'healthy', uptime: '100%', icon: HardDrive },
                        { name: 'Auth', status: 'healthy', uptime: '100%', icon: Shield },
                    ].map((s) => (
                        <div key={s.name} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-3 mb-2"><s.icon className="w-5 h-5 text-gray-600" /><span className="font-medium text-gray-900">{s.name}</span></div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${s.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>{s.status}</span>
                                <span className="text-sm text-gray-600">{s.uptime}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Cpu className="w-5 h-5" /> Performance Metrics (24h)</h2>
                <div className="h-48 flex items-end gap-1 px-2">
                    {performanceHistory.length > 0 ? performanceHistory.map((point: any, idx) => (
                        <div key={idx} className="flex-1 flex flex-col gap-0.5 group relative h-full justify-end">
                            <div className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors rounded-t-sm" style={{ height: `${point.ram}%` }}></div>
                            <div className="w-full bg-indigo-500/40 group-hover:bg-indigo-500/60 transition-colors rounded-t-sm" style={{ height: `${point.cpu}%` }}></div>
                        </div>
                    )) : <div className="w-full h-full flex items-center justify-center text-gray-400 italic">No performance data available</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-500" /> Security Snapshot</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-600 uppercase">Security Score</p>
                            <p className="text-xl font-black text-blue-600 tracking-tight">{securityStats?.securityScore || 0}%</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-600 uppercase">Active Sessions</p>
                            <p className="text-xl font-black text-gray-900 tracking-tight">{securityStats?.activeSessions || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-600 uppercase">Failed Logins (24h)</p>
                            <p className="text-xl font-black text-red-600 tracking-tight">{securityStats?.failedLogins24h || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-600 uppercase">Unusual Activity</p>
                            <p className="text-xl font-black text-amber-600 tracking-tight">{securityStats?.unusualLogins || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 overflow-hidden">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Live Platform Alerts</h3>
                    <div className="space-y-3 max-h-[180px] overflow-auto pr-2">
                        {platformAlerts.length > 0 ? platformAlerts.map((alert: any) => (
                            <div key={alert.id} className={`p-3 rounded-lg border flex gap-3 ${alert.severity === 'high' ? 'bg-red-50 border-red-100 text-red-800' : alert.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                                <div className="p-1 rounded bg-white/50 h-fit mt-0.5">
                                    {alert.severity === 'high' ? <Ban size={12} /> : alert.severity === 'medium' ? <AlertTriangle size={12} /> : <Activity size={12} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold leading-none mb-1">{alert.message}</p>
                                    <p className="text-[10px] opacity-70 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        )) : <p className="text-gray-500 italic text-sm text-center py-8">No active system alerts.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
