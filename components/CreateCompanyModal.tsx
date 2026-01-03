import React, { useState, useEffect } from 'react';
import { X, Building2, User, Settings, Mail, Briefcase, Check, Layers } from 'lucide-react';
import { db } from '../services/db';

// Module definitions matching backend
const MODULE_CATEGORIES = [
    {
        name: 'Core',
        modules: [
            { id: 'dashboard', name: 'Dashboard', description: 'Main control center' },
            { id: 'user_management', name: 'User Management', description: 'Team and permissions' },
            { id: 'project_management', name: 'Project Management', description: 'Project lifecycle' },
        ]
    },
    {
        name: 'Project',
        modules: [
            { id: 'task_tracking', name: 'Task Tracking', description: 'Task management' },
            { id: 'gantt_charts', name: 'Gantt Charts', description: 'Timeline visualization' },
        ]
    },
    {
        name: 'Financial',
        modules: [
            { id: 'financials', name: 'Financials', description: 'Budget tracking' },
            { id: 'invoicing', name: 'Invoicing', description: 'Invoice generation' },
            { id: 'expense_tracking', name: 'Expense Tracking', description: 'Expense management' },
        ]
    },
    {
        name: 'Client',
        modules: [
            { id: 'client_portal', name: 'Client Portal', description: 'Client access' },
            { id: 'document_sharing', name: 'Document Sharing', description: 'Share files' },
            { id: 'messaging', name: 'Messaging', description: 'Team communication' },
        ]
    },
    {
        name: 'Advanced',
        modules: [
            { id: 'ai_tools', name: 'AI Tools', description: 'AI assistance' },
            { id: 'analytics', name: 'Analytics', description: 'Data insights' },
            { id: 'reporting', name: 'Reporting', description: 'Generate reports' },
        ]
    },
    {
        name: 'Security',
        modules: [
            { id: 'audit_logs', name: 'Audit Logs', description: 'Activity tracking' },
            { id: 'compliance_tracking', name: 'Compliance', description: 'Compliance management' },
            { id: 'two_factor_auth', name: '2FA', description: 'Two-factor auth' },
        ]
    }
];

const PLAN_DEFAULT_MODULES: Record<string, string[]> = {
    'Free': ['dashboard', 'user_management', 'project_management', 'task_tracking', 'messaging'],
    'Starter': ['dashboard', 'user_management', 'project_management', 'task_tracking', 'gantt_charts', 'messaging', 'document_sharing'],
    'Professional': ['dashboard', 'user_management', 'project_management', 'task_tracking', 'gantt_charts', 'financials', 'invoicing', 'expense_tracking', 'client_portal', 'document_sharing', 'messaging', 'analytics', 'reporting', 'audit_logs'],
    'Enterprise': MODULE_CATEGORIES.flatMap(c => c.modules.map(m => m.id))
};

interface CreateCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PLAN_OPTIONS = [
    { value: 'Free', label: 'Free', description: '5 users, 3 projects', storageGB: 5 },
    { value: 'Starter', label: 'Starter', description: '15 users, 10 projects', storageGB: 10 },
    { value: 'Professional', label: 'Professional', description: '50 users, 50 projects', storageGB: 25 },
    { value: 'Enterprise', label: 'Enterprise', description: 'Unlimited users & projects', storageGB: 100 }
];

const STORAGE_OPTIONS = [
    { value: 5, label: '5 GB', description: 'Good for small teams' },
    { value: 10, label: '10 GB', description: 'Standard for most teams' },
    { value: 25, label: '25 GB', description: 'For growing companies' },
    { value: 50, label: '50 GB', description: 'Large file storage' },
    { value: 100, label: '100 GB', description: 'Enterprise-level' }
];

const INDUSTRY_OPTIONS = [
    'Construction',
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Other'
];

const REGION_OPTIONS = [
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'Europe' },
    { value: 'APAC', label: 'Asia Pacific' },
    { value: 'LATAM', label: 'Latin America' }
];

export default function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Company details
    const [companyName, setCompanyName] = useState('');
    const [legalName, setLegalName] = useState('');
    const [slug, setSlug] = useState('');
    const [industry, setIndustry] = useState('');
    const [region, setRegion] = useState('US');

    // Plan details
    const [plan, setPlan] = useState('Starter');
    const [storageQuota, setStorageQuota] = useState(10); // GB
    const [selectedModules, setSelectedModules] = useState<string[]>(PLAN_DEFAULT_MODULES['Starter']);

    // Owner details
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerTitle, setOwnerTitle] = useState('');

    // Update modules when plan changes
    useEffect(() => {
        setSelectedModules(PLAN_DEFAULT_MODULES[plan] || []);
    }, [plan]);

    const toggleModule = (moduleId: string) => {
        setSelectedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(m => m !== moduleId)
                : [...prev, moduleId]
        );
    };

    const resetForm = () => {
        setStep(1);
        setCompanyName('');
        setLegalName('');
        setSlug('');
        setIndustry('');
        setRegion('US');
        setPlan('Starter');
        setStorageQuota(10);
        setSelectedModules(PLAN_DEFAULT_MODULES['Starter']);
        setOwnerName('');
        setOwnerEmail('');
        setOwnerTitle('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleCompanyNameChange = (value: string) => {
        setCompanyName(value);
        if (!slug || slug === generateSlug(companyName)) {
            setSlug(generateSlug(value));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await db.provisionCompany({
                name: companyName,
                legalName: legalName || companyName,
                slug,
                industry,
                region,
                plan,
                ownerName,
                ownerEmail,
                ownerTitle,
                storageQuotaGB: storageQuota,
                selectedModules
            });

            // Success! Close modal first
            handleClose();

            // Call parent success callback
            onSuccess();

            // Show success notification with details
            const message = [
                `✅ Company "${companyName}" created successfully!`,
                ``,
                `📧 Activation email sent to ${ownerEmail}`,
                ``,
                `The company owner will receive an email with:`,
                `• Company details and plan information`,
                `• Secure activation link`,
                `• Instructions to set password and activate`,
                ``,
                `The company will remain in DRAFT status until the owner completes activation.`
            ].join('\n');

            alert(message);

        } catch (err: any) {
            console.error('[CreateCompany] Error:', err);
            setError(err.message || 'Failed to create company');
        } finally {
            setLoading(false);
        }
    };

    const canProceedToStep2 = companyName && slug && industry && region;
    const canProceedToStep3 = plan;
    const canSubmit = ownerName && ownerEmail;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Create New Company</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Step {step} of 3 - {step === 1 ? 'Company Details' : step === 2 ? 'Plan Selection' : 'Owner Information'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex px-6 py-4 bg-gray-50">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                {s}
                            </div>
                            {s < 3 && (
                                <div className={`flex-1 h-1 mx-2 transition-colors ${step > s ? 'bg-blue-600' : 'bg-gray-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Company Details */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    Company Name *
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:outline-none"
                                        style={{
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-base)'
                                        }}
                                        placeholder="Acme Corporation"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    Legal Name
                                </label>
                                <input
                                    type="text"
                                    value={legalName}
                                    onChange={(e) => setLegalName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:outline-none"
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: 'var(--font-size-base)'
                                    }}
                                    placeholder="Acme Corporation Inc."
                                />
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Optional - defaults to company name</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    Slug *
                                </label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:outline-none font-mono text-sm"
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    placeholder="acme-corporation"
                                />
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                    Unique identifier for the company (lowercase, no spaces)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                        Industry *
                                    </label>
                                    <select
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:outline-none"
                                        style={{
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    >
                                        <option value="">Select industry</option>
                                        {INDUSTRY_OPTIONS.map(ind => (
                                            <option key={ind} value={ind}>{ind}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Region *
                                    </label>
                                    <select
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {REGION_OPTIONS.map(reg => (
                                            <option key={reg.value} value={reg.value}>{reg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Plan & Storage Selection */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Plan Selection */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Plan</h3>
                                <div className="space-y-3">
                                    {PLAN_OPTIONS.map((planOption) => (
                                        <div
                                            key={planOption.value}
                                            onClick={() => {
                                                setPlan(planOption.value);
                                                setStorageQuota(planOption.storageGB);
                                            }}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${plan === planOption.value
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{planOption.label}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">{planOption.description}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${plan === planOption.value
                                                    ? 'border-blue-600 bg-blue-600'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {plan === planOption.value && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Storage Quota Selection */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Storage Quota</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {STORAGE_OPTIONS.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={() => setStorageQuota(option.value)}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${storageQuota === option.value
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <div className="text-2xl font-bold text-gray-900">{option.label}</div>
                                            <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-sm text-gray-600">
                                    Selected: <span className="font-semibold">{storageQuota} GB</span> dedicated storage bucket
                                </p>
                            </div>

                            {/* Module Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">Feature Modules</h3>
                                    <span className="text-sm text-gray-500">{selectedModules.length} selected</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">Customize which features are enabled for this company. Defaults are based on the selected plan.</p>
                                <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                                    {MODULE_CATEGORIES.map((category) => (
                                        <div key={category.name}>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{category.name}</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {category.modules.map((module) => (
                                                    <div
                                                        key={module.id}
                                                        onClick={() => toggleModule(module.id)}
                                                        className={`p-2 border rounded-lg cursor-pointer transition-all flex items-center gap-2 ${selectedModules.includes(module.id)
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'border-gray-200 hover:border-gray-400 bg-white'
                                                            }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedModules.includes(module.id)
                                                                ? 'bg-green-500 border-green-500'
                                                                : 'border-gray-300'
                                                            }`}>
                                                            {selectedModules.includes(module.id) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{module.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Owner Information */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={ownerEmail}
                                        onChange={(e) => setOwnerEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="john@acme.com"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    An invitation will be sent to this email
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Job Title
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={ownerTitle}
                                        onChange={(e) => setOwnerTitle(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="CEO"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Company will be created in DRAFT status</li>
                                    <li>• Owner will receive an invitation email with a secure token</li>
                                    <li>• Upon acceptance, the owner can set their password</li>
                                    <li>• Company will transition to ACTIVE status</li>
                                    <li>• Owner gets full admin access to their company</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                    <button
                        onClick={step === 1 ? handleClose : () => setStep(step - 1)}
                        className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    <div className="flex gap-3">
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !canSubmit}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors min-w-[140px]"
                            >
                                {loading ? 'Creating...' : 'Create Company'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
