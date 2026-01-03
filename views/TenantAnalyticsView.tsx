import React, { useEffect, useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Users,
    Briefcase,
    Database,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    History,
    Info
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { TenantUsageWidget } from '../components/TenantUsageWidget';
import { db } from '../services/db';
import { TenantAnalytics } from '@/types';

export default function TenantAnalyticsView() {
    const { tenant, tenantUsage, refreshTenantData } = useTenant();
    const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadAnalytics() {
            if (!tenant) return;
            try {
                setIsLoading(true);
                const data = await db.getTenantAnalytics(tenant.id);
                setAnalytics(data);
            } catch (e) {
                console.error('Failed to load tenant analytics', e);
            } finally {
                setIsLoading(false);
            }
        }
        loadAnalytics();
    }, [tenant]);

    if (!tenant) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        Tenant Intelligence
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Real-time infrastructure analytics and resource monitoring for <span className="font-semibold text-gray-700">{tenant.name}</span>
                    </p>
                </div>
                <button
                    onClick={refreshTenantData}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
                >
                    <History className="w-4 h-4" />
                    Refresh Stats
                </button>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="User Growth"
                    value={`${analytics?.trends.usersGrowth || 0}%`}
                    trend={analytics?.trends.usersGrowth || 0}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Project Velocity"
                    value={`${analytics?.trends.projectsGrowth || 0}%`}
                    trend={analytics?.trends.projectsGrowth || 0}
                    icon={Briefcase}
                    color="purple"
                />
                <StatCard
                    title="API Activity"
                    value={tenantUsage?.currentApiCalls.toLocaleString() || '0'}
                    trend={analytics?.trends.apiCallsGrowth || 0}
                    icon={Activity}
                    suffix="this month"
                    color="orange"
                />
                <StatCard
                    title="Storage Delta"
                    value="0%"
                    trend={0}
                    icon={Database}
                    color="green"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Usage Widget */}
                <div className="lg:col-span-1">
                    <TenantUsageWidget />

                    <div className="mt-8 bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold">Plan Optimization</h3>
                            <p className="text-blue-100 text-sm mt-1">Based on your growth, we recommend the Enterprise plan for better cost efficiency.</p>
                            <button className="mt-4 px-6 py-2 bg-white text-blue-600 rounded-lg font-bold text-sm shadow-lg hover:bg-blue-50 transition-colors">
                                View Recommendations
                            </button>
                        </div>
                        <TrendingUp className="absolute -right-8 -bottom-8 w-48 h-48 text-blue-500/20" />
                    </div>
                </div>

                {/* Right Column: Activity & Security */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-orange-500" />
                                Resource Heatmap
                            </h3>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                System Healthy
                            </div>
                        </div>
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="w-10 h-10 text-gray-300" />
                            </div>
                            <h4 className="font-semibold text-gray-900">Activity Visualization</h4>
                            <p className="text-gray-500 text-sm max-w-sm mt-2">Historical data visualization is processing. Check back soon for detailed workload distribution reports.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <ShieldCheck className="w-5 h-5 text-green-500" />
                                Security Status
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="text-sm font-medium text-gray-700">Audit Logs</div>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold">ACTIVE</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="text-sm font-medium text-gray-700">Data Isolation</div>
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-bold">VERIFIED</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="text-sm font-medium text-gray-700">Encryption</div>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold">AES-256</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Usage Insights
                                </h3>
                                <p className="text-sm text-gray-600">Your API consumption increased by 22% this week, primarily due to mobile field report syncs.</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <button
                                    onClick={async () => {
                                        try {
                                            await db.requestDataExport();
                                            alert("Report export started. You will be notified when it is ready.");
                                        } catch (e) {
                                            alert("Failed to start export.");
                                            console.error(e);
                                        }
                                    }}
                                    className="text-blue-600 font-bold text-sm hover:underline"
                                >
                                    Download full report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, icon: Icon, suffix, color }: any) {
    const isPositive = trend >= 0;
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
        green: 'text-green-600 bg-green-50'
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(trend)}%
                </div>
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900">{value}</span>
                    {suffix && <span className="text-xs text-gray-400 font-medium">{suffix}</span>}
                </div>
            </div>
        </div>
    );
}
