
import React, { useState } from 'react';
import { Check, X, Clock, Plus } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Timesheet } from '@/types';

const TimesheetsView: React.FC = () => {
    const { user } = useAuth();
    const { timesheets, updateTimesheet, addTimesheet } = useProjects();
    const { workforce } = useTenant();
    const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED'>('PENDING');
    const [showLogModal, setShowLogModal] = useState(false);

    // New Entry State
    const [newEntry, setNewEntry] = useState<Partial<Timesheet>>({
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00',
        employeeName: '' // Default to empty to force selection
    });

    // Auto-select current user if matched in workforce
    React.useEffect(() => {
        if (user && workforce.length > 0 && !newEntry.employeeName) {
            const match = workforce.find(m => m.email === user.email || m.name === user.name);
            if (match) {
                setNewEntry(prev => ({ ...prev, employeeName: match.name }));
            }
        }
    }, [user, workforce, newEntry.employeeName]);

    const filteredSheets = timesheets.filter(t =>
        activeTab === 'PENDING' ? t.status === 'Pending' : t.status === 'Approved'
    );

    const handleApprove = (id: string) => updateTimesheet(id, { status: 'Approved' });
    const handleReject = (id: string) => updateTimesheet(id, { status: 'Rejected' });

    const handleSubmit = async () => {
        if (newEntry.projectName && newEntry.date) {
            // Simple hour calc
            const start = parseInt(newEntry.startTime!.split(':')[0]);
            const end = parseInt(newEntry.endTime!.split(':')[0]);
            const hours = Math.max(0, end - start);

            const entry: Timesheet = {
                id: `ts-${Date.now()}`,
                employeeName: newEntry.employeeName!,
                projectName: newEntry.projectName,
                date: newEntry.date!,
                startTime: newEntry.startTime!,
                endTime: newEntry.endTime!,
                hoursWorked: hours,
                status: 'Pending',
                companyId: 'c1'
            };
            await addTimesheet(entry);
            setShowLogModal(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-900 mb-1">Timesheets</h1>
                <p className="text-zinc-500">Track and approve employee time entries</p>
                <button
                    onClick={() => setShowLogModal(true)}
                    className="mt-4 flex items-center gap-2 bg-[#1f7d98] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#166ba1] shadow-sm"
                >
                    <Clock size={16} /> Log Time
                </button>
            </div>

            <div className="flex gap-6 border-b border-zinc-200 mb-6">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'PENDING' ? 'border-[#1f7d98] text-[#1f7d98]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                >
                    Pending Approval
                </button>
                <button
                    onClick={() => setActiveTab('APPROVED')}
                    className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'APPROVED' ? 'border-[#1f7d98] text-[#1f7d98]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                >
                    Approved History
                </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pb-10">
                {filteredSheets.map((entry) => (
                    <div key={entry.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:border-blue-200 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="font-semibold text-zinc-900">{entry.employeeName}</div>
                                <div className="text-xs text-zinc-500">{entry.projectName}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.status === 'Pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                {entry.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">DATE</div>
                                <div>{entry.date}</div>
                            </div>
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">HOURS</div>
                                <div className="font-medium">{entry.hoursWorked}h</div>
                            </div>
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">CLOCK IN</div>
                                <div className="font-mono">{entry.startTime}</div>
                            </div>
                            <div>
                                <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">CLOCK OUT</div>
                                <div className="font-mono">{entry.endTime}</div>
                            </div>
                        </div>

                        {entry.status === 'Pending' && (
                            <div className="flex gap-3 border-t border-zinc-50 pt-4">
                                <button onClick={() => handleApprove(entry.id)} className="flex items-center gap-1 px-4 py-1.5 bg-[#1f7d98] text-white text-xs font-medium rounded hover:bg-[#166ba1]">
                                    <Check size={12} /> Approve
                                </button>
                                <button onClick={() => handleReject(entry.id)} className="flex items-center gap-1 px-4 py-1.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded hover:bg-zinc-200">
                                    <X size={12} /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {filteredSheets.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                        No timesheets found in this category.
                    </div>
                )}
            </div>

            {/* Log Time Modal */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-zinc-900 mb-4">Log Work Hours</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Employee</label>
                                <select
                                    className="w-full p-2 border border-zinc-200 rounded-lg"
                                    value={newEntry.employeeName}
                                    onChange={e => setNewEntry({ ...newEntry, employeeName: e.target.value })}
                                >
                                    <option value="">Select Employee...</option>
                                    {workforce.map(m => (
                                        <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Project</label>
                                <input type="text" className="w-full p-2 border border-zinc-200 rounded-lg" value={newEntry.projectName || ''} onChange={e => setNewEntry({ ...newEntry, projectName: e.target.value })} placeholder="Project Name" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date</label>
                                <input type="date" className="w-full p-2 border border-zinc-200 rounded-lg" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Start Time</label>
                                    <input type="time" className="w-full p-2 border border-zinc-200 rounded-lg" value={newEntry.startTime} onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">End Time</label>
                                    <input type="time" className="w-full p-2 border border-zinc-200 rounded-lg" value={newEntry.endTime} onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowLogModal(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                            <button onClick={handleSubmit} disabled={!newEntry.projectName} className="px-6 py-2 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] disabled:opacity-50">Submit Log</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimesheetsView;
