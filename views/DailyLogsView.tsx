import React, { useState, useEffect } from 'react';
import { Calendar, Cloud, Users, FileText, Plus, Sun, CloudRain, Wind, Thermometer, Save, PenTool, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import FileUploadZone from '@/components/FileUploadZone';

import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSync } from '@/contexts/SyncContext';
import { DailyLog } from '@/types';
import { getWeather } from '@/services/weatherService';

const DailyLogsView: React.FC = () => {
    const { projects, dailyLogs, addDailyLog } = useProjects();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { isOnline, queueAction } = useSync();

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedProject, setSelectedProject] = useState(projects[0]?.id || '');

    // Form State
    const [weather, setWeather] = useState({ condition: 'Sunny', temp: '72°F', wind: '5mph' });
    const [crewCount, setCrewCount] = useState(15);
    const [notes, setNotes] = useState('');
    const [workPerformed, setWorkPerformed] = useState('');
    const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!selectedDate) return;
            try {
                const data = await getWeather(selectedDate);
                setWeather({
                    condition: data.condition,
                    temp: `${data.temp}°F`,
                    wind: `${data.windSpeed}mph`
                });
            } catch (error) {
                console.error("Failed to fetch weather", error);
            }
        };
        fetchWeather();
    }, [selectedDate]);


    const handleSignAndSubmit = async () => {
        if (!selectedProject) {
            addToast("Please select a project", "error");
            return;
        }
        if (!workPerformed.trim() || crewCount === 0) {
            addToast("Please fill in Work Performed and Crew Count before signing.", "error");
            return;
        }

        const log: DailyLog = {
            id: crypto.randomUUID(),
            projectId: selectedProject,
            date: selectedDate,
            weather: `${weather.condition}, ${weather.temp}, Wind ${weather.wind}`,
            crewCount,
            workPerformed,
            notes,
            author: user?.name || 'Unknown',
            createdAt: new Date().toISOString(),
            status: 'Signed',
            signedBy: user?.name || 'Unknown',
            signedAt: new Date().toISOString(),
            attachments: attachments
        };

        if (!isOnline) {
            await queueAction('/api/daily_logs', 'POST', log, 'daily-log');
            addToast("Saved Offline (Will sync when online)", "info");
            setWorkPerformed('');
            setNotes('');
            setAttachments([]);
            return;
        }

        try {
            await addDailyLog(log);
            addToast("Daily Log Signed & Submitted", "success");
            // Reset form for next day/entry
            setWorkPerformed('');
            setNotes('');
            setAttachments([]);
        } catch (error) {
            console.error("Failed to save daily log", error);
            addToast("Failed to save daily log", "error");
        }
    };

    const project = projects.find(p => p.id === selectedProject);

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-zinc-50 font-sans text-zinc-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900">Daily Logs</h1>
                    <p className="text-zinc-500 mt-1">Site diary and progress tracking.</p>
                </div>

                <div className="flex gap-3 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-zinc-50 border-none rounded-lg text-sm font-bold text-zinc-700 focus:ring-0"
                    />
                    <div className="w-px bg-zinc-200 my-1"></div>
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="bg-zinc-50 border-none rounded-lg text-sm font-bold text-zinc-700 focus:ring-0 min-w-[200px]"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Log Entry */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Weather Section */}
                    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <Cloud size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Site Conditions</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center gap-2">
                                <Sun className="text-amber-500" size={28} />
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Condition</span>
                                <span className="text-lg font-bold text-zinc-800">{weather.condition}</span>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center gap-2">
                                <Thermometer className="text-red-500" size={28} />
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Temp</span>
                                <span className="text-lg font-bold text-zinc-800">{weather.temp}</span>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center gap-2">
                                <Wind className="text-blue-500" size={28} />
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Wind</span>
                                <span className="text-lg font-bold text-zinc-800">{weather.wind}</span>
                            </div>
                        </div>
                    </div>

                    {/* Work Performed */}
                    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Work Performed</h2>
                        </div>

                        <textarea
                            value={workPerformed}
                            onChange={(e) => setWorkPerformed(e.target.value)}
                            placeholder="Describe work completed today, delays, and major events..."
                            className="w-full h-48 p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Additional Notes</h2>
                        </div>

                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Deliveries, visitors, safety observations..."
                            className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Site Photos & Attachments */}
                    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                                <ImageIcon size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Site Photos & Attachments</h2>
                        </div>

                        <div className="space-y-4">
                            <FileUploadZone
                                onUploadComplete={(url, file) => {
                                    setAttachments(prev => [...prev, { url, name: file.name }]);
                                }}
                                bucket="project-documents"
                                label="Upload Site Photos"
                                description="Images, PDFs, or Documents"
                            />

                            {/* Attachment List */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 bg-white rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0">
                                                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                        <ImageIcon size={20} />
                                                    ) : (
                                                        <LinkIcon size={20} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-zinc-900 truncate">{file.name}</p>
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                                        View File
                                                    </a>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Sidebar Stats */}
                <div className="space-y-8">
                    {/* Crew Count */}
                    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                <Users size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Manpower</h2>
                        </div>

                        <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            <span className="font-medium text-zinc-600">Site Personnel</span>
                            <input
                                type="number"
                                value={crewCount}
                                onChange={(e) => setCrewCount(parseInt(e.target.value))}
                                className="w-20 text-right bg-white border border-zinc-200 rounded-lg px-2 py-1 font-bold text-lg focus:ring-2 focus:ring-[#0f5c82]"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gradient-to-br from-[#0f5c82] to-[#0c4a6e] rounded-3xl p-8 text-white shadow-xl">
                        <h3 className="text-xl font-bold mb-2">Log Completion</h3>
                        <p className="text-blue-100 text-sm mb-6">Ensure all sections are filled out before signing off.</p>

                        <button
                            onClick={handleSignAndSubmit}
                            className="w-full py-4 bg-white text-[#0f5c82] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
                        >
                            <PenTool size={20} />
                            Sign & Submit Log
                        </button>
                    </div>

                </div>

                {/* Recent Logs List (Verification) */}
                <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-zinc-50 text-zinc-600 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Recent Logs</h2>
                    </div>
                    <div className="space-y-4">
                        {dailyLogs
                            .filter(l => l.projectId === selectedProject)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map(log => (
                                <div key={log.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                    <div>
                                        <p className="font-bold text-zinc-800">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                        <p className="text-xs text-zinc-500">Author: {log.author}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-zinc-600">{log.weather.split(',')[0]}</span>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${log.status === 'Signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {log.status || 'Draft'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        {dailyLogs.filter(l => l.projectId === selectedProject).length === 0 && (
                            <p className="text-zinc-400 text-center py-4">No logs recorded for this project yet.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>

    );
};

export default DailyLogsView;
