/**
 * Team Management Component
 * Company Admin interface for managing team members and invitations
 */

import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';
import { useTenant } from '@/contexts/TenantContext';
import {
    Users, UserPlus, Mail, MoreVertical, Shield, Ban,
    RefreshCw, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joinedAt: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
    inviterName?: string;
}

export const TeamManagementView: React.FC = () => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

    const { addToast } = useToast();
    const { currentCompany } = useTenant();

    useEffect(() => {
        loadData();
    }, [currentCompany]);

    const loadData = async () => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            const [membersData, invitationsData] = await Promise.all([
                db.getCompanyMembers(currentCompany.id),
                db.getCompanyInvitations(currentCompany.id)
            ]);

            setMembers(membersData);
            setInvitations(invitationsData);
        } catch (error) {
            console.error('Error loading team data:', error);
            addToast('Failed to load team data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteUser = async (email: string, role: string) => {
        if (!currentCompany) return;

        try {
            await db.inviteUser(currentCompany.id, email, role);
            addToast('Invitation sent successfully', 'success');
            setShowInviteModal(false);
            loadData();
        } catch (error: any) {
            addToast(error.message || 'Failed to send invitation', 'error');
        }
    };

    const handleResendInvitation = async (invitationId: string) => {
        try {
            await db.resendInvitation(invitationId);
            addToast('Invitation resent', 'success');
            loadData();
        } catch (error) {
            addToast('Failed to resend invitation', 'error');
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;

        try {
            await db.cancelInvitation(invitationId);
            addToast('Invitation cancelled', 'success');
            loadData();
        } catch (error) {
            addToast('Failed to cancel invitation', 'error');
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        if (!confirm(`Change user role to ${newRole}?`)) return;

        try {
            await db.updateMemberRole(memberId, newRole);
            addToast('Role updated successfully', 'success');
            loadData();
        } catch (error) {
            addToast('Failed to update role', 'error');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            await db.removeMember(memberId);
            addToast('Member removed', 'success');
            loadData();
        } catch (error) {
            addToast('Failed to remove member', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            Team Management
                        </h1>
                        <p className="text-gray-600 mt-1">Manage your team members and invitations</p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserPlus size={20} />
                        Invite Member
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'members'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Team Members ({members.length})
                        {activeTab === 'members' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'invitations'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
                        {activeTab === 'invitations' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        )}
                    </button>
                </div>
            </div>

            {/* Members Tab */}
            {activeTab === 'members' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-600">Member</th>
                                <th className="text-left p-4 font-medium text-gray-600">Role</th>
                                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                                <th className="text-left p-4 font-medium text-gray-600">Joined</th>
                                <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div>
                                            <div className="font-medium text-gray-900">{member.name}</div>
                                            <div className="text-sm text-gray-600">{member.email}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${member.role === 'COMPANY_ADMIN'
                                                ? 'bg-purple-100 text-purple-700'
                                                : member.role === 'SUPERVISOR'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium ${member.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                                                }`}></span>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(member.joinedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                            >
                                                <option value="COMPANY_ADMIN">Admin</option>
                                                <option value="SUPERVISOR">Supervisor</option>
                                                <option value="OPERATIVE">Operative</option>
                                                <option value="STAFF">Staff</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove member"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-600">
                                        No team members yet. Invite your first member to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-600">Email</th>
                                <th className="text-left p-4 font-medium text-gray-600">Role</th>
                                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                                <th className="text-left p-4 font-medium text-gray-600">Expires</th>
                                <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invitations.map((invitation) => (
                                <tr key={invitation.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{invitation.email}</div>
                                        {invitation.inviterName && (
                                            <div className="text-xs text-gray-500">Invited by {invitation.inviterName}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                            {invitation.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium ${invitation.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : invitation.status === 'accepted'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {invitation.status === 'pending' && <Clock size={12} />}
                                            {invitation.status === 'accepted' && <CheckCircle size={12} />}
                                            {invitation.status === 'expired' && <AlertCircle size={12} />}
                                            {invitation.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(invitation.expiresAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {invitation.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleResendInvitation(invitation.id)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Resend invitation"
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelInvitation(invitation.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Cancel invitation"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invitations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-600">
                                        No pending invitations.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <InviteUserModal
                    onClose={() => setShowInviteModal(false)}
                    onInvite={handleInviteUser}
                />
            )}
        </div>
    );
};

// Invite User Modal Component
interface InviteUserModalProps {
    onClose: () => void;
    onInvite: (email: string, role: string) => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvite }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('OPERATIVE');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await onInvite(email, role);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="w-6 h-6 text-blue-600" />
                        Invite Team Member
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="colleague@company.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="COMPANY_ADMIN">Company Admin</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="OPERATIVE">Operative</option>
                            <option value="STAFF">Staff</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Choose the appropriate role for this team member
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
