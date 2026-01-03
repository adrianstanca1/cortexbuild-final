import React, { useState, useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext.js';
import { Settings, Plus, Trash2, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.js';

interface AutomationRule {
    id: string;
    triggerType: string;
    condition?: string;
    action: string;
    enabled: boolean;
}

const AutomationRulesManager: React.FC<{ projectId?: string }> = ({ projectId }) => {
    const { getAutomations, createAutomation } = useProjects();
    const { addToast } = useToast();
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [newRule, setNewRule] = useState({
        triggerType: 'task_completed',
        condition: '',
        action: 'send_notification'
    });

    useEffect(() => {
        loadRules();
    }, [projectId]);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await getAutomations();
            setRules(data || []);
        } catch (err) {
            console.error("Failed to load automations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async () => {
        try {
            await createAutomation({
                name: `Rule: ${newRule.triggerType} -> ${newRule.action}`,
                triggerType: newRule.triggerType,
                actionType: newRule.action,
                configuration: {
                    condition: newRule.condition
                },
                enabled: true
            });
            addToast("Automation rule created!", "success");
            setShowAddModal(false);
            setNewRule({ triggerType: 'task_completed', condition: '', action: 'send_notification' });
            loadRules();
        } catch (err) {
            console.error("Failed to create automation", err);
            addToast("Failed to create automation rule.", "error");
        }
    };

    const triggerOptions = [
        { value: 'task_completed', label: 'Task Completed' },
        { value: 'task_status_changed', label: 'Task Status Changed' },
        { value: 'safety_incident_high', label: 'High Severity Safety Incident' },
        { value: 'rfi_created', label: 'RFI Created' },
        { value: 'rfi_status_changed', label: 'RFI Status Changed' }
    ];

    const actionOptions = [
        { value: 'send_notification', label: 'Send Notification' },
        { value: 'send_email', label: 'Send Email' },
        { value: 'create_task', label: 'Create Follow-up Task' },
        { value: 'webhook', label: 'Trigger Webhook' }
    ];

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-zinc-800">Workflow Automation</h3>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading automations...
                    </div>
                ) : rules.length === 0 ? (
                    <div className="text-center py-10 text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                        <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No automation rules yet</p>
                        <p className="text-xs mt-1">Create rules to automate notifications and workflows</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start justify-between group hover:bg-white transition-all"
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-200 text-zinc-400'}`}>
                                        {rule.enabled ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-zinc-900 mb-1">
                                            {triggerOptions.find(t => t.value === rule.triggerType)?.label || rule.triggerType}
                                        </div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                                            <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 font-mono">
                                                {actionOptions.find(a => a.value === rule.action)?.label || rule.action}
                                            </span>
                                            {rule.condition && (
                                                <span className="text-zinc-400">• {rule.condition}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button className="p-1.5 text-zinc-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Rule Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                            <h3 className="font-bold text-zinc-900 text-lg">Create Automation Rule</h3>
                            <p className="text-xs text-zinc-500 mt-1">Set up smart triggers to automate your workflow</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-700 uppercase mb-2 block">Trigger Event</label>
                                <select
                                    value={newRule.triggerType}
                                    onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    {triggerOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-700 uppercase mb-2 block">Condition (Optional)</label>
                                <input
                                    type="text"
                                    value={newRule.condition}
                                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                                    placeholder="e.g., severity >= 3"
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-700 uppercase mb-2 block">Action</label>
                                <select
                                    value={newRule.action}
                                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    {actionOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddRule}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
                            >
                                Create Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationRulesManager;
