
import React, { useState, useRef, useEffect } from 'react';
import {
    Wand2, Download, Share2, Loader2, RefreshCw,
    ScanEye, ShieldAlert, HardHat, Search, AlertTriangle,
    CheckCircle2, FileText, Upload, X, ImageIcon, Layers,
    Map, ClipboardCheck, Check, Calculator, Activity,
    Info, AlertOctagon, HelpCircle, Briefcase, Save, CheckSquare,
    Video, Play, Ratio, ScanLine, Target, Zap, ArrowRight, StopCircle, MessageSquare, Send, Eye, Camera, Maximize2, BrainCircuit, Sparkles
} from 'lucide-react';
import { generateImage, generateVideo, runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { GeneratedImage, ProjectDocument, Task } from '@/types';
import { db } from '@/services/db';
import { useProjects } from '@/contexts/ProjectContext';

type Mode = 'CREATE_IMAGE' | 'CREATE_VIDEO' | 'LIVE_FEED' | 'INSPECT';
type AnalysisMode = 'SAFETY' | 'QUALITY' | 'PROGRESS';

const ImagineView: React.FC = () => {
    const { projects, addDocument, addTask } = useProjects();
    const [mode, setMode] = useState<Mode>('CREATE_IMAGE');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    // --- Imagine State (Image/Video) ---
    const [imgPrompt, setImgPrompt] = useState('');
    const [imgAspectRatio, setImgAspectRatio] = useState('1:1');
    const [isImgGenerating, setIsImgGenerating] = useState(false);
    const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
    const [history, setHistory] = useState<GeneratedImage[]>([]);
    const [vidPrompt, setVidPrompt] = useState('');
    const [vidAspectRatio, setVidAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isVidGenerating, setIsVidGenerating] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    // --- Live Vision State ---
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [visionMode, setVisionMode] = useState<AnalysisMode>('SAFETY');
    const [observations, setObservations] = useState<any[]>([]);
    const [isVisionProcessing, setIsVisionProcessing] = useState(false);
    const [visionError, setVisionError] = useState<string | null>(null);
    const [agentQuery, setAgentQuery] = useState('');
    const [agentResponse, setAgentResponse] = useState('');
    const [isAgentThinking, setIsAgentThinking] = useState(false);
    const [snapshot, setSnapshot] = useState<string | null>(null); // For pausing analysis on a frame
    const [deepInspectResult, setDeepInspectResult] = useState<string | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Upload Analysis State ---
    const [analyzeMedia, setAnalyzeMedia] = useState<string | null>(null); // Data URL
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [mimeType, setMimeType] = useState<string>('image/jpeg');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        }
        // Fetch AI History
        const loadHistory = async () => {
            try {
                const assets = await db.getAIAssets('IMAGE');
                // Map DB asset to GeneratedImage type
                setHistory(assets.map(a => ({
                    url: a.url,
                    prompt: a.prompt,
                    id: a.id,
                    createdAt: a.createdAt
                })));
            } catch (e) {
                console.error("Failed to load history", e);
            }
        };
        loadHistory();

        return () => stopCamera();
    }, [projects, selectedProjectId]);

    const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await db.deleteAIAsset(id);
            setHistory(prev => prev.filter(h => h.id !== id));
            if (currentImage?.id === id) setCurrentImage(null);
        } catch (e) {
            showNotification("Failed to delete asset");
        }
    };

    // --- Camera Logic ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setVisionError(null);
                setIsCameraActive(true);
                setSnapshot(null);
                setDeepInspectResult(null);
                startAnalysisLoop();
            }
        } catch (e) {
            console.error("Camera error:", e);
            setVisionError("Could not access camera. Please allow permissions.");
        }
    };

    const stopCamera = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsCameraActive(false);
        setIsVisionProcessing(false);
    };

    const captureFrame = (): string | null => {
        if (snapshot) return snapshot.split(',')[1];
        if (!videoRef.current || !canvasRef.current) return null;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return null;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        return canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    };

    const takeSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setSnapshot(canvasRef.current.toDataURL('image/jpeg', 0.9));
        // Pause live feed loop
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsVisionProcessing(false);
    };

    const analyzeFrame = async () => {
        if (isVisionProcessing || snapshot) return; // Don't run auto-loop if snapshotted
        const base64Image = captureFrame();
        if (!base64Image) return;

        setIsVisionProcessing(true);
        try {
            let prompt = "";
            if (visionMode === 'SAFETY') {
                prompt = `Analyze this construction site image for SAFETY hazards. Return JSON array: [{ "severity": "CRITICAL"|"WARNING"|"PASS", "title": "Short Title", "description": "Brief description" }]. Limit to 3 items.`;
            } else if (visionMode === 'QUALITY') {
                prompt = `Analyze this construction image for QUALITY defects. Return JSON array: [{ "severity": "CRITICAL"|"WARNING"|"INFO", "title": "Defect", "description": "Details" }]. Limit to 3 items.`;
            } else {
                prompt = `Analyze this construction image for PROGRESS. Return JSON array: [{ "severity": "INFO", "title": "Work Item", "description": "Status" }]. Limit to 3 items.`;
            }

            const result = await runRawPrompt(prompt, {
                model: 'gemini-2.5-flash', // Use Flash for speed
                temperature: 0.4,
                responseMimeType: 'application/json'
            }, base64Image);

            const data = parseAIJSON(result);
            const newObs = (Array.isArray(data) ? data : [data]).map((obs: any) => ({
                ...obs,
                id: Date.now().toString() + Math.random().toString(),
                timestamp: new Date().toLocaleTimeString()
            }));
            setObservations(newObs); // Replace observations for live feel
        } catch (e) {
            console.error("Vision analysis failed", e);
        } finally {
            setIsVisionProcessing(false);
        }
    };

    const startAnalysisLoop = () => {
        analyzeFrame();
        intervalRef.current = window.setInterval(analyzeFrame, 4000); // 4s loop
    };

    const handleSnapshotInspection = async () => {
        if (!snapshot) return;
        setIsInspecting(true);
        setDeepInspectResult(null);

        try {
            const base64 = snapshot.split(',')[1];
            const prompt = `
            Perform a deep, expert inspection of this construction site snapshot.
            Focus on:
            1. Safety Hazards (OSHA compliance)
            2. Quality of workmanship
            3. Visible progress against typical milestones

            Provide a detailed, structured report in markdown. Be specific about what you see.
          `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview', // Pro for deep reasoning
                temperature: 0.4
            }, base64);

            setDeepInspectResult(result);
        } catch (e) {
            setDeepInspectResult("Failed to inspect image.");
        } finally {
            setIsInspecting(false);
        }
    };

    const handleAgentQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentQuery.trim()) return;
        const base64Image = captureFrame();
        if (!base64Image) { setAgentResponse("Camera not active."); return; }

        setIsAgentThinking(true);
        setAgentResponse('');
        try {
            const prompt = `User asks about the live feed: "${agentQuery}". Answer concisely based on visual evidence.`;
            const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', temperature: 0.5 }, base64Image);
            setAgentResponse(response);
        } catch (e) {
            setAgentResponse("Processing error.");
        } finally {
            setIsAgentThinking(false);
            setAgentQuery('');
        }
    };

    // --- Image Generator ---
    const handleGenerateImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imgPrompt.trim() || isImgGenerating) return;
        setIsImgGenerating(true);
        try {
            const imageUrl = await generateImage(imgPrompt, imgAspectRatio);

            // Persist to DB
            const savedAsset = await db.saveAIAsset({
                type: 'IMAGE',
                url: imageUrl,
                prompt: imgPrompt,
                projectId: selectedProjectId,
                metadata: { aspectRatio: imgAspectRatio, model: 'gemini-3-pro' }
            });

            const newImage = {
                url: imageUrl,
                prompt: imgPrompt,
                id: savedAsset.id,
                createdAt: savedAsset.createdAt
            };
            setCurrentImage(newImage);
            setHistory(prev => [newImage, ...prev]);
        } catch (error) {
            console.error("Image Gen failed", error);
            showNotification("Failed to generate image.");
        } finally {
            setIsImgGenerating(false);
        }
    };

    // --- Video Generator ---
    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vidPrompt.trim() || isVidGenerating) return;
        setIsVidGenerating(true);
        try {
            const videoUrl = await generateVideo(vidPrompt, vidAspectRatio);
            setCurrentVideoUrl(videoUrl);
        } catch (error) {
            console.error("Video Gen failed", error);
            showNotification("Failed to generate video.");
        } finally {
            setIsVidGenerating(false);
        }
    };

    // --- Upload Analysis ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video/');
            setMediaType(isVideo ? 'video' : 'image');
            setMimeType(file.type);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAnalyzeMedia(reader.result as string);
                setAnalysisResult(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const runUploadAnalysis = async (promptTemplate: string) => {
        if (!analyzeMedia || isAnalyzing) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const base64Data = analyzeMedia.split(',')[1];
            const jsonPrompt = `${promptTemplate} Provide JSON array: [{"title": "", "description": "", "severity": "High"|"Medium"|"Low"|"Info", "mitigation": ""}].`;
            const response = await runRawPrompt(jsonPrompt, {
                temperature: 0.4, responseMimeType: 'application/json', model: 'gemini-3-pro-preview'
            }, base64Data, mimeType);
            setAnalysisResult(response);
        } catch (error) {
            console.error("Analysis failed", error);
            setAnalysisResult("Failed to analyze media.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 text-zinc-900 overflow-hidden relative">
            {notification && (
                <div className="absolute top-20 right-8 z-50 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in">
                    <Check size={16} className="text-green-400" /> <span className="text-sm">{notification}</span>
                </div>
            )}

            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-200 flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                        <Wand2 className="text-[#0f5c82]" /> Intelligence & Imagine Studio
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Unified Generative AI & Vision Analysis Platform</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-zinc-100 p-1 rounded-lg border border-zinc-200 flex gap-1">
                        <button onClick={() => { setMode('CREATE_IMAGE'); stopCamera(); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'CREATE_IMAGE' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500'}`}>
                            <ImageIcon size={16} /> Gen Image
                        </button>
                        <button onClick={() => { setMode('CREATE_VIDEO'); stopCamera(); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'CREATE_VIDEO' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500'}`}>
                            <Video size={16} /> Gen Video
                        </button>
                        <button onClick={() => { setMode('LIVE_FEED'); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'LIVE_FEED' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500'}`}>
                            <ScanLine size={16} /> Live Vision
                        </button>
                        <button onClick={() => { setMode('INSPECT'); stopCamera(); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'INSPECT' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500'}`}>
                            <Upload size={16} /> Upload & Analyze
                        </button>
                    </div>
                </div>
            </div>

            {/* LIVE VISION MODE */}
            {mode === 'LIVE_FEED' && (
                <div className="flex h-full overflow-hidden">
                    {/* Left: Video Feed */}
                    <div className="flex-1 bg-black relative flex flex-col">
                        <div className="absolute top-4 left-4 z-30 flex gap-2 pointer-events-none">
                            <div className="bg-black/60 backdrop-blur border border-zinc-700 rounded-lg p-1 flex pointer-events-auto">
                                {(['SAFETY', 'QUALITY', 'PROGRESS'] as AnalysisMode[]).map(m => (
                                    <button key={m} onClick={() => { setVisionMode(m); setObservations([]); }} className={`px-3 py-1 rounded text-xs font-bold ${visionMode === m ? 'bg-[#0f5c82] text-white' : 'text-zinc-400 hover:text-white'}`}>{m}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                            {!isCameraActive && !snapshot ? (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800"><Video size={40} className="text-zinc-600" /></div>
                                    <button onClick={startCamera} className="bg-[#0f5c82] hover:bg-[#0c4a6e] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all hover:scale-105"><Play size={18} /> Start Camera</button>
                                    <button onClick={() => setMode('INSPECT')} className="mt-6 text-zinc-500 hover:text-[#0f5c82] text-sm font-medium flex items-center gap-2 mx-auto transition-colors">
                                        Or upload an image for analysis <ArrowRight size={14} />
                                    </button>
                                    {visionError && <p className="text-red-400 text-sm mt-4">{visionError}</p>}
                                </div>
                            ) : (
                                <>
                                    {snapshot ? (
                                        <img src={snapshot} className="w-full h-full object-contain opacity-100" alt="Snapshot" />
                                    ) : (
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Overlay UI */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {!snapshot && (
                                            <>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-white/20 rounded-3xl">
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#0f5c82]" />
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#0f5c82]" />
                                                </div>
                                                {isVisionProcessing && <div className="absolute top-0 left-0 w-full h-1 bg-[#0f5c82]/50 shadow-[0_0_20px_#0f5c82] animate-[scan_2s_linear_infinite]" />}
                                            </>
                                        )}

                                        <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur px-4 py-2 rounded-full flex items-center gap-3 border border-zinc-700 pointer-events-auto">
                                            <div className={`w-2.5 h-2.5 rounded-full ${isVisionProcessing ? 'bg-yellow-500 animate-pulse' : (snapshot ? 'bg-orange-500' : 'bg-green-500')}`} />
                                            <span className="text-xs font-mono tracking-wider text-white uppercase">{isVisionProcessing ? 'ANALYZING...' : (snapshot ? 'SNAPSHOT PAUSED' : 'MONITORING')}</span>
                                            {!snapshot ? (
                                                <button onClick={takeSnapshot} className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-1 border border-white/10" title="Freeze Frame">
                                                    <Camera size={14} /> Freeze
                                                </button>
                                            ) : (
                                                <button onClick={() => { setSnapshot(null); setDeepInspectResult(null); startAnalysisLoop(); }} className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs font-bold flex items-center gap-1" title="Resume Live">
                                                    <Play size={14} /> Resume
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Bottom Agent Bar */}
                        <div className="h-16 bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-4 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shrink-0"><Target size={16} className="text-white" /></div>
                            <form onSubmit={handleAgentQuery} className="flex-1 relative">
                                <input type="text" value={agentQuery} onChange={(e) => setAgentQuery(e.target.value)} placeholder={isCameraActive ? "Ask the agent about what it sees..." : "Start camera to interact..."} disabled={!isCameraActive} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-10 py-2 text-xs focus:ring-1 focus:ring-[#0f5c82] focus:border-transparent outline-none text-white placeholder-zinc-500 transition-all" />
                                <button type="submit" disabled={!agentQuery.trim() || isAgentThinking} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white disabled:opacity-30"><Send size={14} /></button>
                            </form>
                            {isCameraActive && <button onClick={stopCamera} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><StopCircle size={18} /></button>}
                        </div>
                    </div>

                    {/* Right: Observation Feed / Deep Inspection */}
                    <div className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-sm"><Activity size={16} className="text-[#0f5c82]" /> Live Observations</h3>
                            {snapshot && !deepInspectResult && (
                                <button
                                    onClick={handleSnapshotInspection}
                                    disabled={isInspecting}
                                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-500 flex items-center gap-1 transition-colors disabled:opacity-50 shadow-lg shadow-purple-900/50 animate-pulse"
                                >
                                    {isInspecting ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={14} />}
                                    Deep Inspect
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {/* Deep Inspection Result */}
                            {deepInspectResult && (
                                <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg mb-4 animate-in fade-in slide-in-from-right-4 shadow-lg">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-purple-300 uppercase tracking-wide pb-2 border-b border-purple-500/30">
                                        <ScanEye size={14} /> Gemini Pro Analysis
                                    </div>
                                    <div className="text-xs text-zinc-300 leading-relaxed markdown-body whitespace-pre-wrap">
                                        {deepInspectResult}
                                    </div>
                                </div>
                            )}

                            {/* Chat Response */}
                            {agentResponse && (
                                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-right-4">
                                    <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-blue-300 uppercase tracking-wide"><MessageSquare size={10} /> Agent Insight</div>
                                    <p className="text-xs text-zinc-300 leading-relaxed">{agentResponse}</p>
                                </div>
                            )}

                            {/* Live Observations */}
                            {!snapshot && observations.map((obs) => (
                                <div key={obs.id} className={`p-3 rounded-lg border relative animate-in slide-in-from-right-4 fade-in duration-500 ${obs.severity === 'CRITICAL' ? 'bg-red-950/30 border-red-500/50' : obs.severity === 'WARNING' ? 'bg-orange-950/30 border-orange-500/50' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${obs.severity === 'CRITICAL' ? 'bg-red-500 text-white' : obs.severity === 'WARNING' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>{obs.severity}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono">{obs.timestamp}</span>
                                    </div>
                                    <h4 className="font-bold text-zinc-200 text-xs mb-1">{obs.title}</h4>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">{obs.description}</p>
                                </div>
                            ))}

                            {observations.length === 0 && !agentResponse && !deepInspectResult && (
                                <div className="text-center text-zinc-600 mt-10 text-xs flex flex-col items-center">
                                    <ScanLine size={32} className="mb-2 opacity-20" />
                                    Waiting for visual data...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* IMAGE CREATION */}
            {mode === 'CREATE_IMAGE' && (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl mx-auto w-full flex flex-col">
                    <div className="bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm mb-6">
                        <form onSubmit={handleGenerateImage} className="flex flex-col md:flex-row items-center gap-2 p-2">
                            <div className="relative flex-1 w-full">
                                <Wand2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input type="text" value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} placeholder="Describe the construction image..." className="w-full bg-transparent border-none text-zinc-900 pl-12 pr-4 py-3 focus:ring-0" />
                            </div>
                            <div className="relative h-full">
                                <Ratio size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                <select value={imgAspectRatio} onChange={(e) => setImgAspectRatio(e.target.value)} className="w-full h-full bg-zinc-50 border-none rounded-lg text-sm text-zinc-700 py-3 pl-10 pr-10 focus:ring-0 cursor-pointer appearance-none font-medium">
                                    {['1:1', '3:4', '4:3', '9:16', '16:9'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={isImgGenerating} className="bg-[#0f5c82] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#0c4a6e] disabled:opacity-50 transition-colors flex items-center gap-2 h-full">
                                {isImgGenerating ? <Loader2 className="animate-spin" /> : 'Generate'}
                            </button>
                        </form>
                    </div>
                    <div className="flex-1 flex gap-8 min-h-[400px]">
                        <div className="flex-1 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                            {currentImage ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-black/5">
                                    <img src={currentImage.url} alt="Generated" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button onClick={() => window.open(currentImage.url, '_blank')} className="p-2 bg-white rounded-lg shadow-sm hover:bg-zinc-50 border border-zinc-200"><Download size={18} /></button>
                                        <button className="p-2 bg-white rounded-lg shadow-sm hover:bg-zinc-50 border border-zinc-200"><Share2 size={18} /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-zinc-400 flex flex-col items-center">
                                    {isImgGenerating ? <Loader2 size={48} className="animate-spin text-[#0f5c82]" /> : <ImageIcon size={48} />}
                                    <p className="mt-4">{isImgGenerating ? 'Generating with Gemini 3 Pro...' : 'Enter prompt to generate'}</p>
                                    <button
                                        onClick={() => setMode('INSPECT')}
                                        className="mt-4 bg-zinc-100 text-zinc-600 px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors text-sm flex items-center gap-2 border border-zinc-200"
                                    >
                                        <Upload size={14} /> Or Analyze Existing Image
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* History Sidebar */}
                        <div className="w-80 bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-zinc-100 font-bold text-zinc-700 flex items-center gap-2">
                                <Briefcase size={16} /> History
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {history.map((h, i) => (
                                    <div key={h.id || i} onClick={() => setCurrentImage(h)} className={`p-2 rounded-lg border cursor-pointer hover:bg-zinc-50 flex gap-3 ${currentImage?.id === h.id ? 'border-[#0f5c82] bg-blue-50/50' : 'border-zinc-100'}`}>
                                        <img src={h.url} className="w-16 h-16 object-cover rounded-md bg-zinc-100 shrink-0" />
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <p className="text-xs text-zinc-900 font-medium truncate">{h.prompt}</p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-zinc-400">{new Date(h.createdAt || Date.now()).toLocaleDateString()}</span>
                                                {h.id && <button onClick={(e) => handleDeleteHistory(h.id!, e)} className="text-zinc-300 hover:text-red-500"><X size={12} /></button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && <div className="p-4 text-center text-xs text-zinc-400">No history yet</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIDEO CREATION (Veo) */}
            {mode === 'CREATE_VIDEO' && (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col">
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 rounded-2xl text-white shadow-xl mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Video size={120} />
                        </div>
                        <div className="flex items-center gap-3 mb-4 relative z-10"><div className="p-2 bg-white/10 rounded-lg"><Video size={24} /></div><h2 className="text-xl font-bold">Veo Video Studio</h2></div>

                        <div className="relative z-10 max-w-2xl">
                            <div className="mb-6 p-4 bg-purple-800/50 border border-purple-400/30 rounded-xl backdrop-blur-sm">
                                <h3 className="font-bold flex items-center gap-2 mb-2"><Sparkles size={16} className="text-yellow-400" /> Coming Soon to Cortex</h3>
                                <p className="text-sm text-purple-100 leading-relaxed">
                                    Generative Video (Veo) integration is currently in private beta. This feature will allow you to generate site flythroughs and safety simulations from text prompts.
                                </p>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); showNotification("Added to Veo Beta Waitlist!"); }} className="space-y-4 opacity-75 pointer-events-none">
                                <textarea disabled value={vidPrompt} onChange={(e) => setVidPrompt(e.target.value)} placeholder="Describe the video scene..." className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 outline-none h-24 resize-none" />
                                <div className="flex gap-4">
                                    <button type="button" disabled className={`flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border ${vidAspectRatio === '16:9' ? 'border-white' : 'border-white/10'}`}><span>16:9</span></button>
                                    <button type="button" disabled className={`flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border ${vidAspectRatio === '9:16' ? 'border-white' : 'border-white/10'}`}><span>9:16</span></button>
                                </div>
                            </form>

                            <button onClick={() => showNotification("You have been added to the priority waitlist.")} className="mt-6 px-8 py-3 bg-white text-purple-900 font-bold rounded-lg hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2">
                                <Zap size={18} className="fill-purple-900" /> Join Waitlist
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INSPECT & ANALYZE */}
            {mode === 'INSPECT' && (
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 bg-zinc-100 p-6 flex flex-col justify-center items-center border-r border-zinc-200 relative">
                        {analyzeMedia ? (
                            mediaType === 'video' ? <video src={analyzeMedia} controls className="max-w-full max-h-full rounded-lg shadow-lg" /> : <img src={analyzeMedia} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                        ) : (
                            <div className="text-center text-zinc-400"><Upload size={48} className="mx-auto mb-4 opacity-50" /><p className="mb-4">Upload Media for Analysis</p><button onClick={() => fileInputRef.current?.click()} className="bg-[#0f5c82] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#0c4a6e] transition-colors">Select File</button></div>
                        )}
                        {analyzeMedia && <button onClick={() => { setAnalyzeMedia(null); setAnalysisResult(null); }} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow text-zinc-500 hover:text-red-500"><X size={20} /></button>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                    </div>
                    <div className="w-96 bg-white p-6 flex flex-col shadow-xl z-10">
                        <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2"><ScanEye className="text-[#0f5c82]" /> Analysis Tools</h3>

                        <div className="grid grid-cols-1 gap-3 mb-6">
                            <button onClick={() => runUploadAnalysis('Analyze this construction site image for potential safety hazards and OSHA violations.')} disabled={!analyzeMedia} className="p-4 border rounded-xl hover:bg-zinc-50 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors"><ShieldAlert size={20} /></div>
                                    <span className="font-bold text-zinc-900">Safety Hazards</span>
                                </div>
                                <p className="text-xs text-zinc-500 pl-[52px]">Identify risks, PPE violations, and unsafe conditions.</p>
                            </button>

                            <button onClick={() => runUploadAnalysis('Analyze this image for construction quality defects, workmanship issues, or damage.')} disabled={!analyzeMedia} className="p-4 border rounded-xl hover:bg-zinc-50 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors"><Search size={20} /></div>
                                    <span className="font-bold text-zinc-900">Quality Defects</span>
                                </div>
                                <p className="text-xs text-zinc-500 pl-[52px]">Detect cracks, misalignment, and finish issues.</p>
                            </button>

                            <button onClick={() => runUploadAnalysis('Analyze the construction progress shown in this image. Estimate completion percentage of visible tasks.')} disabled={!analyzeMedia} className="p-4 border rounded-xl hover:bg-zinc-50 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><Layers size={20} /></div>
                                    <span className="font-bold text-zinc-900">Progress Report</span>
                                </div>
                                <p className="text-xs text-zinc-500 pl-[52px]">Track milestones and completed work items.</p>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                            {isAnalyzing ? <div className="flex flex-col items-center justify-center h-full text-zinc-500"><Loader2 size={24} className="animate-spin mb-2" /><p className="text-xs">Analyzing with Gemini 3 Pro...</p></div> : (
                                analysisResult ? (
                                    <div className="space-y-3">
                                        {(parseAIJSON(analysisResult || '[]') as any[]).map((item, i) => (
                                            <div key={i} className="bg-white border border-zinc-200 p-3 rounded-lg">
                                                <div className="flex justify-between mb-1"><span className="font-bold text-xs text-zinc-900">{item.title}</span><span className={`text-[10px] px-1.5 rounded ${item.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{item.severity}</span></div>
                                                <p className="text-[10px] text-zinc-600 mb-2">{item.description}</p>
                                                {item.mitigation && <div className="text-[10px] text-green-600 bg-green-50 p-1 rounded">Fix: {item.mitigation}</div>}
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-zinc-400 text-xs text-center mt-10">Select a tool to analyze the uploaded image.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImagineView;
