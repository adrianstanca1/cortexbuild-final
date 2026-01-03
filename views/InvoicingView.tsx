import React, { useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { Invoice } from '@/types';
import { Plus, Search, Filter, FileText, Calendar, DollarSign, Paperclip, MoreVertical, Zap, CheckCircle2, AlertCircle, Clock, Hash, Receipt } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/Modal';
import InvoiceDetailModal from '@/components/InvoiceDetailModal';

const InvoicingView: React.FC = () => {
    const { invoices, addInvoice, updateInvoice, deleteInvoice, activeProject, costCodes } = useProjects();
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | Invoice['status']>('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Initial line items for creation modal
    const [newLineItems, setNewLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);

    const handleAddLineItem = () => {
        setNewLineItems([...newLineItems, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    const updateNewLineItem = (index: number, field: string, value: any) => {
        const updated = [...newLineItems];
        updated[index] = { ...updated[index], [field]: value };
        setNewLineItems(updated);
    };

    const handleAddInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Calculate totals from line items
        const processedLineItems = newLineItems.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice
        })).filter(item => item.description.trim() !== ''); // Filter empty

        const subtotal = processedLineItems.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.20; // 20% VAT default
        const total = subtotal + tax;

        const newInvoice: Invoice = {
            id: `inv-${Date.now()}`,
            projectId: activeProject?.id || 'p1', // Fallback
            companyId: 'c1',
            vendor: formData.get('vendor') as string,
            number: formData.get('number') as string,
            date: formData.get('date') as string || new Date().toISOString().split('T')[0],
            dueDate: formData.get('dueDate') as string,
            total: total,
            amount: total,
            tax: tax,
            status: 'Draft',
            attachments: [],
            lineItems: processedLineItems,
            items: JSON.stringify(processedLineItems),
            costCodeId: formData.get('costCodeId') as string
        };

        await addInvoice(newInvoice);
        addToast("Invoice created successfully", "success");
        setShowAddModal(false);
        setNewLineItems([{ description: '', quantity: 1, unitPrice: 0 }]); // Reset
    };

    const handleInvoiceUpdate = async (updated: Invoice) => {
        try {
            await updateInvoice(updated.id, updated);
            addToast("Invoice updated", "success");
            setSelectedInvoice(updated); // Keep modal open with fresh data
        } catch (e) {
            addToast("Update failed", "error");
        }
    };

    const handleInvoiceDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            await deleteInvoice(id);
            setSelectedInvoice(null);
            addToast("Invoice deleted", "success");
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search invoices by vendor or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm transition-all hover:bg-slate-800 text-white placeholder-slate-500"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    {['All', 'Draft', 'Pending', 'Approved', 'Paid', 'Overdue'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === status
                                ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] transform scale-105'
                                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-400 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus size={18} /> New Invoice
                </button>
            </div>

            {/* Invoices Grid */}
            <div className="grid grid-cols-1 gap-4">
                {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            onClick={() => setSelectedInvoice(invoice)}
                            className="group bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:bg-slate-800/80 hover:border-sky-500/30 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-sky-500/5 rounded-bl-full -z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-800 rounded-xl text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg group-hover:text-sky-400 transition-colors">{invoice.vendor}</h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">#{invoice.number}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12} /> Due: {invoice.dueDate}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl font-bold text-white">£{(invoice.total || 0).toLocaleString()}</div>
                                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-2 border ${invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        invoice.status === 'Approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            invoice.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                invoice.status === 'Overdue' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                    'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                        {invoice.status === 'Paid' && <CheckCircle2 size={12} />}
                                        {invoice.status === 'Pending' && <Clock size={12} />}
                                        {invoice.status === 'Overdue' && <AlertCircle size={12} />}
                                        {invoice.status ? invoice.status.toUpperCase() : 'DRAFT'}
                                    </div>
                                </div>
                            </div>

                            {/* Actions / Info */}
                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Paperclip size={12} /> {invoice.attachments?.length || 0} Files</span>
                                    <span className="flex items-center gap-1"><Hash size={12} /> {(invoice.lineItems?.length || 0)} Items</span>
                                </div>
                                <button className="text-sky-400 text-sm font-bold hover:text-sky-300 flex items-center gap-1 transition-colors">
                                    View Full Details <MoreVertical size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-700">
                            <FileText className="text-slate-500" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No Invoices Found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mb-6">Create a new invoice or scan a document to get started.</p>
                        <button className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onUpdate={handleInvoiceUpdate}
                    onDelete={handleInvoiceDelete}
                />
            )}

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record New Invoice">
                <form onSubmit={handleAddInvoice} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Vendor Name</label>
                            <input name="vendor" required placeholder="e.g. Acme Concrete" className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f5c82]" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Invoice Number</label>
                            <input name="number" required placeholder="INV-001" className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f5c82]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Date Issued</label>
                            <input type="date" name="date" required className="w-full px-3 py-2 border border-zinc-200 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-1">Due Date</label>
                            <input type="date" name="dueDate" required className="w-full px-3 py-2 border border-zinc-200 rounded-lg" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Line Items</label>
                        <div className="space-y-2 bg-zinc-50 p-3 rounded-lg border border-zinc-200 max-h-48 overflow-y-auto">
                            {newLineItems.map((item, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        placeholder="Item description"
                                        value={item.description}
                                        onChange={e => updateNewLineItem(i, 'description', e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm border rounded"
                                    />
                                    <input
                                        type="number" placeholder="Qty" className="w-16 px-2 py-1 text-sm border rounded"
                                        value={item.quantity}
                                        onChange={e => updateNewLineItem(i, 'quantity', parseFloat(e.target.value))}
                                    />
                                    <input
                                        type="number" placeholder="Price" className="w-20 px-2 py-1 text-sm border rounded"
                                        value={item.unitPrice}
                                        onChange={e => updateNewLineItem(i, 'unitPrice', parseFloat(e.target.value))}
                                    />
                                </div>
                            ))}
                            <button type="button" onClick={handleAddLineItem} className="text-xs text-[#0f5c82] font-bold hover:underline">+ Add Item</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Cost Code (Optional)</label>
                        <select name="costCodeId" className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white">
                            <option value="">No Cost Code</option>
                            {costCodes.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.description}</option>)}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50">Cancel</button>
                        <button type="submit" className="flex-1 py-2.5 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] shadow-lg">Save Invoice</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default InvoicingView;
