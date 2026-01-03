import React, { useState, useEffect } from 'react';
import {
    Users, Search, Mail, Building2, Shield,
    Calendar, MoreVertical, Plus, X, UserPlus,
    Trash2, Edit2, AlertTriangle, Check, LogOut, Lock, UserX, UserCheck, Eye
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

/**
 * PlatformMembersView
 * Superadmin-only view for cross-tenant user management
 */
const PlatformMembersView: React.FC = () => {
    const { addToast } = useToast();
    const { impersonateUser } = useAuth();
    const { tenants, refreshTenants } = useTenant(); // Keep for company dropdown
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: UserRole.OPERATIVE,
        companyId: '',
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await db.getAllPlatformUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
            addToast('Failed to load global user list', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.companyId) {
            addToast('Please select a company', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await db.createUser({
                name: formData.name,
                email: formData.email,
                role: formData.role
            }, formData.companyId);
            addToast(`User ${formData.name} created successfully`, 'success');
            setShowAddModal(false);
            setFormData({ name: '', email: '', role: UserRole.OPERATIVE, companyId: '' });
            loadUsers();
        } catch (error) {
            console.error(error);
            addToast('Failed to create user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            // Update role via API
            if (formData.role !== selectedUser.role) {
                await db.updatePlatformUserRole(selectedUser.id, formData.role);
            }
            // Add name update endpoint later if needed, mostly role is critical

            addToast('User updated successfully', 'success');
            setShowEditModal(false);
            loadUsers();
        } catch (error) {
            console.error(error);
            addToast('Failed to update user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await db.updateUserStatus(userId, newStatus);
            setUsers((users || []).map(u => u.id === userId ? { ...u, status: newStatus } : u));
            addToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`, 'success');
        } catch (e) {
            console.error('Failed to update status', e);
            addToast('Failed to update user status', 'error');
        }
    };

    const handleImpersonate = async (userId: string) => {
        if (!confirm('Are you sure you want to impersonate this user?')) return;
        try {
            await impersonateUser(userId);
            window.location.href = '/dashboard';
        } catch (e) {
            console.error('Impersonation failed', e);
            addToast('Failed to impersonate user', 'error');
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        try {
            await db.deleteUser(selectedUser.id);
            addToast('User removed from platform', 'success');
            setShowDeleteConfirm(false);
            loadUsers();
        } catch (error) {
            addToast('Failed to delete user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async (userId: string) => {
        if (!confirm('Send password reset email to this user?')) return;
        try {
            await db.resetUserPassword(userId);
            addToast('Password reset email sent', 'success');
        } catch (e) {
            addToast('Failed to trigger password reset', 'error');
        }
    };

    const filteredUsers = (users || []).filter(user =>
        user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeStyles = (role: string) => {
        const styles: Record<string, string> = {
            SUPERADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            COMPANY_ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            PROJECT_MANAGER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            FINANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            SUPERVISOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            OPERATIVE: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300',
            READ_ONLY: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300',
        };
        return styles[role] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300';
    };

    const stats = [
        { label: 'Total Users', value: (users || []).length, icon: Users, color: 'blue' },
        { label: 'Superadmins', value: (users || []).filter(m => m.role === 'SUPERADMIN').length, icon: Shield, color: 'purple' },
        { label: 'Company Admins', value: (users || []).filter(m => m.role === 'COMPANY_ADMIN').length, icon: Building2, color: 'blue' },
        { label: 'Active Sessions', value: '142', icon: Check, color: 'green' }, // Mock for now
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Platform Members
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Cross-tenant user provisioning and management
                    </p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ name: '', email: '', role: UserRole.OPERATIVE, companyId: '' });
                        setShowAddModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                    <UserPlus size={18} />
                    Add New User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                                    <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400 ml-0`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search users by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
            </div>

            {/* Members Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Company</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No users found match your search.</td></tr>
                            ) : (
                                filteredUsers.map((member, idx) => (
                                    <tr key={`${member.companyId}-${member.id || idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                                                    {member.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-white">{member.name || 'Unknown'}</p>
                                                    <p className="text-xs text-zinc-500">ID: {member.id || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-zinc-400" />
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{member.companyName || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getRoleBadgeStyles(member.role || 'READ_ONLY')}`}>
                                                {member.role?.replace('_', ' ') || 'READ ONLY'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status !== 'suspended' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {member.status || 'active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handlePasswordReset(member.id)}
                                                    title="Reset Password"
                                                    className="p-1.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                                                >
                                                    <Lock size={16} />
                                                </button>

                                                {member.status !== 'suspended' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(member.id, 'suspended')}
                                                        title="Suspend User"
                                                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    >
                                                        <UserX size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(member.id, 'active')}
                                                        title="Activate User"
                                                        className="p-1.5 text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                                    >
                                                        <UserCheck size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleImpersonate(member.id)}
                                                    title="Impersonate"
                                                    className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(member);
                                                        setFormData({
                                                            name: member.name,
                                                            email: member.email,
                                                            role: (member.role as UserRole) || UserRole.OPERATIVE,
                                                            companyId: member.companyId
                                                        });
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-indigo-50 dark:bg-zinc-900">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <UserPlus className="text-indigo-600" />
                                Provision New User
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Assign Company</label>
                                    <select
                                        required
                                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                        value={formData.companyId}
                                        onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                                    >
                                        <option value="">Select Company</option>
                                        {tenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Role</label>
                                    <select
                                        required
                                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any as UserRole })}
                                    >
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                                Create System Account
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-indigo-50 dark:bg-zinc-900">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Edit2 className="text-indigo-600" />
                                Edit User Access
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">User</label>
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    <p className="font-bold text-zinc-900 dark:text-white">{formData.name}</p>
                                    <p className="text-xs text-zinc-500">{formData.email}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Role</label>
                                <select
                                    required
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any as UserRole })}
                                >
                                    {Object.values(UserRole).map(role => (
                                        <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-zinc-200 dark:border-zinc-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Delete User?</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
                            This will permanently remove <span className="font-bold text-zinc-900 dark:text-white">{selectedUser?.name}</span> from the platform.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 text-zinc-500 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isSubmitting}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformMembersView;
