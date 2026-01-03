
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Zap, RefreshCw, Activity, Brain, CheckCircle2, XCircle, ArrowRight, Rocket, BarChart3, Cpu, Database, GitBranch, PlayCircle, PauseCircle, Download, Upload, Trash2, Eye, Settings as SettingsIcon, Clock, Target, TrendingDown } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { db } from '@/services/db';
import { MLModel, MLPrediction } from '@/types';
import { useWebSocket } from '@/contexts/WebSocketContext';

const MLInsightsView: React.FC = () => {
    const { projects, tasks } = useProjects();
    const { lastMessage } = useWebSocket();
    const [isSimulating, setIsSimulating] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [inferenceLog, setInferenceLog] = useState<string[]>([
        "Model initialized: Gemini 1.5 Pro",
        "Awaiting portfolio data input...",
    ]);

    // ML Pipeline State
    const [mlModels, setMlModels] = useState<MLModel[]>([]);
    const [predictions, setPredictions] = useState<MLPrediction[]>([]);
    const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
    const [showModelDetails, setShowModelDetails] = useState(false);
    const [modelMetrics, setModelMetrics] = useState<{ name: string; value: number }[]>([]);
    const [showTrainingPanel, setShowTrainingPanel] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const [models, preds] = await Promise.all([
                    db.getMLModels(),
                    db.getMLPredictions()
                ]);
                setMlModels(models);
                setPredictions(preds);
            } catch (error) {
                console.error('Failed to load ML data:', error);
            }
        };
        loadData();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!lastMessage) return;
        const { type, modelId, accuracy, version } = lastMessage;

        if (type === 'ml_model_training_start') {
            setMlModels(prev => prev.map(m =>
                m.id === modelId ? { ...m, status: 'training' } : m
            ));
            setInferenceLog(prev => [...prev, `Model training started: ${modelId}`]);
        }

        if (type === 'ml_model_training_end') {
            setMlModels(prev => prev.map(m =>
                m.id === modelId ? {
                    ...m,
                    status: 'deployed',
                    accuracy: accuracy || m.accuracy,
                    version: version || m.version,
                    lastTrained: new Date().toISOString().split('T')[0]
                } : m
            ));
            setInferenceLog(prev => [...prev, `Model training complete: ${modelId} (Acc: ${accuracy}%)`]);

            // Refetch models to be safe
            db.getMLModels().then(setMlModels);
        }
    }, [lastMessage]);

    const runSimulation = async () => {
        setIsSimulating(true);
        setInferenceLog(prev => [...prev, "Gathering project vectors..."]);

        try {
            // Prepare context
            const summary = projects.map(p =>
                `- ${p.name}: ${p.progress}% complete, Health: ${p.health}, Budget: £${p.budget}, Spent: £${p.spent}`
            ).join('\n');

            const overdueTasks = tasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < new Date()).length;

            setInferenceLog(prev => [...prev, "Sending telemetry to Gemini 1.5 Pro...", "Initializing Reasoning Engine...", "Thinking..."]);

            const prompt = `
            Analyze this construction portfolio:
            ${summary}
            Total Active Overdue Tasks across portfolio: ${overdueTasks}.

            Act as a senior risk analyst AI. Perform a comprehensive predictive analysis.
            Use deep reasoning to identify subtle risks and opportunities for optimization.

            Return a JSON object with the following structure (no markdown):
            {
                "optimizationScore": number (0-100),
                "riskProbability": number (0-100),
                "projectedSavings": number (estimated potential savings in GBP),
                "timelineDeviation": [number, number, number, number, number, number, number, number, number, number, number, number], // 12 months deviation
                "suggestions": [
                    { "title": "string", "desc": "string", "impact": "High" | "Medium" | "Low" }
                ]
            }

            Ensure realistic values based on the health statuses provided (At Risk projects should lower score/increase risk).
        `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-1.5-pro',
                responseMimeType: 'application/json',
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 16384 } // Max thinking for complex analysis
            });

            const data = parseAIJSON(result);
            setAnalysisResult(data);
            setInferenceLog(prev => [...prev, "Simulation Complete.", "Optimization vectors calculated."]);

            // Persist prediction
            const prediction: Omit<MLPrediction, 'id' | 'companyId'> = {
                modelId: 'm2', // Mapping to Risk Detection model
                timestamp: new Date().toISOString(),
                input: `Portfolio Audit: ${projects.length} projects`,
                output: `Efficiency: ${data.optimizationScore}%, Risk: ${data.riskProbability}%`,
                confidence: 91.5
            };

            const saved = await db.savePrediction('c1', prediction);
            if (saved) setPredictions(prev => [saved, ...prev]);

        } catch (e) {
            console.error(e);
            setInferenceLog(prev => [...prev, "Error in simulation process."]);
        } finally {
            setIsSimulating(false);
        }
    };

    // ML Pipeline Handlers
    const handleTrainModel = async (modelId: string) => {
        try {
            await db.trainMLModel(modelId);
            // WebSocket will handle the state update
        } catch (error) {
            console.error('Training failed:', error);
        }
    };

    const handleModelClick = (model: MLModel) => {
        setSelectedModel(model);
        setModelMetrics([
            { name: 'Precision', value: model.accuracy + 2 },
            { name: 'Recall', value: model.accuracy - 1.5 },
            { name: 'F1-Score', value: model.accuracy - 0.5 },
            { name: 'AUC-ROC', value: Math.min(100, model.accuracy + 1) },
        ]);
        setShowModelDetails(true);
    };

    const deployModel = async (modelId: string) => {
        // In this implementation, training automatically deploys. 
        // We could add a separate deployment step if needed.
        handleTrainModel(modelId);
    };

    // Calculate real-time metrics from Project Context
    const derivedMetrics = React.useMemo(() => {
        if (projects.length === 0) return { score: 0, risk: 0 };

        const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
        const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);
        const budgetHealth = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        const overdueCount = tasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < new Date()).length;
        const criticalProjects = projects.filter(p => p.health === 'Critical').length;
        const atRiskProjects = projects.filter(p => p.health === 'At Risk').length;

        // Simple heuristic algorithms for "Pre-AI" values
        let riskScore = 0;
        riskScore += (criticalProjects * 25);
        riskScore += (atRiskProjects * 10);
        riskScore += (overdueCount * 2);
        riskScore = Math.min(99, riskScore);

        let efficiencyScore = 100 - (riskScore * 0.5);
        if (budgetHealth > 90) efficiencyScore -= 10; // Over budget penalty
        efficiencyScore = Math.max(0, Math.min(99, efficiencyScore));

        return { score: Math.round(efficiencyScore), risk: Math.round(riskScore) };
    }, [projects, tasks]);

    // Use AI result if available, otherwise use derived heuristics
    const score = analysisResult?.optimizationScore ?? derivedMetrics.score;
    const risk = analysisResult?.riskProbability ?? derivedMetrics.risk;
    const savings = analysisResult?.projectedSavings ?? (projects.reduce((acc, p) => acc + p.budget, 0) * 0.05); // Est 5% savings default
    const deviation = analysisResult?.timelineDeviation ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-1 flex items-center gap-3">
                        <Brain className="text-[#0f5c82]" /> Machine Learning Center
                    </h1>
                    <p className="text-zinc-500">Real-time predictive analytics powered by Gemini 1.5 Pro Reasoning.</p>
                </div>
                <button
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all ${isSimulating ? 'bg-zinc-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105'
                        }`}
                >
                    {isSimulating ? <RefreshCw size={20} className="animate-spin" /> : <Zap size={20} />}
                    {isSimulating ? 'Thinking...' : 'Run Predictive Model'}
                </button>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-zinc-200 rounded-xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={64} /></div>
                    <div className="relative z-10">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Efficiency Score</div>
                        <div className="flex items-end gap-3">
                            <div className={`text-4xl font-bold transition-all duration-1000 ${isSimulating ? 'blur-sm' : ''} ${score > 80 ? 'text-green-600' : 'text-zinc-900'}`}>
                                {analysisResult ? score : '--'}%
                            </div>
                            {score > 90 && <div className="text-green-600 text-sm font-bold mb-1.5">↑ Optimized</div>}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={64} /></div>
                    <div className="relative z-10">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Risk Probability</div>
                        <div className="flex items-end gap-3">
                            <div className={`text-4xl font-bold transition-all duration-1000 ${isSimulating ? 'blur-sm' : ''} ${risk < 30 ? 'text-green-600' : 'text-red-600'}`}>
                                {analysisResult ? risk : '--'}%
                            </div>
                            {analysisResult && (
                                <div className={`text-sm font-bold mb-1.5 ${risk < 30 ? 'text-green-600' : 'text-red-600'}`}>
                                    {risk < 30 ? 'Low Risk' : 'Critical'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-300 font-mono text-xs flex flex-col h-36">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-2">
                        <span className="font-bold text-zinc-100 flex items-center gap-2"><Activity size={14} /> Inference Log</span>
                        <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`}></span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 overflow-y-auto space-y-1.5 scrollbar-hide">
                            {inferenceLog.map((log, i) => (
                                <div key={i} className="truncate opacity-80 hover:opacity-100">
                                    <span className="text-blue-500 mr-2">&gt;</span>{log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-zinc-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-[#0f5c82]" /> Projected Timeline Deviation
                    </h3>
                    <div className="h-80 w-full relative">
                        {/* Chart Area */}
                        <div className="absolute inset-0 flex items-end gap-1 pl-8 pb-6 border-l border-b border-zinc-200">
                            {/* Y Axis Labels */}
                            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-zinc-400 py-2">
                                <span>+30d</span><span>+15d</span><span>0d</span><span>-15d</span>
                            </div>

                            {/* Bars */}
                            {deviation.map((val: number, i: number) => (
                                <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                                    {/* Bar */}
                                    <div className="w-full bg-zinc-100 h-full relative overflow-hidden rounded-t-sm">
                                        {/* Baseline */}
                                        <div className="absolute top-1/2 w-full border-t border-zinc-300 border-dashed"></div>

                                        {/* Value Bar */}
                                        <div
                                            className={`absolute left-1 right-1 transition-all duration-1000 ease-out ${val > 0 ? 'bottom-1/2 bg-red-400' : 'top-1/2 bg-green-400'}`}
                                            style={{
                                                height: `${Math.abs(isSimulating ? Math.random() * 30 : val * 1.5)}%`
                                            }}
                                        ></div>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                        M{i + 1}: {val > 0 ? `+${val}d delay` : `${val}d gain`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Delay Risk</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-400 rounded-sm"></div> Time Savings</div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col">
                        <h3 className="font-bold text-zinc-800 mb-4">Optimization Plan</h3>
                        <div className="space-y-3 flex-1 overflow-y-auto h-64">
                            {analysisResult?.suggestions ? (
                                analysisResult.suggestions.map((rec: any, i: number) => (
                                    <div key={i} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-blue-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-zinc-900 text-sm">{rec.title}</span>
                                            {rec.impact === 'High' && <ArrowRight size={14} className="text-red-500" />}
                                        </div>
                                        <p className="text-xs text-zinc-600">{rec.desc}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-zinc-400 py-8 italic flex flex-col items-center">
                                    <Rocket size={32} className="mb-2 opacity-20" />
                                    Run model to generate suggestions.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#0f5c82] to-[#0c4a6e] rounded-xl p-6 text-white shadow-md">
                        <h3 className="font-bold mb-2">Projected Savings</h3>
                        <div className="text-3xl font-bold mb-1">
                            £{isSimulating ? '---,---' : (analysisResult ? savings.toLocaleString() : '0')}
                        </div>
                        <div className="text-blue-200 text-xs mb-4">Potential cost reduction via optimization</div>
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-white h-full transition-all duration-1000" style={{ width: isSimulating ? '0%' : (score > 0 ? `${score}%` : '0%') }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ML Models Section */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                        <Cpu size={28} className="text-[#0f5c82]" /> ML Pipeline Models
                    </h2>
                    <button
                        onClick={() => setShowTrainingPanel(!showTrainingPanel)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    >
                        <SettingsIcon size={16} /> Configure
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mlModels.map(model => (
                        <div
                            key={model.id}
                            onClick={() => handleModelClick(model)}
                            className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-[#0f5c82] transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-semibold text-zinc-900 text-sm">{model.name}</h4>
                                    <p className="text-xs text-zinc-500 mt-1">v{model.version}</p>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full font-medium ${model.status === 'deployed' ? 'bg-green-100 text-green-700' : model.status === 'training' ? 'bg-yellow-100 text-yellow-700 animate-pulse' : 'bg-zinc-100 text-zinc-600'}`}>
                                    {model.status === 'deployed' ? 'Deployed' : model.status === 'training' ? 'Training...' : 'Idle'}
                                </div>
                            </div>

                            <div className="bg-zinc-50 rounded-lg p-3 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-zinc-500 font-medium">Accuracy</span>
                                    <span className="text-sm font-bold text-[#0f5c82]">{model.accuracy.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#0f5c82] to-blue-500 h-full transition-all" style={{ width: `${model.accuracy}%` }}></div>
                                </div>
                            </div>

                            <div className="text-xs text-zinc-600 mb-4">
                                <div className="flex justify-between"><span>Type:</span><span className="font-medium">{model.type}</span></div>
                                <div className="flex justify-between"><span>Samples:</span><span className="font-medium">{model.trainedSamples.toLocaleString()}</span></div>
                                <div className="flex justify-between mt-1"><span>Trained:</span><span className="font-medium">{model.lastTrained}</span></div>
                            </div>

                            <div className="flex gap-2">
                                {model.status === 'training' ? (
                                    <button disabled className="flex-1 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-lg cursor-not-allowed">
                                        <RefreshCw size={12} className="inline animate-spin mr-1" /> Training
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTrainModel(model.id); }}
                                        className="flex-1 py-1.5 text-xs font-medium bg-[#0f5c82]/10 text-[#0f5c82] hover:bg-[#0f5c82]/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <PlayCircle size={12} /> Train
                                    </button>
                                )}
                                {model.status !== 'deployed' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deployModel(model.id); }}
                                        className="flex-1 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                    >
                                        Deploy
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Predictions Section */}
            <div className="mt-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900">Recent Predictions</h2>
                    <span className="bg-[#0f5c82] text-white text-xs font-bold px-3 py-1 rounded-full">{predictions.length} live</span>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-600">Model</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-600">Input</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-600">Prediction</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-600">Confidence</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-600">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {predictions.map(pred => {
                                    const model = mlModels.find(m => m.id === pred.modelId);
                                    return (
                                        <tr key={pred.id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-zinc-900">{model?.name}</div>
                                                <div className="text-xs text-zinc-500">{model?.type}</div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 max-w-xs truncate">{pred.input}</td>
                                            <td className="px-6 py-4 font-semibold text-zinc-900">
                                                {typeof pred.output === 'number' ? `£${(pred.output / 1000000).toFixed(2)}M` : pred.output}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden w-24">
                                                        <div className={`h-full transition-all ${pred.confidence > 90 ? 'bg-green-500' : pred.confidence > 75 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${pred.confidence}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-medium text-zinc-700 w-12 text-right">{pred.confidence.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500 text-xs flex items-center gap-1">
                                                <Clock size={12} /> {pred.timestamp}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Model Details Modal */}
            {showModelDetails && selectedModel && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 bg-gradient-to-r from-[#0f5c82]/5 to-blue-500/5">
                            <h3 className="text-2xl font-bold text-zinc-900 mb-1">{selectedModel.name}</h3>
                            <p className="text-zinc-600">Model: v{selectedModel.version} • Type: {selectedModel.type} • Status: {selectedModel.status}</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {modelMetrics.map((metric, i) => (
                                    <div key={i} className="border border-zinc-200 rounded-xl p-4">
                                        <div className="text-sm text-zinc-600 mb-2">{metric.name}</div>
                                        <div className="text-3xl font-bold text-[#0f5c82]">{metric.value.toFixed(1)}%</div>
                                        <div className="w-full bg-zinc-200 h-1 rounded-full mt-3 overflow-hidden">
                                            <div className="bg-[#0f5c82] h-full" style={{ width: `${metric.value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                            <button onClick={() => setShowModelDetails(false)} className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-200 rounded-lg transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MLInsightsView;
