import React, { useState } from 'react';
import { Invoice, UserRole } from '@/types';
import { X, Printer, Mail, Trash2, Plus, Edit2, Save, DollarSign, ArrowRight, CheckCircle } from 'lucide-react';

interface InvoiceDetailModalProps {
    invoice: Invoice;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedInvoice: Invoice) => void;
    onDelete: (id: string) => void;
    userRole?: UserRole;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
    invoice,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
    userRole
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedInvoice, setEditedInvoice] = useState<Invoice>(invoice);

    // Sync state when invoice changes
    React.useEffect(() => {
        setEditedInvoice(invoice);
    }, [invoice]);

    const handleStatusChange = (newStatus: Invoice['status']) => {
        const updated = { ...editedInvoice, status: newStatus };
        setEditedInvoice(updated);
        onUpdate(updated);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        // Simulation
        alert(`Invoice ${invoice.number} sent to ${invoice.vendor} via email.`);
    };

    const calculateTotals = (lines: typeof editedInvoice.lineItems) => {
        if (!lines) return { total: 0, tax: 0 };
        const subtotal = lines.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * 0.20; // 20% VAT hardcoded for demo
        return { total: subtotal + tax, tax };
    };

    const updateInvoiceState = (newLines: typeof editedInvoice.lineItems) => {
        if (!newLines) return;
        const { total, tax } = calculateTotals(newLines);
        setEditedInvoice({
            ...editedInvoice,
            lineItems: newLines,
            items: JSON.stringify(newLines), // Sync for backend
            total,
            tax,
            amount: total
        });
    };

    const handleLineItemChange = (index: number, field: string, value: string | number) => {
        const newLines = [...(editedInvoice.lineItems || [])];
        const item = { ...newLines[index], [field]: value };
        item.total = item.quantity * item.unitPrice;
        newLines[index] = item;
        updateInvoiceState(newLines);
    };

    const addLineItem = () => {
        const newLines = [...(editedInvoice.lineItems || []), { description: 'New Item', quantity: 1, unitPrice: 0, total: 0 }];
        updateInvoiceState(newLines);
    };

    const removeLineItem = (index: number) => {
        const newLines = [...(editedInvoice.lineItems || [])];
        newLines.splice(index, 1);
        updateInvoiceState(newLines);
    };

    const saveChanges = () => {
        onUpdate(editedInvoice);
        setIsEditing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:p-0 print:bg-white print:fixed print:block">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-none print:h-auto print:rounded-none">

                {/* Header - No Print */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center print:hidden">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-3">
                        Invoice Details
                        <span className="text-sm font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">#{invoice.number}</span>
                    </h2>
                    <div className="flex gap-2">
                        {!isEditing && (
                            <>
                                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-sky-500 transition-colors" title="Print">
                                    <Printer size={18} />
                                </button>
                                <button onClick={handleEmail} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-sky-500 transition-colors" title="Email Client">
                                    <Mail size={18} />
                                </button>
                                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors" title="Edit">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => onDelete(invoice.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-500 transition-colors" title="Delete Invoice">
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                        {isEditing && (
                            <button onClick={saveChanges} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold text-sm">
                                <Save size={16} /> Save
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 print:p-8 space-y-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">

                    {/* Status Banner */}
                    <div className="flex justify-between items-start print:hidden">
                        <div className="flex gap-4">
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${editedInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                editedInvoice.status === 'Overdue' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                {editedInvoice.status}
                            </div>
                            {/* Workflow Buttons */}
                            {editedInvoice.status === 'Draft' && (
                                <button onClick={() => handleStatusChange('Pending')} className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
                                    Submit for Approval <ArrowRight size={14} />
                                </button>
                            )}
                            {editedInvoice.status === 'Pending' && (
                                <button onClick={() => handleStatusChange('Approved')} className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1">
                                    Approve <CheckCircle size={14} />
                                </button>
                            )}
                            {editedInvoice.status === 'Approved' && (
                                <button onClick={() => handleStatusChange('Paid')} className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1">
                                    Mark Paid <DollarSign size={14} />
                                </button>
                            )}
                        </div>

                        <div className="text-right">
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white mb-1">INVOICE</h1>
                            <p className="text-slate-500 font-mono">#{invoice.number}</p>
                        </div>
                    </div>

                    {/* Printable Header */}
                    <div className="hidden print:flex justify-between items-start mb-8 border-b pb-8">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900">INVOICE</h1>
                            <p className="text-slate-600">BuildPro Construction Ltd.</p>
                            <p className="text-slate-500 text-sm">123 Build Street, London, UK</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 font-mono">#{invoice.number}</p>
                            <p className="text-slate-900 font-bold">{new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Vendors & Bill To */}
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">From</h4>
                            {isEditing ? (
                                <input
                                    value={editedInvoice.vendor}
                                    onChange={e => setEditedInvoice({ ...editedInvoice, vendor: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-2 py-1"
                                />
                            ) : (
                                <div className="text-lg font-bold">{editedInvoice.vendor}</div>
                            )}
                            <p className="text-slate-500 text-sm mt-1">Vendor ID: {editedInvoice.vendorId || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-500 text-xs">Date Issued</p>
                                    <p className="font-bold">{editedInvoice.date}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Due Date</p>
                                    <p className={`font-bold ${new Date(editedInvoice.dueDate) < new Date() && editedInvoice.status !== 'Paid' ? 'text-red-500' : ''}`}>
                                        {editedInvoice.dueDate}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mt-8">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest w-1/2">Description</th>
                                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                                    <th className="py-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                    {isEditing && <th className="w-10"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(editedInvoice.lineItems || []).map((item, i) => (
                                    <tr key={i} className="group">
                                        <td className="py-3">
                                            {isEditing ? (
                                                <input
                                                    value={item.description}
                                                    onChange={e => handleLineItemChange(i, 'description', e.target.value)}
                                                    className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-sky-500 outline-none"
                                                />
                                            ) : (
                                                <span className="font-medium">{item.description}</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleLineItemChange(i, 'quantity', parseFloat(e.target.value))}
                                                    className="w-20 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-sky-500 outline-none"
                                                />
                                            ) : item.quantity}
                                        </td>
                                        <td className="py-3 text-right">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={e => handleLineItemChange(i, 'unitPrice', parseFloat(e.target.value))}
                                                    className="w-24 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-sky-500 outline-none"
                                                />
                                            ) : `£${item.unitPrice.toFixed(2)}`}
                                        </td>
                                        <td className="py-3 text-right font-bold">
                                            £{item.total.toFixed(2)}
                                        </td>
                                        {isEditing && (
                                            <td className="pl-2">
                                                <button onClick={() => removeLineItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {isEditing && (
                            <button onClick={addLineItem} className="mt-4 text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
                                <Plus size={14} /> Add Item
                            </button>
                        )}

                        <div className="flex justify-end mt-8">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>£{((editedInvoice.total || 0) - (editedInvoice.tax || 0)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>VAT (20%)</span>
                                    <span>£{(editedInvoice.tax || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-black text-slate-900 dark:text-white pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <span>Total</span>
                                    <span>£{(editedInvoice.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InvoiceDetailModal;
