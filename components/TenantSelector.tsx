import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Users, Briefcase } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

export function TenantSelector() {
    const { tenant, availableTenants, setTenant } = useTenant();
    const [isOpen, setIsOpen] = useState(false);

    const handleTenantChange = (newTenant: any) => {
        setTenant(newTenant);
        setIsOpen(false);
    };

    if (!availableTenants || availableTenants.length === 0) {
        return null;
    }

    const getPlanColor = (plan: string) => {
        switch (plan?.toLowerCase()) {
            case 'enterprise':
                return 'from-purple-500 to-pink-500';
            case 'professional':
                return 'from-blue-500 to-cyan-500';
            case 'starter':
                return 'from-green-500 to-emerald-500';
            default:
                return 'from-gray-500 to-gray-600';
        }
    };

    const getPlanBadge = (plan: string) => {
        const colors = {
            enterprise: 'bg-purple-100 text-purple-700 border-purple-200',
            professional: 'bg-blue-100 text-blue-700 border-blue-200',
            starter: 'bg-green-100 text-green-700 border-green-200'
        };
        return colors[plan?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
            >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getPlanColor(tenant?.plan)} flex items-center justify-center text-white font-bold shadow-md`}>
                    {tenant?.name?.substring(0, 2).toUpperCase() || 'TC'}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-semibold text-gray-900">{tenant?.name || 'Select Tenant'}</span>
                    {tenant?.plan && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPlanBadge(tenant.plan)}`}>
                            {tenant.plan}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Switch Tenant
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">Select a company to manage</p>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {availableTenants.map((t: any) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTenantChange(t)}
                                    className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${tenant?.id === t.id ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getPlanColor(t.plan)} flex items-center justify-center text-white font-bold shadow-md flex-shrink-0`}>
                                        {t.name?.substring(0, 2).toUpperCase()}
                                    </div>

                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900">{t.name}</span>
                                            {tenant?.id === t.id && (
                                                <Check className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPlanBadge(t.plan)}`}>
                                                {t.plan}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {t.users || 0} users
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                {t.projects || 0} projects
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
