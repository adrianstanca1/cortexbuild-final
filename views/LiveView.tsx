import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, X, Volume2, Zap, Camera, Settings2, MessageSquare, Aperture, AlertTriangle, ShieldAlert, Eye, Shield, Play, ChevronRight, Activity, Radio, ScanLine } from 'lucide-react';
import { getLiveClient, runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '@/utils/audio';
import { LiveServerMessage, Modality } from '@google/genai';
import { Page, SafetyHazard, Project } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface LiveViewProps {
    setPage: (page: Page) => void;
}

const LiveView: React.FC<LiveViewProps> = ({ setPage }) => {
    const { addToast } = useToast();
    const [sessionStarted, setSessionStarted] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [volume, setVolume] = useState(0);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [currentUserText, setCurrentUserText] = useState("");
    const [currentModelText, setCurrentModelText] = useState("");

    // Safety Scanner State
    const [safetyScanActive, setSafetyScanActive] = useState(false);
    const [detectedHazards, setDetectedHazards] = useState<SafetyHazard[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const sessionRef = useRef<Promise<any> | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const safetyIntervalRef = useRef<number | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            cleanup();
        };
    }, []);

    const startSession = async () => {
        try {
            setSessionStarted(true);
            setIsConnecting(true);

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });

            inputContextRef.current = inputCtx;
            audioContextRef.current = outputCtx;
            nextStartTimeRef.current = 0;

            // Audio Stream - Explicitly requested here after user gesture
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = audioStream;

            const liveClient = getLiveClient();

            const sessionPromise = liveClient.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: "You are an expert construction site assistant. You can see what the user shows you via video. Analyze safety hazards, identify tools, check progress, and answer questions concisely. Be professional and safety-conscious.",
                },
                callbacks: {
                    onopen: () => {
                        if (!isMounted.current) return;
                        setIsActive(true);
                        setIsConnecting(false);

                        // Audio Input Processing
                        const source = inputCtx.createMediaStreamSource(audioStream);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            // Volume Meter
                            let sum = 0;
                            for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                            setVolume(Math.min(100, (sum / inputData.length) * 500));

                            const pcmBlob = createPcmBlob(inputData);
                            // Check if session is still active/valid before sending
                            if (sessionRef.current) {
                                sessionPromise.then((session) => {
                                    try {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    } catch (e) {
                                        // Session might be closed
                                    }
                                });
                            }
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtx.destination);

                        sourceNodeRef.current = source;
                        processorRef.current = scriptProcessor;
                        sessionRef.current = sessionPromise;
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Handle Audio Output
                        const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputCtx) {
                            const audioBytes = base64ToUint8Array(base64Audio);
                            const audioBuffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            const currentTime = outputCtx.currentTime;
                            const startTime = Math.max(nextStartTimeRef.current, currentTime);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + audioBuffer.duration;
                            activeSourcesRef.current.add(source);
                            source.onended = () => activeSourcesRef.current.delete(source);
                        }
                        // Handle Transcription
                        const inputTranscript = msg.serverContent?.inputTranscription?.text;
                        if (inputTranscript) setCurrentUserText(prev => prev + inputTranscript);
                        const outputTranscript = msg.serverContent?.outputTranscription?.text;
                        if (outputTranscript) setCurrentModelText(prev => prev + outputTranscript);
                        if (msg.serverContent?.turnComplete) {
                            setCurrentUserText("");
                            setCurrentModelText("");
                        }
                        if (msg.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { /* ignore */ } });
                            activeSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setCurrentModelText("");
                        }
                    },
                    onclose: () => { if (isMounted.current) cleanup(); },
                    onerror: (e) => {
                        console.error("Live Error", e);
                        if (isMounted.current) cleanup();
                    }
                }
            });
        } catch (err) {
            console.error("Failed to start session", err);
            addToast("Connection failed. Please ensure microphone permissions are granted.", 'error');
            setIsConnecting(false);
            setSessionStarted(false);
            cleanup();
        }
    };

    // Video Handling
    const toggleCamera = async () => {
        if (isCameraOn) {
            // Stop Camera
            if (videoStreamRef.current) {
                videoStreamRef.current.getTracks().forEach(track => track.stop());
                videoStreamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            if (frameIntervalRef.current) { window.clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
            if (safetyIntervalRef.current) { window.clearInterval(safetyIntervalRef.current); safetyIntervalRef.current = null; }
            setIsCameraOn(false);
            setSafetyScanActive(false);
        } else {
            // Start Camera
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" }
                });
                videoStreamRef.current = videoStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                    await videoRef.current.play();
                }
                setIsCameraOn(true);
                // Start Frame Transmission for Live Context (1 FPS)
                frameIntervalRef.current = window.setInterval(() => sendVideoFrame(), 1000);
            } catch (e) {
                console.error("Failed to access camera", e);
                addToast("Could not access camera. Please check permissions.", 'warning');
            }
        }
    };

    const sendVideoFrame = async () => {
        if (!canvasRef.current || !videoRef.current || !sessionRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
        sessionRef.current.then((session: any) => {
            try { session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Data } }); } catch (e) { console.error("Error sending frame", e); }
        });
    };

    // Safety Scanning Logic (Separate from Live Audio Session)
    const toggleSafetyScan = () => {
        if (!isCameraOn) { addToast("Enable camera first.", 'info'); return; }
        if (safetyScanActive) {
            if (safetyIntervalRef.current) window.clearInterval(safetyIntervalRef.current);
            setSafetyScanActive(false);
            setDetectedHazards([]);
        } else {
            setSafetyScanActive(true);
            runSafetyCheck();
            safetyIntervalRef.current = window.setInterval(runSafetyCheck, 5000); // Check every 5s
        }
    };

    const runSafetyCheck = async () => {
        if (!canvasRef.current || !videoRef.current || isScanning) return;
        setIsScanning(true);
        try {
            // Capture high quality frame
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];

            const prompt = `Analyze this image for construction safety hazards.Return a JSON array of objects with keys: "type"(short name), "severity"(High / Medium / Low), "recommendation"(short action), "box_2d"(array of 4 integers[ymin, xmin, ymax, xmax] 0 - 1000 scale).If no hazards, return empty array.Limit to 3 items.`;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-2.5-flash',
                responseMimeType: 'application/json',
                temperature: 0.4
            }, base64Data);

            const hazards = parseAIJSON(result);
            if (Array.isArray(hazards)) {
                setDetectedHazards(hazards.map((h: any) => ({ ...h, id: Math.random().toString(), timestamp: Date.now() })));
            }
        } catch (e) {
            console.error("Safety check failed", e);
        } finally {
            setIsScanning(false);
        }
    };

    const cleanup = () => {
        if (!isMounted.current) return; // Prevent double cleanup if already unmounted (optional, but good practice)

        setIsActive(false);
        setIsConnecting(false);
        setVolume(0);

        if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
        if (safetyIntervalRef.current) { clearInterval(safetyIntervalRef.current); safetyIntervalRef.current = null; }

        // Stop all tracks in streams
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(t => t.stop());
            videoStreamRef.current = null;
        }

        // Disconnect nodes
        sourceNodeRef.current?.disconnect();
        processorRef.current?.disconnect();
        sourceNodeRef.current = null;
        processorRef.current = null;

        // Close contexts
        if (inputContextRef.current && inputContextRef.current.state !== 'closed') inputContextRef.current.close();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        inputContextRef.current = null;
        audioContextRef.current = null;

        activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { /* ignore */ } });
        activeSourcesRef.current.clear();
        sessionRef.current = null;
    };

    // calculate isMounted is handled in the top useEffect now, removing this redundant one
    // useEffect(() => {
    //     // Clean up on unmount
    //     return () => cleanup();
    // }, []);

    const handleEndCall = () => {
        cleanup();
        setPage(Page.CHAT);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
            {/* Background Video Feed */}
            <div className="absolute inset-0 z-0">
                {isCameraOn ? (
                    <>
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                        {/* AR HUD Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* HUD Grid / Reticle */}
                            <div className="absolute inset-0 opacity-10"
                                style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                            </div>

                            {/* Bounding Boxes for Hazards */}
                            {detectedHazards.map((hazard, i) => {
                                if (!hazard.box_2d) return null;
                                const [ymin, xmin, ymax, xmax] = hazard.box_2d;

                                return (
                                    <div
                                        key={hazard.id || i}
                                        className={`absolute border - 2 transition - all duration - 300 ease - out ${hazard.severity === 'High' ? 'border-red-500 bg-red-500/10' :
                                            hazard.severity === 'Medium' ? 'border-orange-500 bg-orange-500/10' :
                                                'border-blue-500 bg-blue-500/10'
                                            } `}
                                        style={{
                                            top: `${ymin / 10}% `,
                                            left: `${xmin / 10}% `,
                                            height: `${(ymax - ymin) / 10}% `,
                                            width: `${(xmax - xmin) / 10}% `
                                        }}
                                    >
                                        <div className={`absolute - top - 6 left - 0 text - [10px] font - bold px - 2 py - 1 rounded text - white flex items - center gap - 1 shadow - sm backdrop - blur - md ${hazard.severity === 'High' ? 'bg-red-500' :
                                            hazard.severity === 'Medium' ? 'bg-orange-500' :
                                                'bg-blue-500'
                                            } `}>
                                            <AlertTriangle size={10} fill="currentColor" />
                                            {hazard.type}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Central Reticle (Only if no hazards or scanning) */}
                            {!isScanning && detectedHazards.length === 0 && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 rounded-lg opacity-60 flex items-center justify-center">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                                </div>
                            )}

                            {/* Scanning Line */}
                            {isScanning && (
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-[scan_3s_linear_infinite]" />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#0c4a6e] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <div className="w-96 h-96 bg-[#0f5c82] rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* UI Layer */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

                {/* Top Bar Status Indicators */}
                <div className="absolute top-6 left-6 flex flex-col gap-3 z-20 pointer-events-auto">
                    {/* Voice Status */}
                    <div className={`flex items - center gap - 3 px - 4 py - 2.5 rounded - full backdrop - blur - md border shadow - lg transition - all ${isActive ? 'bg-green-900/40 border-green-500/30 text-green-400' : 'bg-zinc-900/60 border-zinc-700 text-zinc-500'} `}>
                        <div className={`w - 2.5 h - 2.5 rounded - full ${isActive ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-500'} `} />
                        <span className="text-xs font-bold tracking-widest uppercase">
                            {isConnecting ? "CONNECTING..." : isActive ? "VOICE ACTIVE" : "VOICE READY"}
                        </span>
                    </div>

                    {/* Vision Status */}
                    {isCameraOn && (
                        <div className={`flex items - center gap - 3 px - 4 py - 2.5 rounded - full backdrop - blur - md border shadow - lg transition - all animate -in slide -in -from - left - 2 ${safetyScanActive ? 'bg-blue-900/40 border-blue-500/30 text-blue-400' : 'bg-zinc-900/60 border-zinc-700 text-zinc-400'} `}>
                            <div className={`w - 2.5 h - 2.5 rounded - full ${safetyScanActive ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-500'} `} />
                            <span className="text-xs font-bold tracking-widest uppercase">
                                {safetyScanActive ? "AI SCANNER ACTIVE" : "VISION FEED"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button onClick={handleEndCall} className="absolute top-6 right-6 pointer-events-auto w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors hover:scale-105 active:scale-95 shadow-lg z-50">
                    <X size={24} />
                </button>

                {/* Hazards Feed (Right Side) */}
                {safetyScanActive && (
                    <div className="absolute top-24 right-6 bottom-32 w-full max-w-[300px] flex flex-col pointer-events-none z-20">
                        <div className="self-end bg-black/60 text-white px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-white/10 mb-3 backdrop-blur-sm flex items-center gap-2 shadow-lg">
                            <ShieldAlert size={12} className="text-blue-400" /> Hazard Detection
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar pb-4 mask-image-linear-gradient-to-b">
                            {detectedHazards.map((hazard, i) => (
                                <div
                                    key={hazard.id || i}
                                    className={`p-4 rounded-xl backdrop-blur-xl border shadow-xl animate-in slide-in-from-right-8 duration-500 relative overflow-hidden ${hazard.severity === 'High' ? 'bg-red-950/80 border-red-500/50 text-white' :
                                        hazard.severity === 'Medium' ? 'bg-orange-950/80 border-orange-500/50 text-white' :
                                            'bg-blue-950/80 border-blue-500/50 text-white'
                                        }`}
                                >
                                    {/* Severity Stripe */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${hazard.severity === 'High' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                        hazard.severity === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'
                                        }`} />

                                    <div className="flex items-center justify-between mb-2 pl-2">
                                        <span className="font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
                                            {hazard.severity === 'High' && <AlertTriangle size={14} className="text-red-400" />}
                                            {hazard.type}
                                        </span>
                                        <span className="text-[9px] font-mono opacity-60">{new Date(hazard.timestamp as number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] opacity-90 leading-relaxed pl-2 text-zinc-200 font-medium">{hazard.recommendation}</p>
                                </div>
                            ))}
                            {detectedHazards.length === 0 && !isScanning && (
                                <div className="text-center p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-zinc-500 text-xs font-mono">
                                    Area secure. No hazards detected.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Start Session Overlay */}
                {!sessionStarted ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-md z-50 p-4">
                        <div className="bg-zinc-900/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#0f5c82] to-[#0284c7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/50">
                                <Zap size={40} className="text-white" fill="white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Live Field Assistant</h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                Connect to Gemini 2.0 for real-time multimodal analysis. Requires microphone & camera access.
                            </p>
                            <button
                                onClick={startSession}
                                className="w-full bg-white text-zinc-900 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-xl active:scale-95"
                            >
                                <Play size={20} fill="currentColor" /> Start Session
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Active Session UI */
                    <>
                        {/* Center Visualizer (Audio Mode Only) */}
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative">
                                    <div className="w-64 h-64 rounded-full border border-white/10 flex items-center justify-center relative backdrop-blur-sm bg-white/5 shadow-2xl animate-pulse">
                                        {isConnecting ? (
                                            <div className="w-16 h-16 border-4 border-[#0f5c82] border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <div className="w-32 h-32 bg-[#0f5c82] rounded-full transition-all duration-75 shadow-[0_0_60px_rgba(15,92,130,0.6)]" style={{ transform: `scale(${1 + (volume / 200)})` }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bottom Controls */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center w-full max-w-3xl z-50 px-4 pb-safe">
                            {/* Subtitles */}
                            {(currentUserText || currentModelText) && (
                                <div className="w-full bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-left shadow-2xl transition-all duration-300 mb-6">
                                    {currentUserText && <div className="flex gap-3 mb-2 text-white/60 text-sm"><span className="font-bold uppercase text-[10px] tracking-widest text-zinc-400 mt-1">You</span><p>{currentUserText}</p></div>}
                                    {currentModelText && <div className="flex gap-3 text-white text-lg font-medium leading-relaxed"><span className="font-bold uppercase text-[10px] tracking-widest text-[#38bdf8] mt-1.5">Gemini</span><p>{currentModelText}</p></div>}
                                </div>
                            )}

                            <div className="flex items-center gap-3 sm:gap-6 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-2xl ring-1 ring-white/5 overflow-x-auto max-w-full">
                                <button
                                    onClick={() => setIsActive(!isActive)}
                                    className={`p-5 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 ${!isActive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    title={isActive ? "Mute Microphone" : "Unmute Microphone"}
                                >
                                    {isActive ? <Mic size={28} /> : <MicOff size={28} />}
                                </button>

                                <button
                                    onClick={toggleCamera}
                                    className={`p-5 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 ${isCameraOn ? 'bg-white text-black shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                                >
                                    {isCameraOn ? <Video size={28} /> : <VideoOff size={28} />}
                                </button>

                                {/* Safety Scanner Toggle */}
                                {isCameraOn && (
                                    <>
                                        <div className="w-px h-12 bg-white/10 mx-2 hidden sm:block"></div>
                                        <button
                                            onClick={toggleSafetyScan}
                                            className={`flex items-center gap-3 px-6 py-5 rounded-2xl transition-all duration-200 border hover:scale-105 active:scale-95 flex-shrink-0 ${safetyScanActive
                                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            <ScanLine size={24} />
                                            <span className="text-sm font-bold uppercase tracking-wide hidden sm:inline">
                                                {safetyScanActive ? "Scanner On" : "Safety Scan"}
                                            </span>
                                        </button>
                                    </>
                                )}

                                <div className="w-px h-12 bg-white/10 mx-2 hidden sm:block"></div>

                                <button
                                    onClick={handleEndCall}
                                    className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-all group border border-red-500 active:scale-95 flex-shrink-0"
                                    title="End Session"
                                >
                                    <PhoneOff size={28} className="group-hover:rotate-12 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveView;
