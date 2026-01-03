import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    AlertTriangle, Eye, Shield, Flame, Wind,
    CheckCircle2, AlertOctagon, Thermometer, ShieldAlert,
    MoreVertical, FileText, Siren, Upload, Camera,
    ScanLine, X, ArrowRight, Loader2, Plus, BookOpen, FileBarChart,
    Video, StopCircle, Focus, Activity, Brain
} from 'lucide-react';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { SafetyIncident, SafetyHazard, Defect, Task } from '@/types';
import { useProjects } from '@/contexts/ProjectContext';
import { useToast } from '@/contexts/ToastContext';

interface SafetyViewProps {
    projectId?: string;
}

const SafetyView: React.FC<SafetyViewProps> = ({ projectId }) => {
    const { addToast } = useToast();
    const {
        safetyIncidents, addSafetyIncident, updateSafetyIncident,
        projects, safetyHazards, addSafetyHazard,
        defects, addDefect, updateDefect, addTask
    } = useProjects();

    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SCANNER' | 'QC_SCANNER' | 'RISK_REPORT'>('DASHBOARD');
    const [showReportModal, setShowReportModal] = useState(false);

    // Scanner State
    const [scanImage, setScanImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detectedHazards, setDetectedHazards] = useState<SafetyHazard[]>([]);
    const [detectedDefects, setDetectedDefects] = useState<Defect[]>([]);
    const [selectedHazard, setSelectedHazard] = useState<SafetyHazard | null>(null);
    const [complianceReport, setComplianceReport] = useState<string | null>(null);
    const [siteRiskReport, setSiteRiskReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analysisInterval = useRef<number | null>(null);

    const filteredIncidents = useMemo(() => {
        if (!projectId) return safetyIncidents;
        return safetyIncidents.filter(i => i.projectId === projectId);
    }, [safetyIncidents, projectId]);

    const filteredHazards = useMemo(() => {
        if (!projectId) return safetyHazards;
        return safetyHazards.filter(h => h.projectId === projectId);
    }, [safetyHazards, projectId]);

    const safetyScore = useMemo(() => {
        const baseScore = 100;
        const incidentPenalty = filteredIncidents.filter(i => i.status === 'Open').length * 5;
        const hazardPenalty = filteredHazards.filter(h => h.severity === 'High').length * 2;
        return Math.max(0, Math.min(100, baseScore - incidentPenalty - hazardPenalty)).toFixed(1);
    }, [filteredIncidents, filteredHazards]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            stopCamera();
            const reader = new FileReader();
            reader.onloadend = () => {
                setScanImage(reader.result as string);
                setDetectedHazards([]);
                setDetectedDefects([]);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Live Camera Logic ---
    const startCamera = async () => {
        try {
            setScanImage(null);
            setIsCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    startLiveAnalysisLoop();
                };
            }
        } catch (e) {
            console.error("Camera access failed", e);
            addToast("Could not access camera. Please check permissions.", "error");
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (analysisInterval.current) clearInterval(analysisInterval.current);
        analysisInterval.current = null;

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setIsAnalyzing(false);
    };

    const startLiveAnalysisLoop = () => {
        analyzeLiveFrame();
        analysisInterval.current = window.setInterval(analyzeLiveFrame, 3000);
    };

    const analyzeLiveFrame = async () => {
        if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.7).split(',')[1];

        setIsAnalyzing(true);
        try {
            const prompt = `
            Analyze this construction site video frame for safety hazards.
            Return a JSON array of objects. Each object must have:
            - "type": Short title (e.g. "No Helmet").
            - "severity": "High", "Medium", or "Low".
            - "riskScore": Number 1-10.
            - "description": Brief explanation.
            - "recommendation": Short fix.
            - "regulation": Relevant code (e.g. OSHA).
            - "box_2d": [ymin, xmin, ymax, xmax] coordinates for the bounding box on a 0-1000 scale.
          `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-2.5-flash',
                temperature: 0.3,
                responseMimeType: 'application/json'
            }, base64Data);

            const hazards = parseAIJSON(result);
            if (Array.isArray(hazards)) {
                setDetectedHazards(hazards);
                hazards.forEach(h => {
                    addSafetyHazard({
                        ...h,
                        id: `haz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        projectId: projectId || 'site-wide',
                        timestamp: Date.now()
                    });
                });
            }
        } catch (e) {
            console.error("Live analysis error", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Static Image Logic ---
    const runStaticScan = async () => {
        if (!scanImage || isAnalyzing) return;
        setIsAnalyzing(true);
        setDetectedHazards([]);

        try {
            const base64 = scanImage.split(',')[1];
            const prompt = `
        Analyze this construction site image for potential safety hazards, risks, and OSHA violations.
        Return a JSON array of objects. Each object must have:
        - "type": Short title of the hazard.
        - "severity": "High", "Medium", or "Low".
        - "riskScore": A number from 1 to 10.
        - "description": Brief explanation.
        - "recommendation": Immediate corrective action.
        - "regulation": Relevant OSHA or safety code.
        - "box_2d": [ymin, xmin, ymax, xmax] coordinates on 0-1000 scale.
      `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                temperature: 0.2,
                responseMimeType: 'application/json'
            }, base64);

            const hazards = parseAIJSON(result);
            const validatedHazards = Array.isArray(hazards) ? hazards : [];
            setDetectedHazards(validatedHazards);

            validatedHazards.forEach(h => {
                addSafetyHazard({
                    ...h,
                    id: `haz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    projectId: projectId || 'site-wide',
                    timestamp: Date.now()
                });
            });
        } catch (e) {
            console.error("Scan failed", e);
            addToast("Failed to analyze image.", 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runQCScan = async () => {
        if (!scanImage || isAnalyzing) return;
        setIsAnalyzing(true);
        setDetectedDefects([]);

        try {
            const base64 = scanImage.split(',')[1];
            const prompt = `
        Analyze this construction site image for potential quality control (QC) defects or structural issues.
        Return a JSON array of objects. Each object must have:
        - "title": Short title of the defect.
        - "severity": "High", "Medium", "Low", or "Critical".
        - "category": "Structural", "Plumbing", "Electrical", "Mechanical", "Finish", or "General".
        - "description": Brief explanation.
        - "recommendation": Corrective action.
        - "location": Where in the image this is.
        - "box_2d": [ymin, xmin, ymax, xmax] on 0-1000 scale.
      `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                temperature: 0.2,
                responseMimeType: 'application/json'
            }, base64);

            const fetchedDefects = parseAIJSON(result);
            const validatedDefects = Array.isArray(fetchedDefects) ? fetchedDefects : [];
            setDetectedDefects(validatedDefects);

            validatedDefects.forEach(d => {
                addDefect({
                    ...d,
                    id: `def-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    projectId: projectId || (projects[0]?.id || 'p1'),
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    image: scanImage
                });
            });
            addToast(`AI detected ${validatedDefects.length} potential defects.`, 'success');
        } catch (e) {
            console.error("QC Scan failed", e);
            addToast("Failed to analyze image for defects.", 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const createRemediationTask = async (defect: Defect) => {
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: `Remediate: ${defect.title}`,
            projectId: defect.projectId,
            status: 'To Do',
            priority: defect.severity === 'Critical' ? 'Critical' : defect.severity === 'High' ? 'High' : 'Medium',
            description: `AI Detected Defect remediation required.\nDescription: ${defect.description}\nCategory: ${defect.category}\nRecommendation: ${defect.recommendation}`,
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            assigneeType: 'role'
        };
        await addTask(newTask);
        await updateDefect(defect.id, { status: 'Remediating', remediationTaskId: newTask.id });
        addToast("Remediation task created.", "success");
    };

    const logHazard = async (hazard: SafetyHazard) => {
        const newIncident: SafetyIncident = {
            id: `si-${Date.now()}`,
            title: hazard.type,
            project: projectId ? 'Current Project' : 'Site Assessment',
            projectId: projectId,
            severity: hazard.severity,
            status: 'Open',
            date: new Date().toLocaleDateString(),
            type: 'AI Detected'
        };
        await addSafetyIncident(newIncident);
        addToast("Incident Logged.", 'success');
    };

    const generateComplianceReport = async () => {
        if (detectedHazards.length === 0 || isGeneratingReport) return;
        setIsGeneratingReport(true);
        try {
            const hazardsStr = JSON.stringify(detectedHazards);
            const prompt = `Act as a Senior OSHA Compliance Officer. Analyze these hazards: ${hazardsStr}. Provide a Markdown report with Executive Summary, Actions, and Prevention strategies.`;
            const report = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', temperature: 0.4 });
            setComplianceReport(report);
            setViewMode('SCANNER');
        } catch (e) {
            addToast("Failed to generate report.", "error");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const generateSiteRiskReport = async () => {
        setIsGeneratingReport(true);
        try {
            const prompt = `
                Based on the REAL-TIME SAFETY INCIDENTS in the system context:
                1. Identify the top 3 recurring hazard patterns.
                2. Calculate a "Trend Rating" (Improving/Worsening).
                3. Suggest specific Toolbox Talk topics for the crew.
                4. Provide a summarized "Site Safety Assessment" paragraph.
                
                Format as valid Markdown.
            `;
            const report = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                contextType: 'SAFETY'
            });
            setSiteRiskReport(report);
            setViewMode('RISK_REPORT');
        } catch (e) {
            addToast("Failed to generate site report", "error");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleResolveIncident = async (id: string) => {
        await updateSafetyIncident(id, { status: 'Resolved' });
    };

    const handleReportIncident = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newIncident: SafetyIncident = {
            id: `si-${Date.now()}`,
            title: formData.get('title') as string,
            project: projectId ? projects.find(p => p.id === projectId)?.name || 'Current Project' : (formData.get('projectName') as string || 'General Site'),
            projectId: projectId || (formData.get('projectId') as string),
            severity: formData.get('severity') as 'High' | 'Medium' | 'Low',
            status: 'Open',
            date: new Date().toISOString().split('T')[0],
            type: formData.get('type') as string
        };
        await addSafetyIncident(newIncident);
        setShowReportModal(false);
    };

    const getRiskColor = (score: number | undefined) => {
        if (!score) return 'bg-blue-500 text-white';
        if (score >= 8) return 'bg-red-600 text-white';
        if (score >= 5) return 'bg-orange-500 text-white';
        return 'bg-blue-500 text-white';
    };

    const getSeverityBorder = (severity: string) => {
        switch (severity) {
            case 'High': return 'border-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
            case 'Medium': return 'border-orange-500 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
            default: return 'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 h-full flex flex-col p-4">
            <div className="flex justify-between items-end flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1 flex items-center gap-3">
                        Site Operations & Field Intelligence {viewMode !== 'DASHBOARD' && <span className="text-lg text-zinc-400 font-normal">/ {viewMode === 'SCANNER' ? 'Safety Scan' : 'QC Intelligence'}</span>}
                    </h1>
                    <p className="text-zinc-500">Persistent monitoring, AI hazard detection, and predictive quality control.</p>
                </div>
                <div className="flex gap-3">
                    {viewMode !== 'DASHBOARD' ? (
                        <button onClick={() => { setViewMode('DASHBOARD'); stopCamera(); }} className="px-5 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors border border-zinc-200">
                            Back to Command Center
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => setViewMode('SCANNER')} className="bg-[#0f5c82] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-[#0c4a6e] transition-all flex items-center gap-2">
                                <Shield size={20} /> Safety Scan
                            </button>
                            <button onClick={() => setViewMode('QC_SCANNER')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                                <Activity size={20} /> QC Intelligence
                            </button>
                        </div>
                    )}
                    {viewMode === 'DASHBOARD' && (
                        <div className="flex gap-2">
                            <button onClick={generateSiteRiskReport} disabled={isGeneratingReport} className="bg-white text-zinc-700 border border-zinc-200 px-4 py-2.5 rounded-xl font-bold hover:bg-zinc-50 transition-all flex items-center gap-2">
                                {isGeneratingReport ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                                Site Risk Report
                            </button>
                            <button onClick={() => setShowReportModal(true)} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
                                <Siren size={20} /> Report Incident
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'SCANNER' || viewMode === 'QC_SCANNER' ? (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-black rounded-2xl relative overflow-hidden flex items-center justify-center group border border-zinc-800 shadow-2xl min-h-[400px]">
                        {isCameraActive ? (
                            <div className="relative w-full h-full">
                                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                                <canvas ref={canvasRef} className="hidden" />
                                {detectedHazards.map((h, i) => (
                                    <div key={i} className={`absolute border-2 z-20 group/box transition-all duration-300 hover:z-50 ${getSeverityBorder(h.severity)}`} style={{ top: `${h.box_2d![0] / 10}%`, left: `${h.box_2d![1] / 10}%`, height: `${(h.box_2d![2] - h.box_2d![0]) / 10}%`, width: `${(h.box_2d![3] - h.box_2d![1]) / 10}%` }}>
                                        <div className="absolute -top-6 left-0 bg-black text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">{h.type}</div>
                                    </div>
                                ))}
                                <button onClick={stopCamera} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full font-bold z-30"><StopCircle size={18} /> Stop</button>
                            </div>
                        ) : scanImage ? (
                            <div className="relative w-full h-full">
                                <img src={scanImage} alt="Scan Target" className="w-full h-full object-contain" />
                                {detectedHazards.map((h, i) => (
                                    <div key={i} className={`absolute border-2 z-20 group/box transition-all duration-300 ${getSeverityBorder(h.severity)}`} style={{ top: `${h.box_2d![0] / 10}%`, left: `${h.box_2d![1] / 10}%`, height: `${(h.box_2d![2] - h.box_2d![0]) / 10}%`, width: `${(h.box_2d![3] - h.box_2d![1]) / 10}%` }}>
                                        <div className="absolute -top-6 left-0 bg-black text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">{h.type}</div>
                                    </div>
                                ))}
                                {detectedDefects.map((d, i) => (
                                    <div key={i} className="absolute border-2 border-indigo-500 bg-indigo-500/10 z-20" style={{ top: `${d.box_2d![0] / 10}%`, left: `${d.box_2d![1] / 10}%`, height: `${(d.box_2d![2] - d.box_2d![0]) / 10}%`, width: `${(d.box_2d![3] - d.box_2d![1]) / 10}%` }}>
                                        <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">{d.title}</div>
                                    </div>
                                ))}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 z-30">
                                    <button onClick={() => { setScanImage(null); setDetectedHazards([]); setDetectedDefects([]); }} className="bg-black/50 text-white px-4 py-2 rounded-lg border border-white/10">Change Image</button>
                                    {!isAnalyzing && (
                                        viewMode === 'SCANNER' ? (
                                            <button onClick={runStaticScan} className="bg-[#0f5c82] text-white px-6 py-2 rounded-lg font-bold">Run Safety Scan</button>
                                        ) : (
                                            <button onClick={runQCScan} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Run QC Analysis</button>
                                        )
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-12 text-zinc-500">
                                <Focus size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="mb-6">Start a scan or upload a photo.</p>
                                <div className="flex gap-4">
                                    <button onClick={startCamera} className="bg-zinc-800 text-white px-6 py-2 rounded-xl flex items-center gap-2"><Video size={18} /> Camera</button>
                                    <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 text-white px-6 py-2 rounded-xl flex items-center gap-2"><Upload size={18} /> Upload</button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>
                        )}
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                                <Loader2 size={40} className="animate-spin text-white mb-4" />
                                <p className="text-white font-bold">AI Analyzing Surface Intelligence...</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col shadow-sm h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {viewMode === 'SCANNER' ? <Shield size={20} className="text-[#0f5c82]" /> : <Brain size={20} className="text-indigo-600" />}
                                {viewMode === 'SCANNER' ? 'Safety Observation Results' : 'AI QC Analysis Engine'}
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                            {viewMode === 'QC_SCANNER' ? (
                                detectedDefects.length > 0 ? (
                                    detectedDefects.map((defect, i) => (
                                        <div key={i} className="border border-zinc-200 rounded-xl p-4 hover:border-indigo-300 transition-all">
                                            <div className="flex justify-between mb-2">
                                                <h4 className="font-bold">{defect.title}</h4>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700">{defect.severity}</span>
                                            </div>
                                            <p className="text-sm text-zinc-600 mb-3">{defect.description}</p>
                                            <button onClick={() => createRemediationTask(defect)} className="w-full py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold transition-all hover:bg-indigo-600">Create Remediation Task</button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-400">Ready for QC scan.</div>
                                )
                            ) : (
                                <>
                                    {complianceReport && <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">{complianceReport}</div>}
                                    {detectedHazards.length > 0 ? (
                                        detectedHazards.map((hazard, i) => (
                                            <div key={i} className="border border-zinc-200 rounded-xl p-4 hover:border-blue-300 transition-all">
                                                <div className="flex justify-between mb-2">
                                                    <h4 className="font-bold">{hazard.type}</h4>
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-700">{hazard.severity}</span>
                                                </div>
                                                <p className="text-sm text-zinc-600 mb-3">{hazard.description}</p>
                                                <button onClick={() => logHazard(hazard)} className="w-full py-2 border border-zinc-200 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-700">Log as Incident</button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-zinc-400">Ready for safety scan.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : viewMode === 'RISK_REPORT' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-8 border-b border-zinc-100 pb-6">
                            <div className="p-3 bg-red-50 rounded-xl text-red-600">
                                <ShieldAlert size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Site Safety Assessment</h2>
                                <p className="text-zinc-500 font-medium">AI-Generated Analysis of Live Incident Data</p>
                            </div>
                        </div>
                        <div className="prose prose-zinc max-w-none prose-headings:font-black prose-h3:text-[#0f5c82] prose-strong:text-zinc-900">
                            {siteRiskReport ? (
                                <div className="space-y-4 text-slate-700 whitespace-pre-wrap">
                                    {siteRiskReport}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                    <Loader2 size={40} className="animate-spin mb-4" />
                                    <p>Analyzing safety trends...</p>
                                </div>
                            )}
                        </div>
                        {siteRiskReport && (
                            <div className="mt-8 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700">
                                {siteRiskReport}
                            </div>
                        )}
                        <div className="mt-12 pt-8 border-t border-zinc-100 flex justify-end">
                            <button onClick={() => setViewMode('DASHBOARD')} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all">
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 overflow-y-auto overflow-x-hidden flex-1 pr-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="text-3xl font-bold">{safetyScore}%</div>
                            <div className="text-sm text-zinc-500 font-medium">Safety Score</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="text-3xl font-bold">{filteredIncidents.filter(i => i.status === 'Open').length}</div>
                            <div className="text-sm text-zinc-500 font-medium">Active Incidents</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="text-3xl font-bold">{defects.filter(d => d.status === 'Open').length}</div>
                            <div className="text-sm text-zinc-500 font-medium">Open QC Defects</div>
                        </div>
                        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg border border-zinc-800">
                            <div className="flex items-center gap-2 mb-1"><Brain size={16} className="text-indigo-400" /> <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">AI Insight</span></div>
                            <div className="text-sm font-bold">Inclement weather predicted. Verify scaffolding stability in Sector 4.</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                <h3 className="font-bold text-lg flex items-center gap-2"><Activity size={20} className="text-[#0f5c82]" /> Intelligence Feed</h3>
                                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">{filteredHazards.length} Safety</span>
                                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">{defects.length} Quality</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {[...filteredHazards, ...defects].sort((a: any, b: any) => (b.timestamp || b.createdAt).toString().localeCompare((a.timestamp || a.createdAt).toString())).slice(0, 15).map((item: any, i) => (
                                    <div key={item.id || i} className="flex gap-4 p-4 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition-all group">
                                        <div className={`w-1 rounded-full ${item.severity === 'High' || item.severity === 'Critical' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <div className="font-bold text-zinc-900 group-hover:text-[#0f5c82] transition-colors">{item.type || item.title}</div>
                                                <div className="text-[10px] text-zinc-400 font-mono">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recent'}</div>
                                            </div>
                                            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {filteredHazards.length === 0 && defects.length === 0 && <div className="text-center py-12 text-zinc-400 italic">No intelligence logs found.</div>}
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                <h3 className="font-bold text-lg flex items-center gap-2"><Siren size={20} className="text-red-500" /> Reported Incidents</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-zinc-50/50 text-zinc-500 uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-zinc-100">Event</th>
                                            <th className="px-6 py-4 border-b border-zinc-100">Status</th>
                                            <th className="px-6 py-4 border-b border-zinc-100 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {filteredIncidents.slice(0, 10).map((inc, i) => (
                                            <tr key={inc.id || i} className="hover:bg-zinc-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-zinc-900">{inc.title}</div>
                                                    <div className="text-[10px] text-zinc-400">{inc.date}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${inc.status === 'Open' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{inc.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {inc.status !== 'Resolved' && (
                                                        <button onClick={() => inc.id && handleResolveIncident(inc.id)} className="bg-[#0f5c82] text-white px-3 py-1.5 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-[#0c4a6e] shadow-sm">Resolve</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredIncidents.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-400 italic">No reported incidents.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Report Incident</h2>
                            <button onClick={() => setShowReportModal(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleReportIncident} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</label>
                                <input name="title" required placeholder="Describe the safety observation..." className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold placeholder:text-zinc-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Severity</label>
                                    <select name="severity" className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold appearance-none cursor-pointer">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Category</label>
                                    <select name="type" className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold appearance-none cursor-pointer">
                                        <option value="Safety">Safety</option>
                                        <option value="Quality">Quality</option>
                                        <option value="Equipment">Equipment</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 py-4 font-black text-zinc-500 hover:bg-zinc-100 rounded-2xl transition-colors">Dismiss</button>
                                <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 hover:-translate-y-1 active:translate-y-0 transition-all">Submit Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SafetyView;
