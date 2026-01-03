
import React, { useState, useEffect, useRef } from 'react';
import {
    Calendar, Sparkles, Plus, Trash2, AlertTriangle,
    Clock, Loader2, ChevronDown, Save, BarChart, Upload, FileText, X, Check
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Project, ProjectPhase } from '@/types';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { supabase } from '@/services/supabaseClient';

interface ProjectPhasesViewProps {
    project: Project;
    onUpdate: (phases: ProjectPhase[]) => void;
}

const ProjectPhasesView: React.FC<ProjectPhasesViewProps> = ({ project, onUpdate }) => {
    const { addToast } = useToast();
    const [phases, setPhases] = useState<ProjectPhase[]>(project.phases || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPhases(project.phases || []);
    }, [project.phases]);

    const generatePhases = async () => {
        setIsGenerating(true);
        try {
            const prompt = `
        Act as a Senior Project Planner.
        Project: ${project.name}
        Type: ${project.type}
        Description: ${project.description}
        Start Date: ${project.startDate}
        End Date: ${project.endDate}

        Generate a realistic high-level project timeline with 5-7 key phases (e.g., Design, Permitting, Procurement, Construction, Closeout).
        For each phase, estimate start/end dates within the project duration.

        Return a JSON object with a "phases" array. Each phase object must have:
        - "name": string
        - "startDate": "YYYY-MM-DD"
        - "endDate": "YYYY-MM-DD"
        - "riskLevel": "Low" | "Medium" | "High"
        - "status": "Pending" | "In Progress" | "Completed" | "Delayed"

        Ensure phases are sequential but can overlap slightly. Return ONLY raw JSON.
      `;

            const res = await runRawPrompt(prompt, {
                model: 'gemini-2.0-flash-exp', // Updated model
                responseMimeType: 'application/json',
                temperature: 0.3,
            });

            const data = parseAIJSON(res);

            const newPhases: ProjectPhase[] = data.phases.map((p: any, i: number) => ({
                id: `ph-${Date.now()}-${i}`,
                name: p.name,
                startDate: p.startDate,
                endDate: p.endDate,
                status: p.status || 'Pending',
                progress: p.status === 'Completed' ? 100 : p.status === 'In Progress' ? 35 : 0,
                riskLevel: p.riskLevel || 'Low',
                color: ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500', 'bg-indigo-500'][i % 5]
            }));

            setPhases(newPhases);
            onUpdate(newPhases);
        } catch (error) {
            console.error("Failed to generate phases", error);
            addToast("AI Generation failed. Please try again.", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow re-uploading the same file if needed
        e.target.value = '';

        uploadAndAnalyze(file);
    };

    const uploadAndAnalyze = async (file: File) => {
        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', project.name);
        formData.append('type', project.type);

        try {
            // Get real Auth Token from Supabase
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;

            // Try explicit endpoint or fallback to relative
            const apiUrl = import.meta.env.VITE_API_URL || '';

            const response = await fetch(`${apiUrl}/api/ai/analyze-phase`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upload failed');
            }

            const data = await response.json();
            setAnalysisResult(data);
            addToast("Document analyzed successfully! Review the proposed phases below.", "success");

        } catch (error: any) {
            console.error("Analysis Error:", error);
            addToast(error.message || "Failed to analyze document", "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applyAnalysis = () => {
        if (!analysisResult?.phases) return;

        const newPhases: ProjectPhase[] = analysisResult.phases.map((p: any, i: number) => ({
            id: `ph-${Date.now()}-${i}`,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status || 'Pending',
            progress: p.status === 'Completed' ? 100 : p.status === 'In Progress' ? 35 : 0,
            riskLevel: p.riskLevel || 'Low',
            color: p.riskLevel === 'High' ? 'bg-red-500' : 'bg-blue-500' // Simple logic
        }));

        setPhases(newPhases);
        onUpdate(newPhases);
        setAnalysisResult(null);
        addToast("Phases updated from document analysis", "success");
    };

    const handlePhaseUpdate = (id: string, updates: Partial<ProjectPhase>) => {
        const updatedPhases = phases.map(p => p.id === id ? { ...p, ...updates } : p);
        setPhases(updatedPhases);
        onUpdate(updatedPhases);
    };

    const handleDeletePhase = (id: string) => {
        if (window.confirm('Are you sure you want to delete this phase?')) {
            const updatedPhases = phases.filter(p => p.id !== id);
            setPhases(updatedPhases);
            onUpdate(updatedPhases);
        }
    };

    const addNewPhase = () => {
        const newPhase: ProjectPhase = {
            id: `ph-${Date.now()}`,
            name: 'New Phase',
            startDate: project.startDate,
            endDate: project.startDate,
            status: 'Pending',
            progress: 0,
            riskLevel: 'Low',
            color: 'bg-zinc-500'
        };
        const updated = [...phases, newPhase];
        setPhases(updated);
        onUpdate(updated);
        setEditingPhaseId(newPhase.id);
    };

    // --- Timeline Rendering Logic ---
    const safeDate = (dateStr?: string) => {
        const d = new Date(dateStr || '');
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const projectStart = safeDate(project.startDate).getTime();
    const projectEnd = safeDate(project.endDate).getTime();
    const totalDuration = Math.max(1000 * 60 * 60 * 24, projectEnd - projectStart);

    const getLeft = (dateStr: string) => {
        const date = safeDate(dateStr).getTime();
        // If date is before project start, clamp to 0
        if (date < projectStart) return 0;
        const pos = ((date - projectStart) / totalDuration) * 100;
        return Math.max(0, Math.min(100, pos));
    };

    const getWidth = (startStr: string, endStr: string) => {
        const start = safeDate(startStr).getTime();
        const end = safeDate(endStr).getTime();
        // If phase is completely out of bounds, show minimal
        if (end < projectStart || start > projectEnd) return 0;

        const validStart = Math.max(start, projectStart);
        const validEnd = Math.min(end, projectEnd);

        const width = ((validEnd - validStart) / totalDuration) * 100;
        return Math.max(1, Math.min(100, width));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-500 border-green-600';
            case 'In Progress': return 'bg-blue-500 border-blue-600';
            case 'Delayed': return 'bg-red-500 border-red-600';
            default: return 'bg-zinc-400 border-zinc-500';
        }
    };

    const getRiskIndicator = (risk: string) => {
        switch (risk) {
            case 'High': return 'ring-2 ring-red-500 ring-offset-1';
            case 'Medium': return 'ring-2 ring-orange-400 ring-offset-1';
            default: return '';
        }
    };

    const getTimeTicks = () => {
        const ticks = [];
        const start = new Date(projectStart);
        const end = new Date(projectEnd);

        // If invalid dates, return empty
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        const current = new Date(start);
        current.setDate(1);

        while (current <= end) {
            if (current >= start) ticks.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
        if (ticks.length > 12) {
            const step = Math.ceil(ticks.length / 12);
            return ticks.filter((_, i) => i % step === 0);
        }
        return ticks;
    };

    const timeTicks = getTimeTicks();

    return (
        <div className="flex flex-col h-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm relative">
            {/* Analysis Result Modal */}
            {analysisResult && (
                <div className="absolute inset-0 z-50 bg-white bg-opacity-95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                <Sparkles className="text-purple-600" /> AI Analysis Result
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1">{analysisResult.summary}</p>
                        </div>
                        <button onClick={() => setAnalysisResult(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                            <X size={20} className="text-zinc-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto mb-6 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-zinc-400 uppercase border-b border-zinc-200">
                                <tr>
                                    <th className="pb-2 font-semibold">Phase</th>
                                    <th className="pb-2 font-semibold">Timeline</th>
                                    <th className="pb-2 font-semibold">Risk</th>
                                    <th className="pb-2 font-semibold">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {analysisResult.phases.map((p: any, i: number) => (
                                    <tr key={i} className="group hover:bg-white transition-colors">
                                        <td className="py-3 font-medium text-zinc-800">{p.name}</td>
                                        <td className="py-3 text-zinc-600 font-mono text-xs">{p.startDate} → {p.endDate}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.riskLevel === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                p.riskLevel === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                                }`}>{p.riskLevel}</span>
                                        </td>
                                        <td className="py-3 text-zinc-500 italic max-w-xs truncate">{p.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setAnalysisResult(null)}
                            className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={applyAnalysis}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
                        >
                            <Check size={16} /> Apply {analysisResult.phases.length} Phases
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <div>
                    <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        <Calendar className="text-[#0f5c82]" size={20} /> Project Lifecycle
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1">Phasing, milestones, and risk management</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,application/pdf,image/*"
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating || isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-700 border border-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all disabled:opacity-50"
                        title="Upload Schedule PDF or Image"
                    >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin text-purple-600" /> : <Upload size={14} />}
                        {isAnalyzing ? 'Analyzing...' : 'Smart Upload'}
                    </button>

                    <button
                        onClick={generatePhases}
                        disabled={isGenerating || isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {isGenerating ? 'Architecting...' : 'AI Generate'}
                    </button>
                    <button
                        onClick={addNewPhase}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-colors"
                    >
                        <Plus size={14} /> Add Phase
                    </button>
                </div>
            </div>

            {/* Visual Timeline */}
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/30 relative overflow-hidden min-h-[200px]">
                {phases.length > 0 ? (
                    <div className="relative h-full pt-10 pb-2">
                        {/* Timeline Grid & Ticks */}
                        <div className="absolute top-0 left-0 right-0 h-6 border-b border-zinc-200 select-none pointer-events-none">
                            {timeTicks.map((date, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 text-[10px] text-zinc-400 transform -translate-x-1/2"
                                    style={{ left: `${getLeft(date.toISOString())}%` }}
                                >
                                    <div className="h-2 w-px bg-zinc-300 mx-auto mb-1"></div>
                                    {date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-6 bottom-0 left-0 right-0 pointer-events-none">
                            {timeTicks.map((date, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 w-px bg-zinc-100"
                                    style={{ left: `${getLeft(date.toISOString())}%` }}
                                />
                            ))}
                        </div>

                        {/* Bars */}
                        <div className="space-y-3 mt-4 relative z-10">
                            {phases.map((phase) => (
                                <div
                                    key={phase.id}
                                    className="relative h-10 group cursor-pointer"
                                    title={`${phase.name}: ${phase.startDate} - ${phase.endDate} (${phase.status})`}
                                    onClick={() => setEditingPhaseId(phase.id === editingPhaseId ? null : phase.id)}
                                >
                                    {/* Bar Container */}
                                    <div
                                        className={`absolute h-8 rounded-lg shadow-sm border transition-all hover:scale-[1.02] hover:shadow-md flex items-center px-3 overflow-hidden ${getStatusColor(phase.status)} ${getRiskIndicator(phase.riskLevel)}`}
                                        style={{
                                            left: `${getLeft(phase.startDate)}%`,
                                            width: `${getWidth(phase.startDate, phase.endDate)}%`
                                        }}
                                    >
                                        <span className="text-[10px] font-bold text-white truncate drop-shadow-md w-full">{phase.name}</span>
                                    </div>

                                    {/* Status/Risk Badge (Hover) */}
                                    <div
                                        className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap"
                                        style={{ left: `${getLeft(phase.startDate) + (getWidth(phase.startDate, phase.endDate) / 2)}%` }}
                                    >
                                        <span>{phase.riskLevel} Risk</span>
                                        <span>•</span>
                                        <span>{phase.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl bg-white py-8">
                        <Calendar size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">No phases defined. Use AI to generate a plan.</p>
                    </div>
                )}
            </div>

            {/* Phase List / Editor */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50">
                <div className="space-y-3">
                    {phases.map((phase) => (
                        <div key={phase.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${editingPhaseId === phase.id ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-zinc-200 hover:border-blue-200'}`}>
                            {/* Summary Row */}
                            <div
                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                                onClick={() => setEditingPhaseId(editingPhaseId === phase.id ? null : phase.id)}
                            >
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(phase.status).split(' ')[0]}`} />
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>
                                        <h4 className="font-bold text-sm text-zinc-900">{phase.name}</h4>
                                        <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                            {phase.riskLevel === 'High' && <span className="text-red-600 flex items-center gap-0.5 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100"><AlertTriangle size={8} /> High Risk</span>}
                                            {phase.riskLevel === 'Medium' && <span className="text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">Medium Risk</span>}
                                            {phase.riskLevel === 'Low' && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Low Risk</span>}
                                        </div>
                                    </div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Clock size={12} /> {phase.startDate} <span className="mx-1">→</span> {phase.endDate}
                                    </div>
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex-1 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${getStatusColor(phase.status).split(' ')[0]}`} style={{ width: `${phase.progress}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-600 w-8 text-right">{phase.progress}%</span>
                                    </div>
                                </div>
                                <button className="text-zinc-400 hover:text-zinc-600">
                                    {editingPhaseId === phase.id ? <ChevronDown size={16} className="rotate-180 transition-transform" /> : <ChevronDown size={16} className="transition-transform" />}
                                </button>
                            </div>

                            {/* Edit Form */}
                            {editingPhaseId === phase.id && (
                                <div className="p-6 border-t border-zinc-100 bg-zinc-50/30 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Phase Name</label>
                                            <input
                                                type="text"
                                                value={phase.name}
                                                onChange={(e) => handlePhaseUpdate(phase.id, { name: e.target.value })}
                                                className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-[#0f5c82] outline-none bg-white transition-shadow"
                                            />
                                        </div>

                                        {/* Schedule Section */}
                                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                                            <h5 className="text-xs font-bold text-zinc-800 mb-3 flex items-center gap-2"><Calendar size={14} className="text-zinc-400" /> Schedule</h5>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Start</label>
                                                    <input
                                                        type="date"
                                                        value={phase.startDate}
                                                        onChange={(e) => handlePhaseUpdate(phase.id, { startDate: e.target.value })}
                                                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-[#0f5c82]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">End</label>
                                                    <input
                                                        type="date"
                                                        value={phase.endDate}
                                                        onChange={(e) => handlePhaseUpdate(phase.id, { endDate: e.target.value })}
                                                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-[#0f5c82]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Risk Section */}
                                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                                            <h5 className="text-xs font-bold text-zinc-800 mb-3 flex items-center gap-2"><BarChart size={14} className="text-zinc-400" /> Status & Risk</h5>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Status</label>
                                                        <select
                                                            value={phase.status}
                                                            onChange={(e) => handlePhaseUpdate(phase.id, { status: e.target.value as any })}
                                                            className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-[#0f5c82] bg-white"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Completed">Completed</option>
                                                            <option value="Delayed">Delayed</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Risk Level</label>
                                                        <select
                                                            value={phase.riskLevel}
                                                            onChange={(e) => handlePhaseUpdate(phase.id, { riskLevel: e.target.value as any })}
                                                            className={`w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:border-[#0f5c82] bg-white font-medium ${phase.riskLevel === 'High' ? 'text-red-600' : phase.riskLevel === 'Medium' ? 'text-orange-600' : 'text-green-600'
                                                                }`}
                                                        >
                                                            <option value="Low">Low</option>
                                                            <option value="Medium">Medium</option>
                                                            <option value="High">High</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Completion ({phase.progress}%)</label>
                                                    <input
                                                        type="range"
                                                        min="0" max="100"
                                                        value={phase.progress}
                                                        onChange={(e) => handlePhaseUpdate(phase.id, { progress: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#0f5c82]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
                                        <button
                                            onClick={() => handleDeletePhase(phase.id)}
                                            className="px-4 py-2 text-red-600 bg-white border border-zinc-200 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete Phase
                                        </button>
                                        <button
                                            onClick={() => setEditingPhaseId(null)}
                                            className="px-6 py-2 bg-[#0f5c82] text-white rounded-lg text-xs font-bold hover:bg-[#0c4a6e] transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Save size={14} /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectPhasesView;
