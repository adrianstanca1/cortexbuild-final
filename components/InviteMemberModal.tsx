
import React, { useState } from 'react';
import { X, Mail, User, Shield, Briefcase, Loader2 } from 'lucide-react';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: () => void; // Callback to refresh list
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInvite }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: UserRole.OPERATIVE as string,
        projectId: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem('sb-access-token'); // Or however we get the token
            const response = await fetch('/api/my-team/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    // tenantId is handled by authMiddleware/interceptor usually, 
                    // but let's assume global fetch wrapper or auth header does it.
                    // If using explicit fetch here, we rely on the backend extracting from user token context 
                    // or we might need to pass x-company-id if not automatically injected.
                    'x-company-id': user?.companyId || ''
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to invite member');
            }

            addToast(`Invitation sent to ${formData.email}`, 'success');
            onInvite();
            onClose();
            setFormData({ name: '', email: '', role: UserRole.OPERATIVE, projectId: '' });
        } catch (error) {
            console.error(error);
            addToast((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-zinc-900">Invite Team Member</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                            <User size={14} /> Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Jane Doe"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                            <Mail size={14} /> Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="email"
                            placeholder="e.g. jane@company.com"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                            <Shield size={14} /> Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value={UserRole.OPERATIVE}>Operative (Standard)</option>
                            <option value={UserRole.SUPERVISOR}>Supervisor</option>
                            <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                            <option value={UserRole.FINANCE}>Finance</option>
                            <option value={UserRole.READ_ONLY}>Read Only</option>
                            <option value={UserRole.COMPANY_ADMIN}>Company Admin</option>
                        </select>
                        <p className="text-[10px] text-zinc-400 mt-1">
                            Admins have full access. Operatives are restricted to assigned projects.
                        </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-[#0f5c82] text-white rounded-lg text-sm font-medium hover:bg-[#0c4a6e] transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                            {isLoading ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberModal;
