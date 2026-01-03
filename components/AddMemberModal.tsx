import React, { useState } from 'react';
import { X, Mail, User, Users, AlertCircle, CheckCircle, Send, Loader } from 'lucide-react';
import { TeamMember, UserRole } from '@/types';
import { emailService } from '@/services/emailService';
import { Modal } from './Modal';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: TeamMember) => void;
  projectName?: string;
}

const roles = Object.values(UserRole);

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  projectName = 'Untitled Project',
}) => {
  const [step, setStep] = useState<'form' | 'review' | 'sending' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Worker',
    phone: '',
    skills: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    // Validate form
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email address');
      return;
    }
    if (!formData.role) {
      setError('Role is required');
      return;
    }

    setError(null);
    setStep('review');
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create new member
      const newMember: TeamMember = {
        id: `m-${Date.now()}`,
        companyId: 'c1',
        name: formData.name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone,
        status: 'Invited',
        initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        color: getRandomColor(),
        skills: formData.skills
          ? formData.skills.split(',').map(s => ({ name: s.trim(), level: 1, verified: false }))
          : [],
        joinDate: new Date().toISOString().split('T')[0],
      };

      // Send invitation email if enabled
      if (sendEmail) {
        setStep('sending');
        const emailResult = await emailService.sendMemberInvitation(
          formData.email,
          formData.name,
          projectName,
          formData.role
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Failed to send email');
        }
      }

      // Add member
      onAdd(newMember);
      setStep('success');

      // Reset after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setError(null);
    setFormData({ name: '', email: '', role: 'Worker', phone: '', skills: '' });
    setSendEmail(true);
    onClose();
  };

  const getRandomColor = () => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getTitle = () => {
    switch (step) {
      case 'form': return 'Add Team Member';
      case 'review': return 'Review & Send Invitation';
      case 'sending': return 'Sending Invitation';
      case 'success': return 'Member Added!';
      default: return 'Add Member';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      size="md"
    >
      <div className="space-y-6">
        {/* Form Step */}
        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <User size={14} className="inline mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                <Users size={14} className="inline mr-1" />
                Role *
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
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g. Carpentry, Safety Training"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600">Name:</span>
                <span className="text-sm font-medium text-zinc-900">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600">Email:</span>
                <span className="text-sm font-medium text-zinc-900">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-600">Role:</span>
                <span className="text-sm font-medium text-zinc-900">{formData.role}</span>
              </div>
              {formData.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600">Phone:</span>
                  <span className="text-sm font-medium text-zinc-900">{formData.phone}</span>
                </div>
              )}
              {formData.skills && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600">Skills:</span>
                  <span className="text-sm font-medium text-zinc-900">{formData.skills}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={e => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">
                  Send invitation email with project details
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Sending Step */}
        {step === 'sending' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin">
              <Loader size={40} className="text-blue-500" />
            </div>
            <p className="text-sm text-zinc-600 text-center">
              Sending invitation email to {formData.email}...
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Member Added Successfully!</h3>
            <p className="text-sm text-zinc-600 text-center">
              {formData.name} has been added to your team
              {sendEmail && ' and sent an invitation email'}
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 mt-6">
          {step === 'form' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                {loading ? 'Sending...' : 'Add Member'}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddMemberModal;
