import React, { useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { ExpenseClaim } from '@/types';
import { Plus, Search, Filter, Receipt, Calendar, User, CheckCircle2, XCircle, Clock, Camera, FileText } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/Modal';

const ExpensesView: React.FC = () => {
    const { expenseClaims, addExpenseClaim, costCodes } = useProjects();
    const { addToast } = useToast();
    const [filter, setFilter] = useState<'All' | 'My Claims' | 'Pending Approval'>('All');

    // Mock current user ID for demo
    const currentUserId = 'u1';
    const [showAddModal, setShowAddModal] = useState(false);

    const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newClaim: ExpenseClaim = {
            id: `exp-${Date.now()}`,
            projectId: 'p1', // Default
            companyId: 'c1',
            userId: currentUserId,
            userName: 'Current User', // Demo
            date: formData.get('date') as string,
            description: formData.get('description') as string,
            amount: parseFloat(formData.get('amount') as string),
            category: formData.get('category') as ExpenseClaim['category'],
            status: 'Pending',
            receiptUrl: undefined,
            costCodeId: formData.get('costCodeId') as string
        };
        await addExpenseClaim(newClaim);
        addToast("Expense claim submitted for approval", "success");
        setShowAddModal(false);
    };

    const filteredClaims = expenseClaims.filter(claim => {
        if (filter === 'My Claims') return claim.userId === currentUserId;
        if (filter === 'Pending Approval') return claim.status === 'Pending';
        return true;
    });

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Travel': return '✈️';
            case 'Food': return '🍔';
            case 'Materials': return '🏗️';
            case 'Accommodation': return '🏨';
            default: return '📦';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden border border-indigo-500/30">
                    <div className="relative z-10">
                        <div className="text-indigo-100 text-sm font-bold mb-1 uppercase tracking-wide">Pending Approval</div>
                        <div className="text-3xl font-black">£{expenseClaims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</div>
                        <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 font-medium">
                            <Clock size={12} /> {expenseClaims.filter(c => c.status === 'Pending').length} Claims waiting
                        </div>
                    </div>
                    <Receipt className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32 rotate-12" />
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-center backdrop-blur-sm">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-2">My Spending (YTD)</div>
                    <div className="text-2xl font-bold text-white">£1,240.50</div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[45%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-medium">45% of annual allowance</div>
                </div>

                <div
                    onClick={() => setShowAddModal(true)}
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-all border-dashed hover:border-slate-600 group active:scale-95"
                >
                    <div className="text-center">
                        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform group-hover:bg-indigo-500 group-hover:text-white border border-indigo-500/30">
                            <Camera size={24} />
                        </div>
                        <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">Snap Receipt</h3>
                        <p className="text-xs text-slate-500 group-hover:text-slate-400">Auto-scan with AI</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                    <div className="flex gap-2">
                        {['All', 'My Claims', 'Pending Approval'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Filter size={18} /></button>
                    </div>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {filteredClaims.length > 0 ? (
                        filteredClaims.map((claim) => (
                            <div key={claim.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-700/50">
                                        {getCategoryIcon(claim.category)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{claim.description}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><User size={12} /> {claim.userName}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {claim.date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="font-bold text-white">£{claim.amount.toFixed(2)}</div>
                                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 border ${claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                            {claim.status}
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {claim.status === 'Pending' && (
                                            <>
                                                <button className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20" title="Approve"><CheckCircle2 size={18} /></button>
                                                <button className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20" title="Reject"><XCircle size={18} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            <Receipt className="mx-auto mb-3 opacity-20" size={48} />
                            No expense claims found matching this filter.
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Submit Expense Claim">
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input name="description" required placeholder="e.g. Client Lunch" className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Category</label>
                            <select name="category" className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none bg-white">
                                <option>Travel</option>
                                <option>Food</option>
                                <option>Accommodation</option>
                                <option>Materials</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Total Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">£</span>
                            <input type="number" step="0.01" name="amount" required placeholder="0.00" className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none font-mono" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Cost Code (Optional)</label>
                        <select name="costCodeId" className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none bg-white">
                            <option value="">No Cost Code</option>
                            {costCodes.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.description}</option>)}
                        </select>
                    </div>

                    {/* Placeholder for receipt upload */}
                    <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center cursor-pointer hover:bg-zinc-50">
                        <Camera className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-xs text-zinc-500">Add Receipt Image (Optional)</span>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50">Cancel</button>
                        <button type="submit" className="flex-1 py-2.5 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] shadow-lg">Submit Claim</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ExpensesView;
