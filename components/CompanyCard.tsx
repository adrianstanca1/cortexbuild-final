import React from 'react';
import { Building2, Users, Calendar, AlertCircle, CheckCircle, XCircle, MoreVertical, Power, Edit } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    industry?: string;
    region?: string;
    users?: number;
    projects?: number;
    mrr?: number;
    createdAt: string;
    lastActivityAt?: string;
}

interface CompanyCardProps {
    company: Company;
    onSuspend: (id: string) => void;
    onActivate: (id: string) => void;
    onViewDetails: (id: string) => void;
    onUpdatePlan?: (id: string, currentPlan: string) => void;
}

export default function CompanyCard({ company, onSuspend, onActivate, onViewDetails, onUpdatePlan }: CompanyCardProps) {
    const [showMenu, setShowMenu] = React.useState(false);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'draft':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'suspended':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'archived':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return <CheckCircle className="w-4 h-4" />;
            case 'suspended':
                return <XCircle className="w-4 h-4" />;
            default:
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan.toLowerCase()) {
            case 'enterprise':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'professional':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'starter':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{company.slug}</p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                                <button
                                    onClick={() => {
                                        onViewDetails(company.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    View Details
                                </button>
                                {onUpdatePlan && (
                                    <button
                                        onClick={() => {
                                            onUpdatePlan(company.id, company.plan);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Building2 className="w-4 h-4" />
                                        Edit Plan
                                    </button>
                                )}
                                {company.status.toLowerCase() === 'active' ? (
                                    <button
                                        onClick={() => {
                                            onSuspend(company.id);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Suspend Company
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onActivate(company.id);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Activate Company
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status and Plan Badges */}
            <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(company.status)}`}>
                    {getStatusIcon(company.status)}
                    {company.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(company.plan)}`}>
                    {company.plan}
                </span>
            </div>

            {/* Company Info */}
            {(company.industry || company.region) && (
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    {company.industry && <span>{company.industry}</span>}
                    {company.region && <span>• {company.region}</span>}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t">
                <div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Users
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{company.users || 0}</div>
                </div>
                <div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Projects
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{company.projects || 0}</div>
                </div>
                <div>
                    <div className="text-gray-500 text-xs mb-1">MRR</div>
                    <div className="text-lg font-semibold text-gray-900">
                        ${(company.mrr || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {new Date(company.createdAt).toLocaleDateString()}
                </div>
                {company.lastActivityAt && (
                    <div>
                        Active {new Date(company.lastActivityAt).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}
