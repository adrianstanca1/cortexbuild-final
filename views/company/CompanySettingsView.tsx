import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Globe,
    Palette,
    Bell,
    Save,
    Loader2,
    Trash2,
    Download,
    AlertTriangle
} from 'lucide-react';
import type { Tenant } from '../../types';

export default function CompanySettingsView() {
    const { user } = useAuth();
    const [company, setCompany] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'notifications' | 'data'>('general');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        async function fetchCompany() {
            if (!user?.companyId) return;
            try {
                setLoading(true);
                const data = await db.getCompanyDetails(user.companyId);
                setCompany(data);
            } catch (err) {
                console.error('Failed to load company details', err);
                setMessage({ type: 'error', text: 'Failed to load company details' });
            } finally {
                setLoading(false);
            }
        }
        fetchCompany();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        try {
            setSaving(true);
            await db.updateMyCompany({
                name: company.name,
                settings: company.settings,
                phone: company.phone,
                website: company.website,
                address: company.address,
                email: company.email
            });
            setMessage({ type: 'success', text: 'Settings saved successfully' });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error('Failed to save settings', err);
            setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleExportData = async () => {
        try {
            setMessage({ type: 'success', text: 'Data export started. You will receive an email shortly.' });
            await db.requestDataExport();
        } catch (err) {
            // ...
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!company) return <div className="p-8 text-center text-gray-500">Company not found.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your organization profile and preferences</p>
                </div>
                <div className="flex items-center gap-2">
                    {message && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={Building2}
                        label="General"
                    />
                    <TabButton
                        active={activeTab === 'branding'}
                        onClick={() => setActiveTab('branding')}
                        icon={Palette}
                        label="Branding"
                    />
                    <TabButton
                        active={activeTab === 'notifications'}
                        onClick={() => setActiveTab('notifications')}
                        icon={Bell}
                        label="Notifications"
                    />
                    <TabButton
                        active={activeTab === 'data'}
                        onClick={() => setActiveTab('data')}
                        icon={DatabaseIcon}
                        label="Data Management"
                    />
                </div>

                <div className="p-6">
                    {activeTab === 'general' && (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Company Name">
                                    <input
                                        type="text"
                                        value={company.name}
                                        onChange={e => setCompany({ ...company, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </FormField>

                                <FormField label="Support/Billing Email">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={company.email || ''}
                                            onChange={e => setCompany({
                                                ...company,
                                                email: e.target.value
                                            })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="support@company.com"
                                        />
                                    </div>
                                </FormField>

                                <FormField label="Website">
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="url"
                                            value={company.website || ''}
                                            onChange={e => setCompany({
                                                ...company,
                                                website: e.target.value
                                            })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="https://company.com"
                                        />
                                    </div>
                                </FormField>

                                <FormField label="Phone">
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={company.phone || ''}
                                            onChange={e => setCompany({
                                                ...company,
                                                phone: e.target.value
                                            })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </FormField>

                                <FormField label="Address">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={company.address || ''}
                                            onChange={e => setCompany({
                                                ...company,
                                                address: e.target.value
                                            })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="123 Business St, City, Country"
                                        />
                                    </div>
                                </FormField>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'branding' && (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Brand Colors</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField label="Primary Color">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={company.settings?.primaryColor || '#2563eb'}
                                                onChange={e => setCompany({
                                                    ...company,
                                                    settings: {
                                                        ...company.settings,
                                                        primaryColor: e.target.value
                                                    }
                                                })}
                                                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-gray-500 font-mono text-sm">
                                                {company.settings?.primaryColor || '#2563eb'}
                                            </span>
                                        </div>
                                    </FormField>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Logo</h3>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                        {company.logo ? (
                                            <img src={company.logo} alt="Logo" className="max-w-full max-h-full p-2" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <button type="button" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
                                            Upload Logo
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">Recommended size: 512x512px. PNG or JPG.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Branding
                                </button>
                            </div>
                        </form>
                    )}


                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-yellow-900">Global Notification Settings</h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        These settings control the default notification behavior for all users in your organization. Users can override individual preferences in their profile settings.
                                    </p>
                                </div>
                            </div>

                            {/* Placeholder for notification settings toggle list */}
                            <div className="space-y-4 opacity-50 pointer-events-none">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <div>
                                        <div className="font-medium text-gray-900">Email Notifications</div>
                                        <div className="text-sm text-gray-500">Receive daily summaries and critical alerts via email</div>
                                    </div>
                                    <div className="w-11 h-6 bg-blue-600 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                                </div>
                            </div>

                            <p className="text-center text-gray-500 italic">Notification configuration coming soon.</p>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Export Data</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Download a comprehensive archive of your company data, including projects, tasks, and members.
                                    This functionality is compliant with GDPR data portability requirements.
                                </p>
                                <button
                                    onClick={handleExportData}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Request Data Archive
                                </button>
                            </div>

                            <div className="pt-8 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                                <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                            <Trash2 className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-900">Delete Company Information</h4>
                                            <p className="text-red-700 text-sm mt-1 mb-4">
                                                This action will permanently delete your company account and all associated data. This action cannot be undone.
                                            </p>
                                            <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm">
                                                Request Account Deletion
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${active
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function FormField({ label, children }: any) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}

function DatabaseIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    );
}
