import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, AlertTriangle, Check, FileText, Loader2, Plus } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';

interface ChecklistItem {
    id: string;
    text: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
    category: string;
}

interface Checklist {
    id: string;
    name: string;
    date: string;
    status: string;
    score?: number;
    items?: ChecklistItem[];
    safety_checklist_items?: ChecklistItem[]; // Backend nested relation name
}

// Default checklist template for new audits
const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'id'>[] = [
    { text: 'Site perimeter fencing secure and signed', status: 'PENDING', category: 'Site Safety' },
    { text: 'PPE requirements posted at all entrances', status: 'PENDING', category: 'Site Safety' },
    { text: 'Fire extinguishers inspected (monthly tag)', status: 'PENDING', category: 'Fire Safety' },
    { text: 'Electrical panels locked and labeled', status: 'PENDING', category: 'Electrical' },
    { text: 'Scaffolding tagged by competent person', status: 'PENDING', category: 'Working at Height' },
    { text: 'First aid kit stocked and accessible', status: 'PENDING', category: 'Health' },
];

const ComplianceView: React.FC = () => {
    const { addToast } = useToast();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Load checklists on mount
    useEffect(() => {
        loadChecklists();
    }, []);

    const loadChecklists = async () => {
        setLoading(true);
        try {
            const data = await db.getSafetyChecklists();
            setChecklists(data);
            if (data.length > 0) {
                selectChecklist(data[0]);
            }
        } catch (e) {
            console.error('Failed to load checklists:', e);
        } finally {
            setLoading(false);
        }
    };

    const selectChecklist = (checklist: Checklist) => {
        setActiveChecklist(checklist);
        // Flatten items from the nested structure
        const checklistItems = checklist.items || checklist.safety_checklist_items || [];
        setItems(checklistItems.map((item: any) => ({
            id: item.id,
            text: item.text,
            status: item.status,
            category: item.category
        })));
    };

    const createNewChecklist = async () => {
        try {
            const result = await db.createSafetyChecklist({
                name: `Daily Site Inspection - ${new Date().toLocaleDateString()}`,
                items: DEFAULT_CHECKLIST_ITEMS
            });
            addToast('New checklist created', 'success');
            loadChecklists();
        } catch (e) {
            addToast('Failed to create checklist', 'error');
        }
    };

    const toggleStatus = async (id: string, status: 'PASS' | 'FAIL' | 'PENDING') => {
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));

        try {
            await db.updateSafetyChecklistItem(id, { status });
        } catch (e) {
            addToast('Failed to update item', 'error');
            // Revert on error
            loadChecklists();
        }
    };

    const handleSubmit = async () => {
        if (!activeChecklist) return;
        setSubmitting(true);
        try {
            const result = await db.submitSafetyChecklist(activeChecklist.id);
            addToast(`Audit submitted! Score: ${result.score}%`, 'success');
            loadChecklists();
        } catch (e) {
            addToast('Failed to submit audit', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate score from current items
    const score = useMemo(() => {
        if (items.length === 0) return 0;
        const passed = items.filter(i => i.status === 'PASS').length;
        return Math.round((passed / items.length) * 100);
    }, [items]);

    const passCount = items.filter(i => i.status === 'PASS').length;
    const failCount = items.filter(i => i.status === 'FAIL').length;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-[#0f5c82]" size={32} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-1 flex items-center gap-3">
                        <ShieldCheck className="text-[#0f5c82]" /> Compliance Audit
                    </h1>
                    <p className="text-zinc-500">Digital safety inspections and regulatory tracking.</p>
                </div>
                <button
                    onClick={createNewChecklist}
                    className="flex items-center gap-2 bg-[#0f5c82] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0c4a6e] shadow-sm"
                >
                    <Plus size={16} /> New Audit
                </button>
            </div>

            {checklists.length === 0 ? (
                <div className="text-center py-16 bg-white border border-dashed border-zinc-200 rounded-xl">
                    <ShieldCheck size={48} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-zinc-500 mb-4">No compliance audits found</p>
                    <button
                        onClick={createNewChecklist}
                        className="bg-[#0f5c82] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#0c4a6e]"
                    >
                        Create Your First Audit
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Score Card */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="relative w-40 h-40 mb-4">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="80" cy="80" r="70" fill="none" stroke="#f4f4f5" strokeWidth="12" />
                                <circle
                                    cx="80" cy="80" r="70"
                                    fill="none"
                                    stroke={score > 80 ? '#22c55e' : score > 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="12"
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * score) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-zinc-900">{score}%</span>
                                <span className="text-xs text-zinc-500 uppercase font-bold">Compliance</span>
                            </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="font-medium text-zinc-700">{passCount} Pass</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="font-medium text-zinc-700">{failCount} Fail</span>
                            </div>
                        </div>

                        {/* Checklist selector */}
                        <div className="mt-6 w-full">
                            <select
                                value={activeChecklist?.id || ''}
                                onChange={(e) => {
                                    const cl = checklists.find(c => c.id === e.target.value);
                                    if (cl) selectChecklist(cl);
                                }}
                                className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                            >
                                {checklists.map(cl => (
                                    <option key={cl.id} value={cl.id}>
                                        {cl.name} ({cl.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                            <h3 className="font-bold text-zinc-800">{activeChecklist?.name || 'Daily Site Inspection'}</h3>
                            <span className="text-xs text-zinc-500">{activeChecklist?.date || new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="divide-y divide-zinc-100">
                            {items.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 p-1 rounded ${item.status === 'FAIL' ? 'bg-red-100 text-red-600' : item.status === 'PASS' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                            {item.status === 'FAIL' ? <AlertTriangle size={16} /> : item.status === 'PASS' ? <Check size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-zinc-900">{item.text}</div>
                                            <div className="text-xs text-zinc-500">{item.category}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => toggleStatus(item.id, 'PASS')}
                                            disabled={activeChecklist?.status === 'Submitted'}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${item.status === 'PASS' ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-green-100 hover:text-green-600'} disabled:opacity-50`}
                                        >
                                            PASS
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(item.id, 'FAIL')}
                                            disabled={activeChecklist?.status === 'Submitted'}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${item.status === 'FAIL' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-600'} disabled:opacity-50`}
                                        >
                                            FAIL
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(item.id, 'PENDING')}
                                            disabled={activeChecklist?.status === 'Submitted'}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${item.status === 'PENDING' ? 'bg-orange-400 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-orange-100 hover:text-orange-600'} disabled:opacity-50`}
                                        >
                                            N/A
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
                            {activeChecklist?.status === 'Submitted' ? (
                                <span className="text-green-600 font-medium text-sm">✓ Audit Submitted</span>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-2 bg-[#0f5c82] text-white rounded-lg font-medium hover:bg-[#0c4a6e] shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    Submit Audit Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceView;