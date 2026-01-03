import React, { useState, useEffect } from 'react';
import {
    Clock, Play, Pause, Trash2, Plus, Calendar, Settings,
    Database, UserX, Archive, RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { db } from '@/services/db';

interface AutomationJob {
    id: string;
    name: string;
    type: string;
    schedule: string;
    enabled: boolean;
    lastRun: string | null;
    nextRun: string | null;
    config: any;
    createdAt: string;
}

const PlatformAutomationView: React.FC = () => {
    const { addToast } = useToast();
    const [jobs, setJobs] = useState<AutomationJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [executing, setExecuting] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'cleanup_audit_logs',
        schedule: '0 2 * * *', // 2 AM daily
        config: { daysToKeep: 90 }
    });

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            setLoading(true);
            const data = await db.getAutomationJobs();
            setJobs(data);
        } catch (error) {
            console.error('Failed to load automation jobs', error);
            addToast('Failed to load automation jobs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await db.createAutomationJob(formData);
            addToast('Automation job created successfully', 'success');
            setShowCreateModal(false);
            setFormData({ name: '', type: 'cleanup_audit_logs', schedule: '0 2 * * *', config: { daysToKeep: 90 } });
            loadJobs();
        } catch (error) {
            console.error('Failed to create job', error);
            addToast('Failed to create automation job', 'error');
        }
    };

    const handleExecuteJob = async (jobId: string) => {
        if (!confirm('Execute this automation job now?')) return;
        try {
            setExecuting(jobId);
            const result = await db.executeAutomationJob(jobId);
            addToast(`Job executed successfully: ${JSON.stringify(result.result)}`, 'success');
            loadJobs();
        } catch (error) {
            console.error('Failed to execute job', error);
            addToast('Failed to execute job', 'error');
        } finally {
            setExecuting(null);
        }
    };

    const handleToggleJob = async (jobId: string, currentEnabled: boolean) => {
        try {
            await db.updateAutomationJob(jobId, { enabled: !currentEnabled });
            addToast(`Job ${!currentEnabled ? 'enabled' : 'disabled'}`, 'success');
            loadJobs();
        } catch (error) {
            addToast('Failed to update job', 'error');
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Delete this automation job? This cannot be undone.')) return;
        try {
            await db.deleteAutomationJob(jobId);
            addToast('Automation job deleted', 'success');
            loadJobs();
        } catch (error) {
            addToast('Failed to delete job', 'error');
        }
    };

    const jobTypeConfig = {
        cleanup_audit_logs: { icon: Archive, label: 'Cleanup Audit Logs', color: 'blue' },
        cleanup_old_projects: { icon: Archive, label: 'Archive Old Projects', color: 'purple' },
        database_backup: { icon: Database, label: 'Database Backup', color: 'green' },
        inactive_user_purge: { icon: UserX, label: 'Purge Inactive Users', color: 'red' }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Automated Operations
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Scheduled maintenance tasks and cleanup jobs
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} />
                    Create Job
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Jobs', value: (jobs || []).length, icon: Clock, color: 'blue' },
                    { label: 'Active', value: (jobs || []).filter(j => j.enabled).length, icon: CheckCircle, color: 'green' },
                    { label: 'Paused', value: (jobs || []).filter(j => !j.enabled).length, icon: Pause, color: 'yellow' },
                    { label: 'Last 24h', value: (jobs || []).filter(j => j.lastRun && new Date(j.lastRun) > new Date(Date.now() - 86400000)).length, icon: RefreshCw, color: 'purple' }
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                                    <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Jobs List */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Settings size={18} />
                        Scheduled Jobs
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Job</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Schedule</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Last Run</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Loading jobs...</td></tr>
                            ) : (jobs || []).length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No automation jobs configured</td></tr>
                            ) : (
                                (jobs || []).map(job => {
                                    const config = jobTypeConfig[job.type as keyof typeof jobTypeConfig];
                                    const Icon = config?.icon || Clock;
                                    return (
                                        <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 bg-${config?.color}-100 dark:bg-${config?.color}-900/30 rounded-lg`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white">{job.name}</p>
                                                        <p className="text-xs text-zinc-500">{config?.label || job.type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                    <Calendar size={14} />
                                                    {job.schedule || 'Manual'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.enabled
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                                    }`}>
                                                    {job.enabled ? 'Active' : 'Paused'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleExecuteJob(job.id)}
                                                        disabled={executing === job.id}
                                                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                                                        title="Execute Now"
                                                    >
                                                        <Play size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleJob(job.id, job.enabled)}
                                                        className="p-1.5 text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                                                        title={job.enabled ? 'Pause' : 'Resume'}
                                                    >
                                                        {job.enabled ? <Pause size={16} /> : <Play size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Job Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <h3 className="text-xl font-bold">Create Automation Job</h3>
                            <p className="text-sm text-indigo-100 mt-1">Schedule a maintenance task</p>
                        </div>
                        <form onSubmit={handleCreateJob} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Job Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Daily Audit Log Cleanup"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Job Type</label>
                                <select
                                    required
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="cleanup_audit_logs">Cleanup Audit Logs</option>
                                    <option value="cleanup_old_projects">Archive Old Projects</option>
                                    <option value="database_backup">Database Backup</option>
                                    <option value="inactive_user_purge">Purge Inactive Users</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Schedule (Cron)</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
                                    value={formData.schedule}
                                    onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                    placeholder="0 2 * * *"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Example: &quot;0 2 * * *&quot; = Daily at 2 AM</p>
                            </div>
                            {formData.type === 'cleanup_audit_logs' && (
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Days to Keep</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                        value={formData.config.daysToKeep}
                                        onChange={e => setFormData({ ...formData, config: { daysToKeep: parseInt(e.target.value) } })}
                                    />
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 text-zinc-500 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Create Job
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformAutomationView;
