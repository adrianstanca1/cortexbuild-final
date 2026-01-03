import React, { useState } from 'react';
import { Search, Plus, Filter, MessageSquare, Clock, CheckCircle2, User, FileText, ChevronRight, X } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSync } from '@/contexts/SyncContext';
import { Modal } from '@/components/Modal';
import { Comments } from '@/components/Comments';
import { RFI } from '@/types';

const RFIView: React.FC = () => {
    const { projects, rfis, addRFI, updateRFI } = useProjects();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { isOnline, queueAction } = useSync();

    const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // New RFI Form
    const [newRfi, setNewRfi] = useState({
        subject: '',
        question: '',
        assignedTo: '',
        dueDate: ''
    });
    const [answerText, setAnswerText] = useState('');
    const [isAnswering, setIsAnswering] = useState(false);

    const handleCreate = async (initialStatus: 'Draft' | 'Open' = 'Open') => {
        if (!newRfi.subject || !newRfi.question) return;

        // Ensure we have a valid project ID
        const projectId = projects[0]?.id || '';
        if (!projectId) {
            addToast("No project found to attach RFI to.", "error");
            return;
        }

        const rfi: RFI = {
            id: crypto.randomUUID(),
            projectId: projectId,
            number: `RFI-${String(rfis.length + 1).padStart(3, '0')}`,
            subject: newRfi.subject,
            question: newRfi.question,
            assignedTo: newRfi.assignedTo || 'Unassigned',
            status: initialStatus,
            dueDate: newRfi.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString().split('T')[0]
        };

        try {
            if (!isOnline) {
                await queueAction('/api/rfis', 'POST', rfi, 'rfi');
                addToast(`RFI Saved Offline (Will sync when online)`, "info");
                setIsCreating(false);
                setNewRfi({ subject: '', question: '', assignedTo: '', dueDate: '' });
                return;
            }

            await addRFI(rfi);
            setIsCreating(false);
            setNewRfi({ subject: '', question: '', assignedTo: '', dueDate: '' });
            addToast(`RFI ${initialStatus === 'Draft' ? 'Saved as Draft' : 'Created'} Successfully`, "success");
        } catch (error) {
            console.error("Failed to create RFI", error);
            addToast("Failed to create RFI", "error");
        }
    };

    const handleSubmitDraft = async () => {
        if (!selectedRfi) return;
        try {
            await updateRFI(selectedRfi.id, { status: 'Open' });
            addToast("RFI Submitted Successfully", "success");
            setSelectedRfi(prev => prev ? { ...prev, status: 'Open' } : null);
        } catch (error) {
            console.error("Failed to submit RFI", error);
            addToast("Failed to submit RFI", "error");
        }
    };

    const handleAnswerSubmit = async () => {
        if (!selectedRfi || !answerText.trim()) return;
        try {
            await updateRFI(selectedRfi.id, {
                answer: answerText,
                status: 'Closed',
                // resolvedAt: new Date().toISOString() // Assuming we might want this later
            });
            addToast("RFI Answered and Closed", "success");
            setIsAnswering(false);
            setAnswerText('');
            // Optimistically update selectedRfi to reflect changes immediately in the detail view
            setSelectedRfi(prev => prev ? { ...prev, answer: answerText, status: 'Closed' } : null);
        } catch (error) {
            console.error("Failed to update RFI", error);
            addToast("Failed to submit answer", "error");
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto h-full flex flex-col bg-zinc-50 relative">

            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight">RFIs</h1>
                    <p className="text-zinc-500 mt-1">Requests for Information tracking and management.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-[#0f5c82] hover:bg-[#0c4a6e] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/10 transition-all active:scale-95"
                >
                    <Plus size={20} /> New RFI
                </button>
            </div>

            <div className="flex gap-8 h-full overflow-hidden">

                {/* List View */}
                <div className={`${selectedRfi ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/3 bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden`}>
                    <div className="p-4 border-b border-zinc-100 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search RFIs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-[#0f5c82]"
                            />
                        </div>
                        <button className="p-3 bg-zinc-50 rounded-xl text-zinc-500 hover:text-zinc-800">
                            <Filter size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {rfis.filter(r => r.subject.toLowerCase().includes(searchQuery.toLowerCase())).map(rfi => (
                            <div
                                key={rfi.id}
                                onClick={() => setSelectedRfi(rfi)}
                                className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedRfi?.id === rfi.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-transparent hover:bg-zinc-50 hover:border-zinc-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{rfi.number}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rfi.status === 'Open' ? 'bg-amber-100 text-amber-700' : rfi.status === 'Draft' ? 'bg-zinc-200 text-zinc-600' : 'bg-green-100 text-green-700'}`}>
                                        {rfi.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-zinc-900 mb-1 line-clamp-1">{rfi.subject}</h3>
                                <div className="flex items-center gap-4 text-xs text-zinc-500">
                                    <div className="flex items-center gap-1">
                                        <User size={12} /> {rfi.assignedTo}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} /> {rfi.dueDate}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail View */}
                <div className={`${selectedRfi ? 'flex' : 'hidden lg:flex text-center justify-center items-center'} flex-1 bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden p-8 relative`}>
                    {selectedRfi ? (
                        <div className="flex flex-col h-full w-full">
                            <div className="flex justify-between items-start border-b border-zinc-100 pb-6 mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-black text-zinc-900">{selectedRfi.subject}</h2>
                                        <span className="text-sm font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-lg">{selectedRfi.number}</span>
                                    </div>
                                    <p className="text-zinc-500 flex items-center gap-2">
                                        Created on {selectedRfi.createdAt} <ChevronRight size={14} /> Assigned to <span className="font-bold text-zinc-700">{selectedRfi.assignedTo}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedRfi(null)}
                                    className="lg:hidden p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-8">
                                {/* Question Section */}
                                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <MessageSquare size={16} /> Question
                                    </h3>
                                    <p className="text-zinc-800 leading-relaxed font-medium">
                                        {selectedRfi.question}
                                    </p>
                                </div>

                                {/* Action Section for Drafts */}
                                {selectedRfi.status === 'Draft' && (
                                    <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 text-center">
                                        <p className="text-zinc-500 mb-4 font-medium">This RFI is currently a draft.</p>
                                        <button
                                            onClick={handleSubmitDraft}
                                            className="px-6 py-3 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 mx-auto w-full sm:w-auto"
                                        >
                                            <CheckCircle2 size={18} /> Submit RFI
                                        </button>
                                    </div>
                                )}

                                {/* Answer Section */}
                                {selectedRfi.status !== 'Draft' && (
                                    selectedRfi.answer ? (
                                        <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100">
                                            <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <CheckCircle2 size={16} /> Official Response
                                            </h3>
                                            <p className="text-zinc-800 leading-relaxed font-medium">
                                                {selectedRfi.answer}
                                            </p>
                                        </div>
                                    ) : isAnswering ? (
                                        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                                            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3">Submit Official Response</h3>
                                            <textarea
                                                value={answerText}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                                className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none resize-none mb-4 font-medium"
                                                placeholder="Enter the official answer or resolution..."
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setIsAnswering(false)}
                                                    className="px-4 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAnswerSubmit}
                                                    className="px-6 py-2 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] shadow-lg shadow-blue-900/10"
                                                >
                                                    Submit & Close RFI
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-zinc-200 rounded-3xl p-8 text-center bg-zinc-50">
                                            <p className="text-zinc-400 font-bold mb-4">No official response yet.</p>
                                            <button
                                                onClick={() => setIsAnswering(true)}
                                                className="px-6 py-2 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl shadow-sm hover:bg-zinc-50"
                                            >
                                                Submit Answer
                                            </button>
                                        </div>
                                    )
                                )}

                                {/* Comments Section */}
                                <div className="mt-8 border-t border-zinc-200 pt-6">
                                    <Comments entityType="rfi" entityId={selectedRfi.id} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-zinc-400 flex flex-col items-center">
                            <FileText size={64} className="mb-4 opacity-20" />
                            <p className="font-bold text-lg">Select an RFI to view details</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-zinc-900">Create New RFI</h3>
                            <button onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={newRfi.subject}
                                    onChange={e => setNewRfi({ ...newRfi, subject: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#0f5c82]"
                                    placeholder="Brief subject..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Question</label>
                                <textarea
                                    value={newRfi.question}
                                    onChange={e => setNewRfi({ ...newRfi, question: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#0f5c82] h-32 resize-none"
                                    placeholder="Detailed question..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Assigned To</label>
                                    <input
                                        type="text"
                                        value={newRfi.assignedTo}
                                        onChange={e => setNewRfi({ ...newRfi, assignedTo: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#0f5c82]"
                                        placeholder="Name..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={newRfi.dueDate}
                                        onChange={e => setNewRfi({ ...newRfi, dueDate: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-700 focus:ring-2 focus:ring-[#0f5c82]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-3 font-bold text-zinc-500 hover:text-zinc-800">Cancel</button>
                            <button onClick={() => handleCreate('Draft')} className="px-6 py-3 font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl">Save Draft</button>
                            <button onClick={() => handleCreate('Open')} className="px-8 py-3 bg-[#0f5c82] text-white rounded-xl font-bold hover:bg-[#0c4a6e] shadow-lg shadow-blue-900/10">Create RFI</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RFIView;
