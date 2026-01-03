import React from 'react';
import { Activity, Users, Briefcase, Database, TrendingUp, AlertCircle } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

const TenantUsageWidget = React.memo(() => {
    const { tenantUsage } = useTenant();

    if (!tenantUsage) {
        return null;
    }

    const getUsagePercentage = (current: number, limit: number) => {
        return Math.min((current / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const metrics = [
        {
            label: 'Users',
            icon: Users,
            current: tenantUsage.currentUsers,
            limit: tenantUsage.limit.users,
            color: 'blue'
        },
        {
            label: 'Projects',
            icon: Briefcase,
            current: tenantUsage.currentProjects,
            limit: tenantUsage.limit.projects,
            color: 'purple'
        },
        {
            label: 'Storage',
            icon: Database,
            current: Math.round(tenantUsage.currentStorage / (1024 * 1024)),
            limit: Math.round(tenantUsage.limit.storage / (1024 * 1024)),
            unit: 'MB',
            color: 'green'
        },
        {
            label: 'API Calls',
            icon: Activity,
            current: tenantUsage.currentApiCalls,
            limit: tenantUsage.limit.apiCalls,
            color: 'orange'
        }
    ];

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-400" />
                    Resource Usage
                </h3>
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{tenantUsage.period}</span>
            </div>

            <div className="space-y-6">
                {metrics.map((metric) => {
                    const percentage = getUsagePercentage(metric.current, metric.limit);
                    const isNearLimit = percentage >= 75;
                    const Icon = metric.icon;

                    return (
                        <div key={metric.label} className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 text-${metric.color}-400`} />
                                    <span>{metric.label}</span>
                                    {isNearLimit && (
                                        <AlertCircle className="w-3 h-3 text-amber-500 animate-pulse" />
                                    )}
                                </div>
                                <span className={isNearLimit ? 'text-amber-500' : 'text-zinc-500'}>
                                    {metric.current} / {metric.limit} {metric.unit || ''}
                                </span>
                            </div>

                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                                <div
                                    className={`h-full ${getUsageColor(percentage)} transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_currentColor]`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {metrics.some(m => getUsagePercentage(m.current, m.limit) >= 90) && (
                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm text-rose-200 font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Limit Reached
                    </p>
                    <p className="text-xs text-rose-300/70 mt-1 pl-6">
                        Upgrade plan to ensure continuity.
                    </p>
                    <button className="mt-3 ml-6 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-rose-900/20">
                        Upgrade
                    </button>
                </div>
            )}
        </div>
    );
});

TenantUsageWidget.displayName = 'TenantUsageWidget';

export { TenantUsageWidget };
