import React, { useState, useEffect } from 'react';
import {
  Building2, Users, UserPlus, UserX, Shield, Search, Check,
  X, CheckCircle, AlertCircle, CreditCard, Settings, Activity,
  Calendar, Download, BrainCircuit, Sparkles, TrendingUp, ShieldCheck,
  Zap, ArrowRight
} from 'lucide-react';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import { UserRole } from '@/types';

interface CompanyMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited' | 'pending';
  createdAt: string;
}

const CompanyManagementView: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings' | 'billing'>('overview');

  // State
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Member Management State
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: UserRole.OPERATIVE });
  const [inviting, setInviting] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ name: '', emailNotifications: true, twoFactorAuth: false });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (currentTenant?.id) {
      loadAllData();
    }
  }, [currentTenant?.id, refreshTrigger]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [details, memberList] = await Promise.all([
        db.getCompanyDetails(currentTenant!.id),
        db.getCompanyMembers(currentTenant!.id)
      ]);
      setCompanyDetails(details);
      setMembers(memberList);
      if (details) {
        setSettingsForm({
          name: details.name,
          emailNotifications: details.settings?.emailNotifications ?? true,
          twoFactorAuth: details.settings?.twoFactorAuth ?? false
        });
      }
    } catch (error) {
      console.error("Failed to load company data", error);
      addToast("Failed to load company data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newMember.name || !newMember.email) return;
    setInviting(true);
    try {
      await db.inviteCompanyAdmin(currentTenant!.id, newMember.email, newMember.name);
      addToast(`Invitation sent to ${newMember.email}`, 'success');
      setShowInviteModal(false);
      setNewMember({ name: '', email: '', role: UserRole.OPERATIVE });
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      addToast("Failed to send invitation", "error");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    try {
      await db.updateMyCompany({
        name: settingsForm.name,
        settings: {
          ...companyDetails.settings,
          emailNotifications: settingsForm.emailNotifications,
          twoFactorAuth: settingsForm.twoFactorAuth
        }
      });
      addToast("Company settings updated", "success");
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      addToast("Failed to update settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await db.updateMemberRole(userId, newRole);
      addToast("User role updated", "success");
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      addToast("Failed to update role", "error");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      await db.removeMember(userId);
      addToast("User removed", "success");
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      addToast("Failed to remove user", "error");
    }
  };

  const isAdmin = user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.SUPERADMIN;

  if (loading && !companyDetails) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400/20 border-t-sky-400 rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Initializing Infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>

      {/* Hero Header */}
      <header className="relative px-10 py-12 border-b border-white/5 bg-zinc-950">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none opacity-50"></div>
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse shadow-[0_0_10px_#38bdf8]" />
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em]">Entity Intelligence</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-4">
              {companyDetails?.name || 'Company Management'}
              <div className="px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                {companyDetails?.status || 'Active'}
              </div>
            </h1>
            <p className="text-zinc-400 font-medium text-lg mt-2 max-w-2xl">Manage high-fidelity node configuration, workforce dynamics, and resource allocation.</p>
          </div>
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'members', label: 'Workforce', icon: Users },
              { id: 'settings', label: 'Protocol', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <tab.icon size={14} className={activeTab === tab.id ? 'text-white' : ''} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-12 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Workforce Hub', val: members.length, icon: Users, color: 'text-sky-400', bg: 'bg-sky-400/10' },
                { label: 'Tactical Projects', val: companyDetails?.projects || 0, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Access Tier', val: 'Enterprise Beta', icon: ShieldCheck, color: 'text-violet-400', bg: 'bg-violet-400/10' },
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-8 rounded-[2.5rem] relative group overflow-hidden">
                  <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
                    <stat.icon size={80} />
                  </div>
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">{stat.label}</h3>
                  <div className="flex items-end justify-between relative z-10">
                    <span className="text-5xl font-black tracking-tighter">{stat.val}</span>
                    <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl border border-white/5`}>
                      <stat.icon size={24} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-sky-500 to-indigo-700 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter">Strategic Node Control</h2>
                </div>
                <p className="text-xl text-sky-100 mb-10 max-w-2xl font-medium leading-relaxed">
                  Your organization is currently running on the CortexBuild AI Engine. Optimize group-level permissions and analyze project trajectories from a single command node.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('members')} className="bg-white text-sky-700 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-50 transition-all flex items-center gap-2">
                    Access Workforce <ArrowRight size={14} />
                  </button>
                  <button onClick={() => setActiveTab('settings')} className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">
                    View Protocol
                  </button>
                </div>
              </div>
              <BrainCircuit className="absolute top-0 right-0 text-white/5 w-[500px] h-[500px] -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-8 max-w-6xl">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-400 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Query workforce by name or vector..."
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-white/5 bg-zinc-900/50 text-white font-medium focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-sky-500/20"
                >
                  <UserPlus size={16} /> Deploy Invitation
                </button>
              )}
            </div>

            <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Node Identity</th>
                    <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Protocol Role</th>
                    <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Integrity Status</th>
                    <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vector Initialization</th>
                    {isAdmin && <th className="p-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(member => (
                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-white text-lg tracking-tight group-hover:text-sky-400 transition-colors uppercase">{member.name}</div>
                            <div className="text-xs text-zinc-500 font-bold tracking-tight lowercase">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="relative inline-block w-48">
                          <select
                            disabled={!isAdmin || member.id === user?.id}
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-black text-zinc-400 appearance-none focus:ring-2 focus:ring-sky-500/20 outline-none disabled:opacity-50 uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <option value={UserRole.OPERATIVE}>Operative Protocol</option>
                            <option value={UserRole.SUPERVISOR}>Site Supervisor</option>
                            <option value={UserRole.PROJECT_MANAGER}>Project Admin</option>
                            <option value={UserRole.COMPANY_ADMIN}>Global Admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          <div className={`w-1 h-1 rounded-full animate-pulse ${member.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {member.status}
                        </span>
                      </td>
                      <td className="p-8 text-sm font-bold text-zinc-500 tracking-tight">
                        {new Date(member.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      {isAdmin && (
                        <td className="p-8 text-right">
                          {member.id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="w-10 h-10 bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded-xl transition-all flex items-center justify-center border border-white/5"
                              title="Deactivate Node"
                            >
                              <UserX size={18} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-10">
            <div className="glass-panel p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-xl font-black mb-8 uppercase tracking-tighter flex items-center gap-3">
                <Building2 size={24} className="text-sky-400" /> General Identification
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Enterprise Name</label>
                  <input
                    type="text"
                    className="w-full p-4 border border-white/5 rounded-2xl bg-zinc-900 font-bold text-white focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    value={settingsForm.name}
                    onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-xl font-black mb-8 uppercase tracking-tighter flex items-center gap-3">
                <Shield size={24} className="text-violet-400" /> Security Protocols
              </h3>
              <div className="space-y-4">
                {[
                  { id: 'emailNotifications', label: 'Neural Alerts', desc: 'Sync system event vectors via secure email channels.', Icon: Zap, state: settingsForm.emailNotifications },
                  { id: 'twoFactorAuth', label: 'Dual-Factor Logic (2FA)', desc: 'Enforce hardware-level verification across all fleet members.', Icon: Lock, state: settingsForm.twoFactorAuth },
                ].map(({ Icon, ...toggle }, i) => (
                  <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 group-hover:text-white transition-colors">
                        {React.createElement(Icon as any, { size: 20, className: "text-zinc-500" })}
                      </div>
                      <div>
                        <div className="font-black text-lg tracking-tight uppercase">{toggle.label}</div>
                        <div className="text-xs text-zinc-500 font-bold">{toggle.desc}</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={toggle.state}
                        onChange={e => setSettingsForm({ ...settingsForm, [toggle.id]: e.target.checked })}
                        disabled={!isAdmin}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-8 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleUpdateSettings}
                  disabled={savingSettings}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-emerald-500/20 transition-all flex items-center gap-3 active:scale-95"
                >
                  {savingSettings ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle size={18} />}
                  Commit Protocol Changes
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="glass-panel rounded-[3rem] max-w-lg w-full p-10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 to-indigo-600"></div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black tracking-tighter uppercase">Invite New Node</h2>
              <button onClick={() => setShowInviteModal(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center justify-center border border-white/5"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Target Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full p-4 border border-white/5 rounded-2xl bg-zinc-900 font-bold text-white focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  placeholder="e.g. Marcus Aurelius"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Communication Vector (Email)</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full p-4 border border-white/5 rounded-2xl bg-zinc-900 font-bold text-white focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  placeholder="name@organization.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Default Protocol Role</label>
                <select
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value as any as UserRole })}
                  className="w-full p-4 border border-white/5 rounded-2xl bg-zinc-900 font-bold text-white focus:ring-2 focus:ring-sky-500/20 outline-none transition-all appearance-none"
                >
                  <option value={UserRole.OPERATIVE}>Operative Protocol</option>
                  <option value={UserRole.SUPERVISOR}>Site Supervisor</option>
                  <option value={UserRole.PROJECT_MANAGER}>Project Admin</option>
                  <option value={UserRole.COMPANY_ADMIN}>Global Admin</option>
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={inviting || !newMember.email}
                className="w-full bg-sky-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-sky-500/20 hover:bg-sky-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {inviting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap size={18} />}
                Transmit Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagementView;