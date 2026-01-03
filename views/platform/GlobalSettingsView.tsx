import React, { useState, useEffect } from 'react';
import {
    Settings, Globe, Palette, Mail, Shield,
    Key, Save, RefreshCw, Upload, Smartphone,
    Lock, Bell, Database, Sparkles
} from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

const GlobalSettingsView: React.FC = () => {
    const { addToast } = useToast();
    const [config, setConfig] = useState<any>({
        platformName: '',
        supportEmail: '',
        primaryColor: '#6366f1',
        maintenanceMode: false,
        allowRegistrations: false,
        apiKeys: { googleMaps: '', sendGrid: '', openAi: '' }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'integrations' | 'security'>('general');

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const data = await db.getPlatformConfig();
                setConfig((prev: any) => ({ ...prev, ...data }));
            } catch (error) {
                console.error('Config load failed', error);
                addToast('Using default settings (Config failed)', 'warning');
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.updatePlatformConfig(config);
            addToast('System configuration saved successfully', 'success');
        } catch (error) {
            addToast('Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-full flex-col gap-4">
                <div className="text-zinc-400 font-bold">Failed to load configuration</div>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'integrations', label: 'Integrations', icon: Key },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Settings className="w-8 h-8 text-indigo-600" />
                        Platform Settings
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Global configuration, branding, and infrastructure controls
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Changes
                </button>
            </div>

            <div className="flex gap-6">
                {/* Fixed Sidebar for Tabs */}
                <div className="w-64 shrink-0 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                    <div className="p-8">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Platform Name</label>
                                        <input
                                            type="text"
                                            value={config?.platformName || ''}
                                            onChange={e => setConfig({ ...config, platformName: e.target.value })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Support Email</label>
                                        <input
                                            type="email"
                                            value={config.supportEmail}
                                            onChange={e => setConfig({ ...config, supportEmail: e.target.value })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
                                            <Database size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-white">Maintenance Mode</p>
                                            <p className="text-xs text-zinc-500">Temporarily disable public access to the entire platform.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${config.maintenanceMode ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-700">
                                    <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Bell size={18} className="text-amber-500" />
                                        Public Features
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                            <div>
                                                <p className="text-sm font-bold">New Registrations</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">Allow new tenants to sign up</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={config.allowRegistrations}
                                                onChange={e => setConfig({ ...config, allowRegistrations: e.target.checked })}
                                                className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                            <div>
                                                <p className="text-sm font-bold">Demo Instances</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">Auto-generate demo accounts</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                defaultChecked
                                                className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'branding' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex gap-8">
                                    <div className="w-48 space-y-4">
                                        <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-400 p-4 text-center cursor-pointer hover:border-indigo-500 hover:text-indigo-500 transition-all">
                                            <Upload size={32} />
                                            <span className="text-xs font-bold">Upload Logo (512x512)</span>
                                        </div>
                                        <button className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-indigo-600 transition-colors">Remove Logo</button>
                                    </div>
                                    <div className="flex-1 space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Primary Brand Hue</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="color"
                                                    value={config.primaryColor}
                                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                                    className="w-16 h-16 rounded-xl border-4 border-white dark:border-zinc-900 shadow-xl cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={config.primaryColor}
                                                        onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 outline-none font-mono text-sm"
                                                    />
                                                    <p className="text-[10px] text-zinc-500 mt-1 font-medium">This hue applies to buttons, active states, and global accents.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-700">
                                            <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                                                <Smartphone size={16} className="text-indigo-500" />
                                                Live Preview
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: config.primaryColor }} />
                                                    <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="h-8 flex-1 rounded-xl shadow-sm" style={{ backgroundColor: config.primaryColor }} />
                                                    <div className="h-8 flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Key size={18} className="text-indigo-600" />
                                        System Credentials
                                    </h3>
                                    <p className="text-xs text-zinc-500">API keys used for background platform services like Maps, Emails, and AI processing.</p>
                                </div>

                                {Object.entries(config.apiKeys).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</label>
                                            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Active</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1 relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        apiKeys: { ...config.apiKeys, [key]: e.target.value }
                                                    })}
                                                    placeholder="Enter new API key"
                                                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-9 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setConfig({
                                                        ...config,
                                                        apiKeys: { ...config.apiKeys, [key]: '' }
                                                    });
                                                    addToast(`Ready to update ${key} key`, 'info');
                                                }}
                                                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                            >
                                                Clear / Update
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Shield className="text-green-500" size={18} />
                                        Platform Security Hardening
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { id: 'enforce2FA', title: 'Global 2FA Enforcement', desc: 'Require 2FA for all SuperAdmin and Company Admin accounts.' },
                                            { id: 'sessionIpLock', title: 'Session IP Lock', desc: 'Restricts active sessions to the IP they were created on.' },
                                            { id: 'strictCsp', title: 'Strict CSP Policy', desc: 'Enable maximum protection against XSS and injection attacks.' },
                                            { id: 'auditLogging', title: 'Audit Detail Persistence', desc: 'Store raw request/response payloads in logs.' }
                                        ].map((item) => (
                                            <div key={item.id} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.title}</p>
                                                    <p className="text-xs text-zinc-500">{item.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setConfig({ ...config, [item.id]: !config[item.id] })}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${config[item.id] ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config[item.id] ? 'translate-x-7' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

    );
};

export default GlobalSettingsView;
