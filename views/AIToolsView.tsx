
import React, { useState } from 'react';
import {
  FileSearch, FileText, Box, AlertTriangle, FileDigit, Search,
  MessageSquare, Calculator, Calendar, ShieldAlert, FileBarChart, Activity,
  Lightbulb, Upload, BrainCircuit, X, Loader2, CheckCircle2, AlertCircle,
  DollarSign, TrendingUp, Users, Clock, Camera, Eye
} from 'lucide-react';
import { Page } from '@/types';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import { yoloService, DetectionResult } from '@/services/yoloService';

interface AIToolsViewProps {
  setPage: (page: Page) => void;
}

interface AnalysisResult {
  title: string;
  type: string;
  data: any;
  timestamp: string;
  summary?: string;
}

const AIToolsView: React.FC<AIToolsViewProps> = ({ setPage }) => {
  const { addToast } = useToast();
  const { activeProject } = useProjects();
  const { systemSettings } = useTenant();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);

  // YOLO State
  const [yoloModelLoaded, setYoloModelLoaded] = useState(false);
  const [yoloLoading, setYoloLoading] = useState(false);
  const [yoloImage, setYoloImage] = useState<string | null>(null);
  const [yoloDetections, setYoloDetections] = useState<any[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string | null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    addToast(`Uploaded ${file.name} for ${type || 'analysis'}`, 'success');

    // Auto-trigger analysis based on type if needed
    if (type === 'risk') generateRiskAssessment();
    else if (type === 'cost') generateCostEstimate();
  };

  const generateCostEstimate = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const projectContext = activeProject
        ? `Project: ${activeProject.name}. Budget: £${activeProject.budget}. Location: ${activeProject.location}. Status: ${activeProject.status}.`
        : 'a 5,000 sqft residential build in a high-cost area';

      const prompt = `Generate a detailed cost estimate for ${projectContext}. Include Site Prep, Foundation, Framing, MEP, Finishes, and 15% Contingency. Return JSON with 'summary', 'breakdown' (array of {category, cost, note}), and 'total'.`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'ML Cost Estimation',
        type: 'cost',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Cost estimation failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  const generateScheduleOptimization = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const projectContext = activeProject
        ? `Project: ${activeProject.name}. Start Date: ${activeProject.startDate}. End Date: ${activeProject.endDate}.`
        : 'a commercial build';

      const prompt = `Optimize a project schedule for ${projectContext}. Use genetic algorithm principles to minimize slack. Return JSON with 'summary', 'phases' (array of {name, duration, weight}), and 'efficiencyScore' (0-100).`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'Schedule Optimizer',
        type: 'schedule',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Optimization failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  const generateRiskAssessment = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const projectContext = activeProject
        ? `Project: ${activeProject.name} (${activeProject.code}). Health: ${activeProject.health}.`
        : 'a high-rise construction project';

      const prompt = `Perform a comprehensive risk assessment for ${projectContext}. Include weather, supply chain, labor, and safety risks. Return JSON with 'summary', 'riskScore' (0-100), 'categories' (array of {name, score, mitigation}), and 'confidence'.`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'Risk Assessment Engine',
        type: 'risk',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Risk assessment failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  const generateBidPackage = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const prompt = `Generate a professional bid package shell for a civil engineering project. Include Scope of Work, Conditions, Pricing Schedule, and Qualification criteria. Return JSON with 'summary', 'sections' (array of {title, content}), and 'expiryDate'.`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'AI Bid Generator',
        type: 'bid',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Bid generation failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  const findGrants = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const prompt = `Identify current government grants and subsidies for sustainable construction (Solar, Insulation, Net Zero). Return JSON with 'summary', 'grants' (array of {name, amount, criteria, deadline}), and 'source'.`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'Grant Finder',
        type: 'grant',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Grant search failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  const analyzeSentiment = async () => {
    setAnalyzing(true);
    setResults(null);
    try {
      const prompt = `Analyze team communication sentiment based on simulated construction logs (pressure vs productivity). Return JSON with 'summary', 'moraleScore' (0-100), 'trends' (array of {metric, value}), and 'actionItems' (array).`;
      const response = await runRawPrompt(prompt, { model: 'gemini-3-pro-preview', responseMimeType: 'application/json' });
      const parsed = parseAIJSON(response);
      setResults({
        title: 'Sentiment Intelligence',
        type: 'sentiment',
        data: parsed,
        summary: parsed.summary,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (e) { addToast('Sentiment analysis failed', 'error'); }
    finally { setAnalyzing(false); }
  };

  // YOLO-specific functions
  const loadYOLOModel = async () => {
    if (yoloModelLoaded) return;
    try {
      setYoloLoading(true);
      await yoloService.loadModel();
      setYoloModelLoaded(true);
      console.log('YOLO model loaded successfully');
    } catch (error) {
      console.error('Failed to load YOLO model:', error);
      addToast('Failed to load YOLO model. Please check your internet connection.', 'error');
    } finally {
      setYoloLoading(false);
    }
  };

  const handleYOLOImageUpload = async (file: File) => {
    if (!file) return;

    await loadYOLOModel();

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      setYoloImage(imageUrl);
      setYoloDetections([]);
      setYoloLoading(true);

      try {
        // Create canvas to get ImageData
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();

        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Run YOLO detection
          const result = await yoloService.detectObjects(imageData);
          setYoloDetections(result.detections);

          // If we have annotated image, use it
          if (result.annotatedImage) {
            const annotatedCanvas = document.createElement('canvas');
            const annotatedCtx = annotatedCanvas.getContext('2d')!;
            annotatedCanvas.width = result.annotatedImage.width;
            annotatedCanvas.height = result.annotatedImage.height;
            annotatedCtx.putImageData(result.annotatedImage, 0, 0);
            setYoloImage(annotatedCanvas.toDataURL());
          }
        };

        img.src = imageUrl;
      } catch (error) {
        console.error('YOLO detection failed:', error);
        addToast('Object detection failed. Please try again.', 'error');
      } finally {
        setYoloLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      addToast('Camera access denied. Please allow camera permissions.', 'warning');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        handleYOLOImageUpload(file);
      }
    }, 'image/jpeg');

    closeCamera();
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const clearYOLOResults = () => {
    setYoloImage(null);
    setYoloDetections([]);
  };

  const tools = [
    { icon: BrainCircuit, title: 'AI Architect', desc: 'Generative project planning, budgeting, and risk analysis.', action: () => setPage(Page.PROJECT_LAUNCHPAD), id: 'architect' },
    { icon: FileSearch, title: 'Contract Analyzer', desc: 'Extract key dates, terms, liabilities from uploaded contracts', id: 'contract', modal: true },
    { icon: FileText, title: 'Invoice Parser', desc: 'Auto-detect vendor, amounts, line items, payment terms', id: 'invoice', modal: true },
    { icon: Box, title: 'Blueprint Analyzer', desc: 'Extract dimensions, material quantities, detect risk areas', id: 'blueprint', modal: true },
    { icon: AlertTriangle, title: 'Risk Assessment Engine', desc: 'Analyze project risks with confidence scoring', id: 'risk', action: () => generateRiskAssessment() },
    { icon: FileDigit, title: 'Bid Generator', desc: 'Generate professional bid packages from templates', id: 'bid', action: () => generateBidPackage() },
    { icon: Search, title: 'Grant Finder', desc: 'Search government construction grants and subsidies', id: 'grant', action: () => findGrants() },
    { icon: MessageSquare, title: 'AI Chat Assistant', desc: 'Natural language queries about projects, team, safety', action: () => setPage(Page.CHAT) },
    { icon: Calculator, title: 'Cost Estimator', desc: 'Predict project costs using historical ML models', id: 'cost', action: () => generateCostEstimate() },
    { icon: Calendar, title: 'Schedule Optimizer', desc: 'Optimize resource allocation with genetic algorithms', id: 'schedule', action: () => generateScheduleOptimization() },
    { icon: Eye, title: 'YOLO Object Detection', desc: 'Real-time object detection for safety, equipment tracking, and quality control', id: 'yolo', action: () => setActiveModal('yolo') },
    { icon: ShieldAlert, title: 'Safety Predictor', desc: 'Predict potential incidents before they occur', id: 'safety', action: () => generateSentimentAnalysis() },
    { icon: FileBarChart, title: 'Report Generator', desc: 'Auto-generate executive, safety, financial reports', id: 'report', action: () => setPage(Page.REPORTS) },
    { icon: Activity, title: 'Sentiment Analysis', desc: 'Analyze chat/email sentiment for team morale tracking', id: 'sentiment', action: () => analyzeSentiment() },
  ];

  // Helper function for Safety Predictor (which I'll map to sentiment or risk depending on context)
  const generateSentimentAnalysis = () => analyzeSentiment();

  if (!systemSettings.aiEngine) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-zinc-100 p-8 rounded-full mb-6">
          <BrainCircuit size={64} className="text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">AI Engine Offline</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          The global AI inference engine has been disabled by the administrator.
          All AI-powered features are currently unavailable.
        </p>
        <button onClick={() => setPage(Page.DASHBOARD)} className="text-[#0f5c82] hover:underline font-medium">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!systemSettings.aiEngine) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-zinc-100 p-8 rounded-full mb-6">
          <BrainCircuit size={64} className="text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">AI Engine Offline</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          The global AI inference engine has been disabled by the administrator.
          All AI-powered features are currently unavailable.
        </p>
        <button onClick={() => setPage(Page.DASHBOARD)} className="text-[#0f5c82] hover:underline font-medium">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">AI-Powered Tools & Document Intelligence</h1>
        <p className="text-zinc-500">Leverage artificial intelligence and ML to enhance productivity</p>
      </div>

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-[#e0f2fe] to-white border border-[#bae6fd] rounded-2xl p-8 mb-8 flex items-center justify-between shadow-xl relative overflow-hidden group">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-400/5 rounded-full group-hover:scale-125 transition-all duration-700" />
        <div className="flex items-start gap-6 relative z-10">
          <div className="p-4 bg-[#0f5c82] rounded-2xl text-white shadow-xl shadow-blue-200">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#0c4a6e] mb-2 tracking-tight">Intelligent Document Intelligence (IDP)</h3>
            <p className="text-zinc-600 text-sm max-w-xl font-medium leading-relaxed">
              Gemini-powered multi-modal extraction. Upload contracts, blueprints, or invoices for automated OCR, risk analysis, and structured categorization.
            </p>
          </div>
        </div>
        <label className="bg-[#0f5c82] hover:bg-[#0c4a6e] text-white px-8 py-4 rounded-2xl text-sm font-black flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/20 cursor-pointer relative z-10">
          <Upload size={20} /> Upload Strategy
          <input type="file" hidden accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'general')} />
        </label>
      </div>

      {/* Global Analyzing State */}
      {analyzing && !results && (
        <div className="bg-white border border-zinc-200 rounded-[2rem] p-12 mb-8 shadow-2xl flex flex-col items-center justify-center gap-6 animate-pulse">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-ping" />
            <BrainCircuit size={64} className="text-[#0f5c82] animate-bounce relative z-10" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-zinc-900 mb-2">Architect is Thinking...</h3>
            <p className="text-sm text-zinc-500 font-medium max-w-xs mx-auto">Gemini is processing your request with deep reasoning and context-aware logic.</p>
          </div>
        </div>
      )}

      {/* Results Display ("WOW" HUD) */}
      {(results) && (
        <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 mb-8 shadow-2xl animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BrainCircuit size={120} />
          </div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-200">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900">{results.title}</h3>
                <p className="text-sm text-zinc-500 font-medium">Analysis completed at {results.timestamp}</p>
              </div>
            </div>
            <button
              onClick={() => setResults(null)}
              className="p-3 hover:bg-zinc-100 rounded-2xl transition-all text-zinc-400 hover:text-zinc-900"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 relative z-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" /> Executive Summary
                </h4>
                <p className="text-zinc-700 leading-relaxed font-medium">
                  {results.summary}
                </p>
              </div>

              {/* Dynamic Categorized View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.data && typeof results.data === 'object' && Object.entries(results.data).map(([key, value]: [string, any]) => {
                  if (key === 'summary') return null;
                  return (
                    <div key={key} className="p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                      <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h5>
                      <div className="text-sm text-zinc-600">
                        {Array.isArray(value) ? (
                          <ul className="space-y-1">
                            {value.slice(0, 5).map((v, i) => <li key={i} className="flex items-start gap-2">• {typeof v === 'object' ? JSON.stringify(v) : v}</li>)}
                          </ul>
                        ) : typeof value === 'object' ? (
                          <div className="grid gap-1">
                            {Object.entries(value).slice(0, 4).map(([k, v]: [string, any]) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-bold text-zinc-400 text-[10px]">{k}:</span>
                                <span className="font-bold text-zinc-800 text-[10px]">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="font-bold text-zinc-900">{String(value)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {/* Specialized Metric Display for AI Engines */}
              {results.type === 'risk' && (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4">Risk Velocity</h4>
                  <div className="text-4xl font-black text-red-600 mb-2">{results.data.riskScore || 0}%</div>
                  <div className="w-full bg-red-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${results.data.riskScore}%` }} />
                  </div>
                </div>
              )}
              {results.type === 'cost' && (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-6">
                  <h4 className="text-xs font-black text-green-400 uppercase tracking-widest mb-4">Total Estimate</h4>
                  <div className="text-4xl font-black text-green-600 mb-2">{results.data.total || '$0'}</div>
                  <p className="text-[10px] font-bold text-green-700">Calculated using 2024 ML benchmarks</p>
                </div>
              )}
              {results.type === 'sentiment' && (
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Morale Index</h4>
                  <div className="text-4xl font-black text-blue-600 mb-2">{results.data.moraleScore || 0}/100</div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < (results.data.moraleScore / 20) ? 'bg-blue-600' : 'bg-blue-200'}`} />
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 rounded-3xl p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-20"><TrendingUp size={48} /></div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Raw Intelligence</h4>
                <div className="text-[10px] font-mono opacity-60 max-h-40 overflow-y-auto scrollbar-hide">
                  {JSON.stringify(results.data, null, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <div
            key={index}
            onClick={() => {
              if (tool.action) {
                tool.action();
              } else if (tool.modal) {
                setActiveModal(tool.id);
              }
            }}
            className={`bg-white border border-zinc-200 rounded-xl p-6 hover:shadow-md transition-shadow ${tool.action || tool.modal ? 'cursor-pointer group' : ''}`}
          >
            <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
              <tool.icon size={20} className="text-[#0f5c82]" />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-2">{tool.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{tool.desc}</p>
            {analyzing && (tool.id === 'cost' || tool.id === 'schedule' || tool.id === 'safety') && (
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-600">
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Document Upload Modal */}
      {activeModal && ['contract', 'invoice', 'blueprint'].includes(activeModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">
                Upload {activeModal === 'contract' ? 'Contract' : activeModal === 'invoice' ? 'Invoice' : 'Blueprint'}
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center mb-4">
              <Upload size={40} className="mx-auto text-zinc-400 mb-2" />
              <label className="cursor-pointer">
                <p className="text-sm font-medium text-zinc-900">Click to upload or drag and drop</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  hidden
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    handleFileUpload(e, activeModal);
                    setActiveModal(null);
                  }}
                />
              </label>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* YOLO Object Detection Modal */}
      {activeModal === 'yolo' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">YOLO Object Detection</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg">
                  <X size={24} />
                </button>
              </div>

              {/* Model Loading Status */}
              {!yoloModelLoaded && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Loader2 size={20} className={`text-yellow-600 ${yoloLoading ? 'animate-spin' : ''}`} />
                    <div>
                      <h3 className="font-medium text-yellow-800">
                        {yoloLoading ? 'Loading YOLO Model...' : 'YOLO Model Not Loaded'}
                      </h3>
                      <p className="text-sm text-yellow-700">
                        {yoloLoading
                          ? 'This may take a moment. The model is ~5MB.'
                          : 'Click one of the options below to load the AI model.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <label className="bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center cursor-pointer hover:bg-zinc-100 transition-colors">
                  <Upload size={32} className="mx-auto text-zinc-400 mb-3" />
                  <p className="text-sm font-medium text-zinc-900 mb-1">Upload Image</p>
                  <p className="text-xs text-zinc-500">PNG, JPG up to 10MB</p>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleYOLOImageUpload(file);
                    }}
                  />
                </label>

                <button
                  onClick={openCamera}
                  className="bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:bg-zinc-100 transition-colors"
                >
                  <Camera size={32} className="mx-auto text-zinc-400 mb-3" />
                  <p className="text-sm font-medium text-zinc-900 mb-1">Take Photo</p>
                  <p className="text-xs text-zinc-500">Use device camera</p>
                </button>
              </div>

              {/* Results */}
              {yoloImage && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900">Detection Results</h3>
                    <button
                      onClick={clearYOLOResults}
                      className="text-sm text-zinc-600 hover:text-zinc-900"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="bg-zinc-50 rounded-lg p-4">
                    {yoloLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-blue-600 mr-3" />
                        <span className="text-zinc-600">Detecting objects...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <img
                            src={yoloImage}
                            alt="Analyzed"
                            className="w-full rounded-lg border border-zinc-200"
                          />
                        </div>

                        <div>
                          <div className="mb-4">
                            <h4 className="font-medium text-zinc-900 mb-2">
                              Detected Objects ({yoloDetections.length})
                            </h4>
                            {yoloDetections.length === 0 ? (
                              <p className="text-sm text-zinc-600">No objects detected</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {yoloDetections.map((detection, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between bg-white p-3 rounded border border-zinc-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${detection.className === 'person' ? 'bg-red-500' :
                                        detection.className === 'helmet' ? 'bg-green-500' :
                                          detection.className === 'truck' ? 'bg-blue-500' : 'bg-gray-500'
                                        }`} />
                                      <span className="font-medium text-zinc-900">
                                        {detection.className}
                                      </span>
                                    </div>
                                    <span className="text-sm text-zinc-600">
                                      {(detection.confidence * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Construction Safety Notes */}
                          {yoloDetections.some(d => ['person', 'helmet', 'hard_hat', 'safety_vest'].includes(d.className)) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2">🛡️ Safety Analysis</h4>
                              <div className="text-sm text-blue-800 space-y-1">
                                {yoloDetections.filter(d => d.className === 'person').length > 0 && (
                                  <p>• {yoloDetections.filter(d => d.className === 'person').length} person(s) detected on site</p>
                                )}
                                {yoloDetections.filter(d => ['helmet', 'hard_hat'].includes(d.className)).length === 0 && (
                                  <p className="text-red-700 font-medium">⚠️ No helmets detected - safety concern</p>
                                )}
                                {yoloDetections.filter(d => d.className === 'safety_vest').length === 0 && (
                                  <p className="text-red-700 font-medium">⚠️ No safety vests detected - safety concern</p>
                                )}
                                {yoloDetections.filter(d => ['helmet', 'hard_hat', 'safety_vest'].includes(d.className)).length > 0 && (
                                  <p className="text-green-700">✓ Some PPE detected</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Equipment Tracking */}
                          {yoloDetections.some(d => ['truck', 'excavator', 'crane', 'forklift'].includes(d.className)) && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                              <h4 className="font-medium text-green-900 mb-2">🚛 Equipment Tracking</h4>
                              <div className="text-sm text-green-800 space-y-1">
                                {['truck', 'excavator', 'crane', 'forklift'].map(equipment =>
                                  yoloDetections.filter(d => d.className === equipment).length > 0 && (
                                    <p key={equipment}>
                                      • {yoloDetections.filter(d => d.className === equipment).length} {equipment}(s) detected
                                    </p>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900">Take Photo</h3>
              <button onClick={closeCamera} className="p-2 hover:bg-zinc-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <video ref={videoRef} className="w-full rounded-lg mb-4" autoPlay playsInline muted />
            <div className="flex gap-3">
              <button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-1">
                Capture
              </button>
              <button onClick={closeCamera} className="bg-zinc-200 hover:bg-zinc-300 text-zinc-900 px-4 py-2 rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIToolsView;
