import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Activity,
  BarChart3,
  Lock,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ShieldAlert,
  Palette,
  Upload,
  Coins,
  HardDrive,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Tenant, TenantMember, TenantAuditLog, UserRole } from '@/types';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <Building2 size={18} /> },
  { id: 'members', label: 'Members', icon: <Users size={18} /> },
  { id: 'usage', label: 'Usage', icon: <BarChart3 size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  { id: 'audit', label: 'Audit Log', icon: <Activity size={18} /> },
];

import { AddTenantMemberModal } from '@/components/AddTenantMemberModal';

export const TenantManagementView: React.FC = () => {
  const { currentTenant, tenants, tenantMembers, tenantUsage, getTenantAuditLogs, isLoading, requireRole, addTenantMember } = useTenant();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(currentTenant);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const auditLogs = selectedTenant ? getTenantAuditLogs(selectedTenant.id) : [];

  const currentMembers = useMemo(() => {
    if (!selectedTenant) return [];
    return tenantMembers.filter((m) => m.tenantId === selectedTenant.id);
  }, [selectedTenant, tenantMembers]);

  const filteredTenants = useMemo(() => {
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tenants, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Trial':
        return 'bg-blue-100 text-blue-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'Business':
        return 'bg-blue-100 text-blue-800';
      case 'Starter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!requireRole(['company_admin', 'super_admin'])) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 mb-2">Access Denied</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          You do not have permission to access Organization Management.
          Please contact your administrator if you need access.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isSuperAdmin = requireRole(['super_admin']);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          </div>
          <p className="text-gray-600">Manage organizations, users, and configurations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Tenant List (Only for Super Admin) */}
          {isSuperAdmin && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Tenants</h2>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tenants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {filteredTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      onClick={() => setSelectedTenant(tenant)}
                      className={`p-4 cursor-pointer transition-colors ${selectedTenant?.id === tenant.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {tenant.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{tenant.name}</p>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded ${getStatusColor(tenant.status)}`}>
                            {tenant.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={isSuperAdmin ? "lg:col-span-3" : "lg:col-span-4"}>
            {selectedTenant ? (
              <div className="bg-white rounded-lg shadow">
                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 flex gap-0">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <p className="text-gray-900">{selectedTenant.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
                            <p className="text-gray-900 font-mono text-sm">{selectedTenant.companyId}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <p className="text-gray-900">{selectedTenant.email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${getPlanColor(selectedTenant.plan)}`}>
                              {selectedTenant.plan}
                            </span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${selectedTenant.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-900">{selectedTenant.status}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                            <p className="text-gray-900">{new Date(selectedTenant.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {selectedTenant.description && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <p className="text-gray-600">{selectedTenant.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{selectedTenant.maxUsers}</p>
                          <p className="text-sm text-gray-600">Max Users</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{selectedTenant.maxProjects}</p>
                          <p className="text-sm text-gray-600">Max Projects</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{currentMembers.length}</p>
                          <p className="text-sm text-gray-600">Current Members</p>
                        </div>
                      </div>

                      {selectedTenant.features && selectedTenant.features.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Enabled Features</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedTenant.features.map((feature) => (
                              <div key={feature.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                {feature.enabled ? (
                                  <CheckCircle size={18} className="text-green-500" />
                                ) : (
                                  <Lock size={18} className="text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700">{feature.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Members Tab */}
                  {activeTab === 'members' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                        <button
                          onClick={() => setIsAddMemberModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Plus size={16} />
                          Add Member
                        </button>
                      </div>

                      <AddTenantMemberModal
                        isOpen={isAddMemberModalOpen}
                        onClose={() => setIsAddMemberModalOpen(false)}
                        tenantId={selectedTenant?.id || ''}
                      />

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentMembers.map((member) => (
                              <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-gray-900">{member.name}</td>
                                <td className="py-3 px-4 text-gray-600 text-sm">{member.email}</td>
                                <td className="py-3 px-4">
                                  <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full capitalize">
                                    {member.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {new Date(member.joinedAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <span className="text-sm text-gray-600">{member.isActive ? 'Active' : 'Inactive'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button className="text-gray-400 hover:text-blue-600 transition-colors">
                                    <Edit2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Usage Tab */}
                  {activeTab === 'usage' && tenantUsage && tenantUsage.tenantId === selectedTenant.id && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>

                      {/* Users */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Users</label>
                          <span className="text-sm text-gray-600">
                            {tenantUsage.currentUsers} / {tenantUsage.limit.users}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((tenantUsage.currentUsers / (tenantUsage.limit.users || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Projects */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Projects</label>
                          <span className="text-sm text-gray-600">
                            {tenantUsage.currentProjects} / {tenantUsage.limit.projects}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((tenantUsage.currentProjects / (tenantUsage.limit.projects || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Storage */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Storage</label>
                          <span className="text-sm text-gray-600">
                            {(tenantUsage.currentStorage / 1024).toFixed(2)} GB / {((tenantUsage.limit.storage || 0) / 1024).toFixed(2)} GB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((tenantUsage.currentStorage / (tenantUsage.limit.storage || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* API Calls */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">API Calls</label>
                          <span className="text-sm text-gray-600">
                            {(tenantUsage.currentApiCalls / 1000).toFixed(0)}K / {((tenantUsage.limit.apiCalls || 0) / 1000).toFixed(0)}K
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-orange-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((tenantUsage.currentApiCalls / (tenantUsage.limit.apiCalls || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                          <Coins size={32} className="text-blue-600 mb-2" />
                          <h4 className="font-bold text-zinc-900">AI Tokens</h4>
                          <p className="text-2xl font-black text-blue-700 mt-1">42.5K <span className="text-xs text-blue-500/70 font-medium">/ 100K</span></p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2">Monthly Quota</p>
                        </div>
                        <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 flex flex-col items-center text-center">
                          <HardDrive size={32} className="text-purple-600 mb-2" />
                          <h4 className="font-bold text-zinc-900">Cloud Storage</h4>
                          <p className="text-2xl font-black text-purple-700 mt-1">8.2 <span className="text-xs text-purple-500/70 font-medium">GB / 50 GB</span></p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2">Enterprise Storage</p>
                        </div>
                      </div>

                      <div className="pt-4 text-xs text-gray-600 flex justify-between items-center">
                        <span>Usage data for: {tenantUsage.period}</span>
                        <button className="text-blue-600 font-bold hover:underline">View Detailed breakdown →</button>
                      </div>
                    </div>
                  )}

                  {/* Settings Tab */}
                  {activeTab === 'settings' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Tenant Settings</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                          <p className="text-gray-900">{selectedTenant.settings.timezone}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                          <p className="text-gray-900">{selectedTenant.settings.language}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                          <p className="text-gray-900">{selectedTenant.settings.currency}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention</label>
                          <p className="text-gray-900">{selectedTenant.settings.dataRetention} days</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-600">Send email alerts for important events</p>
                          </div>
                          <input type="checkbox" checked={selectedTenant.settings.emailNotifications} readOnly className="w-5 h-5" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-600">Require 2FA for all members</p>
                          </div>
                          <input type="checkbox" checked={selectedTenant.settings.twoFactorAuth} readOnly className="w-5 h-5" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Single Sign-On (SSO)</p>
                            <p className="text-sm text-gray-600">Enable SAML/OAuth integration</p>
                          </div>
                          <input type="checkbox" checked={selectedTenant.settings.sso} readOnly className="w-5 h-5" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Custom Branding</p>
                            <p className="text-sm text-gray-600">Apply custom logo and colors</p>
                          </div>
                          <input type="checkbox" checked={selectedTenant.settings.customBranding} readOnly className="w-5 h-5" />
                        </div>

                        {selectedTenant.settings.customBranding && (
                          <div className="mt-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-6">
                            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                              <Palette size={16} className="text-blue-600" /> Identity & Branding
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Company Logo</label>
                                <div className="flex items-center gap-4">
                                  <div className="w-20 h-20 bg-white border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center text-zinc-400 group hover:border-blue-400 transition-colors cursor-pointer">
                                    <div className="text-center">
                                      <Upload size={20} className="mx-auto mb-1" />
                                      <span className="text-[10px] font-bold">Upload</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    <p className="font-bold text-zinc-700">PNG, SVG or JPG</p>
                                    <p>Max size: 2MB</p>
                                    <p>Optimal: 400x400px</p>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Primary Theme Color</label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="color"
                                    defaultValue="#0f5c82"
                                    className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                                  />
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      defaultValue="#0f5c82"
                                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono uppercase"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                          Cancel
                        </button>
                        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Log Tab */}
                  {activeTab === 'audit' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h3>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {auditLogs.slice(0, 20).map((log) => (
                          <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="mt-1">
                              {log.status === 'success' ? (
                                <CheckCircle size={20} className="text-green-500" />
                              ) : (
                                <AlertCircle size={20} className="text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-gray-900">
                                  {log.action.replace(/_/g, ' ').charAt(0).toUpperCase() + log.action.replace(/_/g, ' ').slice(1)}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {log.userName} · {log.resource}
                                {log.resourceId && ` #${log.resourceId.slice(0, 8)}`}
                              </p>
                              {log.message && <p className="text-xs text-gray-500 mt-1">{log.message}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {auditLogs.length === 0 && (
                        <div className="text-center py-8">
                          <Activity size={32} className="mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-600">No activity recorded yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Select a tenant to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantManagementView;
