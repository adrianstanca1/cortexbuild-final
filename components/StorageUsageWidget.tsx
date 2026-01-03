import React, { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { db } from '@/services/db';

interface StorageUsageWidgetProps {
    companyId?: string; // If provided, fetch for specific company (SuperAdmin view)
}

interface StorageStats {
    used: number;
    usedMB: string;
    usedGB: string;
    quota: number;
    quotaGB: string;
    percentage: string;
    fileCount: number;
    available: number;
    availableGB: string;
}

const StorageUsageWidget: React.FC<StorageUsageWidgetProps> = ({ companyId }) => {
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStorageStats();
    }, [companyId]);

    const loadStorageStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/storage/usage', {
                credentials: 'include'
            });
            const data = await response.json();
            setStats(data.storage);
        } catch (error) {
            console.error('Failed to load storage stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 animate-pulse">
                <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"></div>
                <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const percentage = parseFloat(stats.percentage);
    const isNearLimit = percentage > 80;
    const isCritical = percentage > 95;

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-100 dark:bg-red-900/30' :
                        isNearLimit ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                        <HardDrive className={`w-5 h-5 ${isCritical ? 'text-red-600 dark:text-red-400' :
                            isNearLimit ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-blue-600 dark:text-blue-400'
                            }`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">
                            Storage Usage
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {stats.fileCount.toLocaleString()} files
                        </p>
                    </div>
                </div>

                {isCritical ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : isNearLimit ? (
                    <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {stats.usedGB} GB
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        of {stats.quotaGB} GB
                    </span>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-600 dark:bg-red-500' :
                            isNearLimit ? 'bg-yellow-500 dark:bg-yellow-400' :
                                'bg-blue-600 dark:bg-blue-500'
                            }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>

                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {percentage.toFixed(1)}% used
                    </span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {stats.availableGB} GB available
                    </span>
                </div>
            </div>

            {/* Warning Messages */}
            {isCritical && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                        ⚠️ Storage Almost Full
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        You&apos;re using {percentage.toFixed(1)}% of your storage. Please delete unused files or contact support to upgrade.
                    </p>
                </div>
            )}

            {isNearLimit && !isCritical && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                        Approaching Limit
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Consider cleaning up old files or upgrading your storage plan.
                    </p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        Used
                    </p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                        {stats.usedMB} MB
                    </p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        Files
                    </p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                        {stats.fileCount.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Action Button */}
            {isNearLimit && (
                <button
                    onClick={() => window.location.href = 'mailto:support@cortexbuildpro.com?subject=Storage Upgrade Request'}
                    className="w-full mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all"
                >
                    Request Storage Upgrade
                </button>
            )}
        </div>
    );
};

export default StorageUsageWidget;
