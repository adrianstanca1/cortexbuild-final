import React, { useState } from 'react';
import { Building2, Globe, Mail, Plus, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { addTenant } = useTenant();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        plan: 'Starter' as 'Starter' | 'Business' | 'Enterprise',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setLoading(true);
        try {
            const newTenant: any = {
                id: `t-${Date.now()}`,
                companyId: formData.name.toUpperCase().slice(0, 3) + Math.floor(Math.random() * 1000),
                name: formData.name,
                email: formData.email,
                status: 'Active',
                plan: formData.plan,
                createdAt: new Date().toISOString(),
                features: [],
                settings: {
                    timezone: 'UTC',
                    language: 'en-US',
                    currency: 'USD',
                    dateFormat: 'MM/DD/YYYY',
                    weekStart: 'monday',
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    },
                    theme: 'light',
                    logo: '',
                    primaryColor: '#0f5c82',
                    dataRetention: 365,
                    emailNotifications: true,
                    twoFactorAuth: false,
                    sso: false,
                    customBranding: false,
                },
                maxUsers: formData.plan === 'Enterprise' ? 100 : formData.plan === 'Business' ? 20 : 5,
                maxProjects: formData.plan === 'Enterprise' ? 1000 : formData.plan === 'Business' ? 50 : 10,
                storageLimit: formData.plan === 'Enterprise' ? 1000 : formData.plan === 'Business' ? 100 : 10,
            };

            await addTenant(newTenant);
            addToast(`Tenant ${formData.name} created successfully`, 'success');
            onClose();
            setFormData({ name: '', email: '', plan: 'Starter' });
        } catch (error) {
            console.error(error);
            addToast('Failed to create tenant', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Organization"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Company Name</label>
                        <div className="relative">
                            <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Acme Construction"
                                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Admin Email</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="admin@acme.com"
                                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Subscription Plan</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'Starter', label: 'Starter', price: '$49' },
                                { id: 'Business', label: 'Business', price: '$199' },
                                { id: 'Enterprise', label: 'Enterprise', price: 'Custom' },
                            ].map((plan) => (
                                <label
                                    key={plan.id}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.plan === plan.id
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-zinc-100 hover:border-zinc-200 text-zinc-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={plan.id}
                                        checked={formData.plan === plan.id}
                                        onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                                        className="hidden"
                                    />
                                    <Globe size={24} className="mb-2 opacity-50" />
                                    <span className="font-bold mb-1">{plan.label}</span>
                                    <span className="text-xs opacity-70">{plan.price}/mo</span>
                                </label>
                            ))}
                        </div>
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
                        Create Tenant
                    </button>
                </div>
            </form>
        </Modal>
    );
};
