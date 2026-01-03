import React, { useState, useEffect } from 'react';
import { Check, X, Loader, AlertCircle, Lock, Unlock } from 'lucide-react';

interface Feature {
    name: string;
    category: string;
    displayname: string;
    description?: string;
    enabled: boolean;
    requiresfeatures?: string[];
}

interface FeatureManagementPanelProps {
    companyId: string;
    readonly?: boolean;
}

const FEATURE_CATEGORIES = [
    'BILLING',
    'REPORTS',
    'INTEGRATIONS',
    'SECURITY',
    'AI_FEATURES',
    'AUTOMATION',
    'COLLABORATION',
    'ANALYTICS',
    'COMPLIANCE',
    'BRANDING',
    'ADVANCED_RBAC'
];

export default function FeatureManagementPanel({ companyId, readonly = false }: FeatureManagementPanelProps) {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    useEffect(() => {
        fetchFeatures();
    }, [companyId]);

    const fetchFeatures = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/companies/${companyId}/features`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch features');
            }

            const data = await response.json();
            setFeatures(data.features || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = async (featureName: string, enabled: boolean) => {
        if (readonly) return;

        try {
            setSaving(true);
            setError('');

            const response = await fetch(`/api/companies/${companyId}/features/${featureName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enabled })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update feature');
            }

            // Update local state
            setFeatures(features.map(f =>
                f.name === featureName ? { ...f, enabled } : f
            ));
        } catch (err: any) {
            setError(err.message);
            // Revert optimistic update
            await fetchFeatures();
        } finally {
            setSaving(false);
        }
    };

    const filteredFeatures = features.filter(f =>
        selectedCategory === 'ALL' || f.category === selectedCategory
    );

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'SECURITY':
                return <Lock className="w-4 h-4" />;
            case 'AI_FEATURES':
                return '🤖';
            case 'INTEGRATIONS':
                return '🔌';
            case 'REPORTS':
                return '📊';
            default:
                return '✨';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Feature Entitlements</h3>
                <p className="text-sm text-gray-600">
                    Manage which features are available for this company
                </p>
            </div>

            {/* Category Filter */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'ALL'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        All Features
                    </button>
                    {FEATURE_CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {category.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Features List */}
            <div className="divide-y">
                {filteredFeatures.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500">No features found in this category</p>
                    </div>
                ) : (
                    filteredFeatures.map((feature) => (
                        <div
                            key={feature.name}
                            className="p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{getCategoryIcon(feature.category)}</span>
                                        <h4 className="font-medium text-gray-900">{feature.displayname}</h4>
                                        {feature.requiresfeatures && feature.requiresfeatures.length > 0 && (
                                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                                                Depends on: {feature.requiresfeatures.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    {feature.description && (
                                        <p className="text-sm text-gray-600">{feature.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1 font-mono">{feature.name}</p>
                                </div>

                                {/* Toggle */}
                                <button
                                    onClick={() => toggleFeature(feature.name, !feature.enabled)}
                                    disabled={readonly || saving}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${feature.enabled ? 'bg-green-600' : 'bg-gray-300'
                                        } ${readonly || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feature.enabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>

                                {/* Status Icon */}
                                <div className="flex items-center justify-center w-6">
                                    {feature.enabled ? (
                                        <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <X className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    <span className="font-medium">{features.filter(f => f.enabled).length}</span> of{' '}
                    <span className="font-medium">{features.length}</span> features enabled
                </p>
                {readonly && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Read-only view
                    </p>
                )}
            </div>
        </div>
    );
}
