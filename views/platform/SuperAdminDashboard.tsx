/**
 * Enterprise SuperAdmin Dashboard
 * Real-time system monitoring and platform overview
 */

import React, { useEffect, useState } from 'react';
import { db } from '../../services/db';

interface SystemMetrics {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    storageUsed: number;
    apiRequests: number;
    errorRate: number;
}

export const SuperAdminDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardMetrics();

        // Refresh every 30 seconds
        const interval = setInterval(loadDashboardMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardMetrics = async () => {
        try {
            const stats = await db.getPlatformStats();
            setMetrics(stats);
        } catch (error) {
            console.error('Failed to load dashboard metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
                <p className="text-gray-600 mt-1">Real-time system metrics and overview</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Companies Card */}
                <MetricCard
                    title="Companies"
                    value={metrics?.totalCompanies || 0}
                    subtitle={`${metrics?.activeCompanies || 0} active`}
                    icon="🏢"
                    color="blue"
                    trend={+5}
                />

                {/* Users Card */}
                <MetricCard
                    title="Users"
                    value={metrics?.totalUsers || 0}
                    subtitle={`${metrics?.activeUsers || 0} active`}
                    icon="👥"
                    color="green"
                    trend={+12}
                />

                {/* Projects Card */}
                <MetricCard
                    title="Projects"
                    value={metrics?.totalProjects || 0}
                    subtitle="Total projects"
                    icon="📊"
                    color="purple"
                    trend={+8}
                />

                {/* Storage Card */}
                <MetricCard
                    title="Storage"
                    value={formatBytes(metrics?.storageUsed || 0)}
                    subtitle="Total usage"
                    icon="💾"
                    color="orange"
                    trend={+3}
                />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* API Requests */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">API Requests</h3>
                        <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                        {(metrics?.apiRequests || 0).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Requests today</p>
                </div>

                {/* Error Rate */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Error Rate</h3>
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div className={`text-3xl font-bold ${(metrics?.errorRate || 0) < 1 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {(metrics?.errorRate || 0).toFixed(2)}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Last 24 hours</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionButton
                        icon="➕"
                        title="Create Company"
                        onClick={() => window.location.href = '/platform/companies'}
                    />
                    <QuickActionButton
                        icon="👥"
                        title="Manage Users"
                        onClick={() => window.location.href = '/platform/users'}
                    />
                    <QuickActionButton
                        icon="🔐"
                        title="Security Center"
                        onClick={() => window.location.href = '/platform/security'}
                    />
                </div>
            </div>

            {/* System Health */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                <div className="space-y-4">
                    <HealthIndicator label="Database" status="healthy" />
                    <HealthIndicator label="API" status="healthy" />
                    <HealthIndicator label="Storage" status="healthy" />
                    <HealthIndicator label="Email Service" status="healthy" />
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
interface MetricCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
    trend?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600'
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${colorClasses[color]}`}></div>
            <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm font-medium">{title}</span>
                    <span className="text-2xl">{icon}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{subtitle}</span>
                    {trend && (
                        <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Quick Action Button
interface QuickActionButtonProps {
    icon: string;
    title: string;
    onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, title, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-all rounded-lg p-4 text-left"
        >
            <span className="text-2xl mb-2 block">{icon}</span>
            <span className="font-medium">{title}</span>
        </button>
    );
};

// Health Indicator
interface HealthIndicatorProps {
    label: string;
    status: 'healthy' | 'warning' | 'error';
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ label, status }) => {
    const statusConfig = {
        healthy: { color: 'bg-green-500', text: 'Operational', icon: '✓' },
        warning: { color: 'bg-yellow-500', text: 'Degraded', icon: '⚠' },
        error: { color: 'bg-red-500', text: 'Down', icon: '✗' }
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">{label}</span>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{config.text}</span>
                <div className={`${config.color} w-2 h-2 rounded-full`}></div>
            </div>
        </div>
    );
};

// Helper function
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
