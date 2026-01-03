import React, { useState } from 'react';
import { X, Building2, Shield, Flag, Activity, FileText } from 'lucide-react';
import FeatureManagementPanel from './FeatureManagementPanel';
import PermissionManagementPanel from './PermissionManagementPanel';
import CompanyTimeline from './CompanyTimeline';
import CompanyAuditLogs from './CompanyAuditLogs';

interface Company {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    industry?: string;
    region?: string;
    users: number;
    projects: number;
    mrr: number;
    createdAt: string;
    lastActivityAt?: string;
}

interface CompanyDetailPanelProps {
    company: Company;
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'overview' | 'features' | 'permissions' | 'timeline' | 'audit';

const CompanyDetailPanel: React.FC<CompanyDetailPanelProps> = ({ company, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview' as Tab, label: 'Overview', icon: Building2 },
        { id: 'features' as Tab, label: 'Features', icon: Flag },
        { id: 'permissions' as Tab, label: 'Permissions', icon: Shield },
        { id: 'timeline' as Tab, label: 'Timeline', icon: Activity },
        { id: 'audit' as Tab, label: 'Audit Logs', icon: FileText },
    ];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/4 lg:w-2/3 xl:w-1/2 bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between border-b border-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{company.name}</h2>
                            <p className="text-blue-100 text-sm">/{company.slug}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-gray-50 border-b border-gray-200 px-6">
                    <div className="flex gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors
                                        border-b-2 ${isActive
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Status</p>
                                        <p className="font-medium capitalize">{company.status}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Plan</p>
                                        <p className="font-medium">{company.plan}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Industry</p>
                                        <p className="font-medium">{company.industry || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Region</p>
                                        <p className="font-medium">{company.region || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                        <p className="text-sm text-blue-600 mb-1">Users</p>
                                        <p className="text-2xl font-bold text-blue-900">{company.users}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                        <p className="text-sm text-green-600 mb-1">Projects</p>
                                        <p className="text-2xl font-bold text-green-900">{company.projects}</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                        <p className="text-sm text-purple-600 mb-1">MRR</p>
                                        <p className="text-2xl font-bold text-purple-900">${company.mrr}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Created</span>
                                        <span className="font-medium">{new Date(company.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {company.lastActivityAt && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Last Activity</span>
                                            <span className="font-medium">{new Date(company.lastActivityAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Entitlements</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Manage which features are enabled for {company.name}. Changes take effect immediately.
                            </p>
                            <FeatureManagementPanel companyId={company.id} />
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Policies</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                View permission policies that apply to users within {company.name}.
                            </p>
                            <PermissionManagementPanel />
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                View chronological activity and events for {company.name}.
                            </p>
                            <CompanyTimeline companyId={company.id} />
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Logs</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Detailed audit log of all actions performed within {company.name}.
                            </p>
                            <CompanyAuditLogs companyId={company.id} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyDetailPanel;
