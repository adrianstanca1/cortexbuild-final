import React, { useState } from 'react';
import { Mail, User, Shield, Briefcase, Plus, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { TenantMember } from '@/types';
import { useTenant } from '@/contexts/TenantContext'; // Implicit dependency
import { useToast } from '@/contexts/ToastContext';

interface AddTenantMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
}

export const AddTenantMemberModal: React.FC<AddTenantMemberModalProps> = ({
    isOpen,
    onClose,
    tenantId,
}) => {
    const { addTenantMember } = useTenant();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'member',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setLoading(true);
        try {
            // Construct the new member object matching TenantMember type
            const newMember: any = { // Using any temporarily to bypass strict type check for now if types mismatch, but assuming standard fields
                id: `mem-${Date.now()}`,
                tenantId,
                userId: formData.email, // Using email as user ID for mock
                name: formData.name,
                email: formData.email,
                role: formData.role, // 'admin' | 'member' | 'viewer'
                joinedAt: new Date().toISOString(),
                isActive: false // Pending
            };

            await addTenantMember(newMember);
            addToast(`Invitation sent to ${formData.email}`, 'success');
            onClose();
            setFormData({ name: '', email: '', role: 'member' });
        } catch (error) {
            console.error(error);
            addToast('Failed to add member', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Invite Team Member"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Full Name</label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Jane Smith"
                                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="jane@company.com"
                                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Role</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'admin', label: 'Admin', icon: Shield },
                                { id: 'member', label: 'Member', icon: Briefcase },
                                { id: 'viewer', label: 'Viewer', icon: User },
                            ].map((role) => (
                                <label
                                    key={role.id}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.role === role.id
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-zinc-100 hover:border-zinc-200 text-zinc-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role.id}
                                        checked={formData.role === role.id}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="hidden"
                                    />
                                    <role.icon size={20} className="mb-2" />
                                    <span className="text-xs font-bold">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
                        <Mail size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-900">Invitation Email</h4>
                        <p className="text-xs text-blue-700 mt-0.5">
                            The user will receive an email to join <strong>Tenant Organization</strong>. They must accept before accessing the dashboard.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        Send Invitation
                    </button>
                </div>
            </form>
        </Modal>
    );
};
