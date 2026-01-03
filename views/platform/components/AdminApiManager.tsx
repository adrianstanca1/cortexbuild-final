import React, { useState, useEffect } from 'react';
import { Key, Webhook, Plus, Trash2, Shield, Search, RefreshCw, Send, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

export const AdminApiManager: React.FC = () => {
    const { addToast } = useToast();
    const [keys, setKeys] = useState<any[]>([]);
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'keys' | 'webhooks'>('keys');

    // Key Creation State
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyGenerated, setNewKeyGenerated] = useState<any>(null);

    // Webhook Creation State
    const [showWebhookModal, setShowWebhookModal] = useState(false);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: ['company.created', 'user.invited'] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [keysData, webhooksData] = await Promise.all([
                db.getAPIKeys(),
                db.getWebhooks()
            ]);
            setKeys(keysData);
            setWebhooks(webhooksData);
        } catch (e) {
            console.error("Failed to load API data", e);
            addToast("Failed to load API management data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        try {
            const res = await db.createAPIKey({
                name: newKeyName,
                permissions: ['read', 'write'],
                expiresInDays: 365
            });
            setNewKeyGenerated(res);
            addToast("API Key generated successfully", "success");
            loadData();
        } catch (e) {
            addToast("Failed to generate API Key", "error");
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This action is permanent and will break any integrations using it.")) return;
        try {
            await db.deleteAPIKey(id);
            addToast("API Key revoked", "success");
            loadData();
        } catch (e) {
            addToast("Failed to revoke API key", "error");
        }
    };

    const handleCreateWebhook = async () => {
        if (!newWebhook.name || !newWebhook.url) return;
        try {
            await db.createWebhook(newWebhook);
            addToast("Webhook registered successfully", "success");
            setShowWebhookModal(false);
            setNewWebhook({ name: '', url: '', events: ['company.created', 'user.invited'] });
            loadData();
        } catch (e) {
            addToast("Failed to register webhook", "error");
        }
    };

    const handleTestWebhook = async (id: string) => {
        try {
            const res = await db.testWebhook(id);
            if (res.success) {
                addToast(`Test successful! Status: ${res.status}`, "success");
            } else {
                addToast(`Test failed: ${res.error || 'Server unreachable'}`, "error");
            }
            loadData();
        } catch (e) {
            addToast("Failed to initiate test", "error");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl animate-pulse">
                <Shield className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium">Securing API perimeter...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveSection('keys')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === 'keys' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    API Keys
                </button>
                <button
                    onClick={() => setActiveSection('webhooks')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === 'webhooks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Webhooks
                </button>
            </div>

            {activeSection === 'keys' ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Access Tokens</h2>
                            <p className="text-sm text-gray-500">Manage platform-level authentication keys for external services.</p>
                        </div>
                        <button
                            onClick={() => { setShowKeyModal(true); setNewKeyGenerated(null); setNewKeyName(''); }}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-zinc-900/20"
                        >
                            <Plus size={16} /> New API Key
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Key Fragment</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Used</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {keys.map((key) => (
                                    <tr key={key.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{key.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">Created by {key.createdBy}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">{key.apiKey}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase tracking-tighter">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never used'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {keys.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">No active API keys found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Outgoing Webhooks</h2>
                            <p className="text-sm text-gray-500">Automate real-time notification delivery to third-party endpoints.</p>
                        </div>
                        <button
                            onClick={() => setShowWebhookModal(true)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-zinc-900/20"
                        >
                            <Plus size={16} /> Register Endpoint
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {webhooks.map((webhook) => (
                            <div key={webhook.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Webhook size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{webhook.name}</h4>
                                            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{webhook.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleTestWebhook(webhook.id)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Send Test Payload"><Send size={16} /></button>
                                        <button onClick={() => { if (confirm('Delete webhook?')) db.deleteWebhook(webhook.id).then(loadData) }} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target URL</p>
                                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <code className="text-xs text-gray-600 font-mono truncate flex-1">{webhook.url}</code>
                                            <ExternalLink size={12} className="text-gray-300" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subscribed Events</p>
                                        <div className="flex flex-wrap gap-1">
                                            {webhook.events.map((e: string) => (
                                                <span key={e} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase">{e}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-2 flex items-center justify-between border-t border-gray-50">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Active</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400">Last Triggered: {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleTimeString() : 'Never'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Key Creation Modal */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Create New API Key</h3>
                            <p className="text-gray-500 text-sm mb-6">Assign a unique identifier for your external integration.</p>

                            {!newKeyGenerated ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Key Display Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Finance Reporting Service"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors"
                                            value={newKeyName}
                                            onChange={e => setNewKeyName(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateKey}
                                        disabled={!newKeyName.trim()}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                    >
                                        Generate Token
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
                                        <AlertTriangle size={20} className="shrink-0" />
                                        <p className="text-xs font-medium leading-relaxed">
                                            <strong>Immediate Action Required:</strong> Copy this key now. It will never be shown again for security reasons.
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 relative group">
                                        <code className="text-emerald-400 font-mono text-sm break-all">{newKeyGenerated.apiKey}</code>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(newKeyGenerated.apiKey); addToast("Copied to clipboard", "success"); }}
                                            className="absolute top-2 right-2 text-zinc-500 hover:text-white transition-colors p-1"
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowKeyModal(false)}
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Done, I&apos;ve saved it
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Webhook Modal - Similar structure */}
            {showWebhookModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Register Webhook</h3>
                            <div className="space-y-4 mt-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Destination Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Slack Integration"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors"
                                        value={newWebhook.name}
                                        onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Endpoint URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://api.myapp.com/webhooks/buildpro"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors"
                                        value={newWebhook.url}
                                        onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowWebhookModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all">Cancel</button>
                                    <button onClick={handleCreateWebhook} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">Register</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
