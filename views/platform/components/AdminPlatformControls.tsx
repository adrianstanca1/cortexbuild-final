import React, { useState } from 'react';
import { Settings, Power, Sparkles, UserCheck, BrainCircuit, Megaphone, Filter, RefreshCw, Layers } from 'lucide-react';
import { db } from '@/services/db';
import { useToast } from '@/contexts/ToastContext';
import { useTenant } from '@/contexts/TenantContext'; // Assuming context is available here
import { SystemSettings } from '@/types';
import BroadcastConfirmationModal from '@/components/BroadcastConfirmationModal';

export const AdminPlatformControls: React.FC = () => {
    const { addToast } = useToast();
    const { systemSettings, updateSystemSettings, setBroadcastMessage } = useTenant();

    const [localBroadcastMsg, setLocalBroadcastMsg] = useState('');
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastTarget, setBroadcastTarget] = useState({ role: 'all', plan: 'all' });
    const [lastBroadcastMessage, setLastBroadcastMessage] = useState('');
    const [showBroadcastConfirmation, setShowBroadcastConfirmation] = useState(false);
    const [broadcastSessionCount, setBroadcastSessionCount] = useState(0);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false); // For future scheduling

    const handleToggleSetting = (key: keyof SystemSettings) => {
        const newState = !systemSettings[key];
        updateSystemSettings({ [key]: newState });
        addToast(`${key.replace(/([A-Z])/g, ' $1').trim()} ${newState ? 'Enabled' : 'Disabled'}`, 'success');
    };

    const handleBroadcast = async () => {
        if (!localBroadcastMsg.trim()) return;
        try {
            setLastBroadcastMessage(localBroadcastMsg);

            if (broadcastTarget.role === 'all' && broadcastTarget.plan === 'all') {
                setBroadcastMessage(localBroadcastMsg);
            } else {
                await db.sendTargetedBroadcast(broadcastTarget, localBroadcastMsg);
            }

            // Mock session count for now
            const sessionCount = Math.floor(Math.random() * 50) + 10;
            setBroadcastSessionCount(sessionCount);

            setShowBroadcastConfirmation(true);
            setLocalBroadcastMsg('');
            setShowBroadcastModal(false);
        } catch (error) {
            addToast('Failed to send broadcast', 'error');
        }
    };

    const handleRestart = async () => {
        if (!confirm("Are you sure you want to restart all system services? This will cause a temporary downtime.")) return;
        try {
            await db.restartServices();
            addToast("Restart sequence initiated", "success");
        } catch (e) {
            addToast("Failed to initiate restart", "error");
        }
    };

    const handleFlushCache = async () => {
        try {
            await db.flushCache();
            addToast("System cache flushed", "success");
        } catch (e) {
            addToast("Failed to flush cache", "error");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
                <h3 className="font-bold text-zinc-800 dark:text-white mb-6 flex items-center gap-2"><Settings size={18} /> Global Controls</h3>
                <div className="space-y-4">
                    {[
                        { key: 'maintenance', label: 'Maintenance Mode', icon: Power, onColor: 'bg-red-500', isSpecial: true },
                        { key: 'betaFeatures', label: 'Global Beta Access', icon: Sparkles, onColor: 'bg-emerald-500' },
                        { key: 'registrations', label: 'New Registrations', icon: UserCheck, onColor: 'bg-emerald-500' },
                        { key: 'aiEngine', label: 'AI Inference Engine', icon: BrainCircuit, onColor: 'bg-indigo-500' },
                    ].map((ctrl) => (
                        <div key={ctrl.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-zinc-200 dark:bg-white"><ctrl.icon size={16} className="text-gray-600" /></div>
                                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{ctrl.label}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {ctrl.isSpecial && <button onClick={() => setShowMaintenanceModal(true)} className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 underline">Schedule</button>}
                                <button onClick={() => handleToggleSetting(ctrl.key as keyof SystemSettings)} className={`w-11 h-6 rounded-full transition-colors relative ${systemSettings[ctrl.key as keyof SystemSettings] ? ctrl.onColor : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${systemSettings[ctrl.key as keyof SystemSettings] ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-[#0f5c82] to-[#0c4a6e] rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Megaphone size={18} className="text-yellow-400" /> Global Broadcast</h3>
                <div className="flex flex-col gap-3">
                    <textarea className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/40 outline-none resize-none h-24" placeholder="Type system-wide announcement..." value={localBroadcastMsg} onChange={e => setLocalBroadcastMsg(e.target.value)} />
                    <div className="flex items-center justify-between">
                        <button onClick={() => setShowBroadcastModal(true)} className="text-xs font-bold text-blue-300 hover:text-white flex items-center gap-1">Targeting Filters <Filter size={10} /></button>
                        <button disabled={!localBroadcastMsg.trim()} onClick={handleBroadcast} className="bg-white text-[#0f5c82] px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors disabled:opacity-50">Send Broadcast</button>
                    </div>
                </div>
            </div>
            <div className="bg-[#1e1e1e] text-white rounded-xl shadow-2xl p-6 border border-zinc-800">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-zinc-300"><Layers size={18} className="text-emerald-400" /> Platform Operations</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleFlushCache} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center group">
                        <div className="p-3 bg-emerald-500/20 rounded-xl mb-3 group-hover:scale-110 transition-transform"><RefreshCw className="text-emerald-400" size={24} /></div>
                        <p className="font-bold text-sm">Flush System Cache</p>
                        <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">Purge Redis & L1 Objects</p>
                    </button>
                    <button onClick={handleRestart} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center group">
                        <div className="p-3 bg-red-500/20 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Power className="text-red-400" size={24} /></div>
                        <p className="font-bold text-sm">Restart Services</p>
                        <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">Graceful Node.js Reboot</p>
                    </button>
                </div>
            </div>

            {/* Broadcast Confirmation Modal */}
            <BroadcastConfirmationModal
                isOpen={showBroadcastConfirmation}
                onClose={() => setShowBroadcastConfirmation(false)}
                message={lastBroadcastMessage}
                sessionCount={broadcastSessionCount}
                targetingDetails={broadcastTarget}
            />
        </div>
    );
};
