import React, { useState, useEffect } from 'react';
import {
    Zap, Plus, Trash2, Edit2, Play,
    ArrowRight, Check, X, AlertTriangle, Workflow
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { db } from '@/services/db';

interface Automation {
    id: string;
    name: string;
    triggerType: string;
    actionType: string;
    active: boolean;
    config: any;
    lastRun?: string;
}

const AutomationsView: React.FC = () => {
    const { addToast } = useToast();
    const { token } = useAuth();
    const { currentTenant } = useTenant();
    const { lastMessage } = useWebSocket();

    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        triggerType: 'task_completed',
        actionType: 'send_email',
        active: true
    });

    useEffect(() => {
        fetchAutomations();
    }, [currentTenant]);

    // Listen for real-time automation execution
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'automation_executed') {
            setAutomations(prev => prev.map(a =>
                a.id === lastMessage.automationId
                    ? { ...a, lastRun: lastMessage.timestamp }
                    : a
            ));
            addToast('Automation executed successfully', 'info');
        }
    }, [lastMessage]);

    const fetchAutomations = async () => {
        try {
            setLoading(true);
            const data = await db.getAutomations();
            setAutomations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch automations', error);
            setAutomations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // For updates, we use SQL console or a dedicated method if available
                await db.executeSql(`UPDATE automations SET name = '${formData.name}', triggerType = '${formData.triggerType}', actionType = '${formData.actionType}', active = ${formData.active ? 1 : 0} WHERE id = '${editingId}'`);
            } else {
                await db.createAutomation(formData);
            }

            addToast(`Automation ${editingId ? 'updated' : 'created'} successfully`, 'success');
            setShowModal(false);
            fetchAutomations();
        } catch (error) {
            addToast('Failed to save automation', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this automation?')) return;
        try {
            await db.executeSql(`DELETE FROM automations WHERE id = '${id}'`);
            addToast('Automation deleted', 'success');
            setAutomations(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            addToast('Failed to delete automation', 'error');
        }
    };

    const triggerTypes = [
        { value: 'task_completed', label: 'When a Task is Completed' },
        { value: 'phase_changed', label: 'When Project Phase Changes' },
        { value: 'rfi_created', label: 'When RFI is Created' },
        { value: 'incident_reported', label: 'When Safety Incident Reported' },
    ];

    const actionTypes = [
        { value: 'send_email', label: 'Send Email Notification' },
        { value: 'create_task', label: 'Create Follow-up Task' },
        { value: 'notify_channel', label: 'Post to Project Channel' },
        { value: 'webhook', label: 'Trigger Webhook' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Workflow className="text-indigo-600" />
                        Automations
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Create custom workflows to automate repetitive tasks
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            name: '',
                            triggerType: 'task_completed',
                            actionType: 'send_email',
                            active: true
                        });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    New Automation
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-zinc-500">Loading workflows...</div>
            ) : automations.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <Workflow className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Automations Yet</h3>
                    <p className="text-zinc-500 mb-4">Create your first workflow to save time</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Create Workflow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {automations.map(auto => (
                        <div key={auto.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${auto.active ? 'bg-green-500' : 'bg-zinc-300'}`} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${auto.active ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-500'}`}>
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{auto.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${auto.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                            {auto.active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingId(auto.id);
                                            setFormData({
                                                name: auto.name,
                                                triggerType: auto.triggerType,
                                                actionType: auto.actionType,
                                                active: auto.active
                                            });
                                            setShowModal(true);
                                        }}
                                        className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(auto.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                    <span className="font-medium text-xs uppercase tracking-wide text-zinc-500">IF</span>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                        {triggerTypes.find(t => t.value === auto.triggerType)?.label || auto.triggerType}
                                    </span>
                                </div>
                                <div className="flex justify-center">
                                    <ArrowRight className="text-zinc-300 w-4 h-4 rotate-90 md:rotate-0" />
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                    <span className="font-medium text-xs uppercase tracking-wide text-zinc-500">THEN</span>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                        {actionTypes.find(t => t.value === auto.actionType)?.label || auto.actionType}
                                    </span>
                                </div>
                            </div>

                            {auto.lastRun && (
                                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-700 flex items-center gap-2 text-xs text-zinc-500">
                                    <Play size={12} />
                                    Last run: {new Date(auto.lastRun).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {editingId ? <Edit2 className="text-indigo-500" size={20} /> : <Zap className="text-indigo-500" size={20} />}
                                {editingId ? 'Edit Automation' : 'Create New Automation'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Automation Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Email PM on Urgent Task"
                                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Trigger (When...)</label>
                                    <select
                                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        value={formData.triggerType}
                                        onChange={e => setFormData({ ...formData, triggerType: e.target.value })}
                                    >
                                        {triggerTypes.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-center text-zinc-300">
                                    <ArrowRight className="rotate-90" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Action (Then...)</label>
                                    <select
                                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        value={formData.actionType}
                                        onChange={e => setFormData({ ...formData, actionType: e.target.value })}
                                    >
                                        {actionTypes.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="active"
                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                />
                                <label htmlFor="active" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enable this automation immediately</label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                            >
                                <Check size={18} />
                                {editingId ? 'Save Changes' : 'Create Automation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationsView;
