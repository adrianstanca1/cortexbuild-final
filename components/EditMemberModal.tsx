import React, { useState } from 'react';
import { X, Mail, User, Users, AlertCircle, CheckCircle, Save, Loader, Trash2 } from 'lucide-react';
import { TeamMember, UserRole } from '@/types';
import { emailService } from '@/services/emailService';
import { Modal } from './Modal';
import { db } from '@/services/db';

interface EditMemberModalProps {
  isOpen: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onUpdate: (member: TeamMember) => void;
  onDelete: (memberId: string) => void;
  projectName?: string;
}

const roles = Object.values(UserRole);
const statuses = ['On Site', 'Off Site', 'On Break', 'Leave'];

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onUpdate,
  onDelete,
  projectName = 'Untitled Project',
}) => {
  const [step, setStep] = useState<'edit' | 'sending' | 'success' | 'delete-confirm'>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendNotification, setSendNotification] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<TeamMember>(
    member || {
      id: '',
      companyId: 'c1',
      name: '',
      email: '',
      role: 'Worker',
      phone: '',
      status: 'Off Site',
      initials: '',
      color: '',
    }
  );

  if (!isOpen || !member) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Invalid email address');
      }

      // Update membership role if changed
      if (formData.role !== member.role) {
        await db.updateMemberRole(member.id, formData.role);
      }

      // Update member
      onUpdate(formData);
      setStep('success');

      // Reset after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
      setStep('edit');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // Send removal notification if email is checked
      if (sendNotification) {
        const emailResult = await emailService.sendMemberRemovalNotification(
          member.email,
          member.name,
          projectName,
          'You have been removed from the project team'
        );

        if (!emailResult.success) {
          console.warn('Failed to send removal notification:', emailResult.error);
        }
      }

      // Delete member
      onDelete(member.id);
      setShowDeleteConfirm(false);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('edit');
    setError(null);
    setShowDeleteConfirm(false);
    setSendNotification(false);
    setFormData(member || {
      id: '',
      companyId: 'c1',
      name: '',
      email: '',
      role: 'Worker',
      phone: '',
      status: 'Off Site',
      initials: '',
      color: '',
    });
    onClose();
  };

  const hasChanges = formData.name !== member.name ||
    formData.email !== member.email ||
    formData.role !== member.role ||
    formData.phone !== member.phone ||
    formData.status !== member.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showDeleteConfirm ? 'Remove Member' : 'Edit Member'}
      size="md"
    >
      <div className="space-y-6">
        {/* Edit Step */}
        {step === 'edit' && !showDeleteConfirm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <User size={14} className="inline mr-1" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <Users size={14} className="inline mr-1" />
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {formData.role !== member.role && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={e => setSendNotification(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700">
                    Send role change notification email
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirm Step */}
        {showDeleteConfirm && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                Are you sure you want to remove {formData.name}?
              </p>
              <p className="text-sm text-red-700">
                This action cannot be undone. They will lose access to all project resources.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={e => setSendNotification(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">
                  Send removal notification email
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Sending Step */}
        {step === 'sending' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin">
              <Loader size={40} className="text-blue-500" />
            </div>
            <p className="text-sm text-zinc-600 text-center">
              Sending notification email to {formData.email}...
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Changes Saved!</h3>
            <p className="text-sm text-zinc-600 text-center">
              {formData.name}&apos;s profile has been updated
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t border-zinc-100 mt-6">
          {!showDeleteConfirm && step === 'edit' && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Remove
              </button>
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </>
          )}

          {showDeleteConfirm && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Remove Member
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ml-auto"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditMemberModal;
