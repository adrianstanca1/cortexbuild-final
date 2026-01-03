import React, { useEffect, useState } from 'react';
import { useProjects } from '../contexts/ProjectContext.js';
import { AlertTriangle, TrendingUp, Clock, Info, Loader2, CheckCircle2 } from 'lucide-react';

interface PredictiveInsightsProps {
    projectId: string;
}

const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ projectId }) => {
    const { getPredictiveAnalysis } = useProjects();
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const data = await getPredictiveAnalysis(projectId);
                setAnalysis(data);
            } catch (err) {
                console.error("Failed to fetch predictive analysis", err);
            } finally {
                setLoading(false);
            }
        };
        if (projectId) fetchAnalysis();
    }, [projectId, getPredictiveAnalysis]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[200px] animate-pulse">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-4" />
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Neural Engine Processing...</p>
        </div>
    );

    if (!analysis) return null;

    const getStatusColor = (prob: number) => {
        if (prob < 30) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (prob < 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Predictive Analysis</h3>
                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Confidence Level: High</p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${getStatusColor(analysis.delayProbability)}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${analysis.delayProbability < 30 ? 'bg-emerald-400' : analysis.delayProbability < 60 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    {analysis.delayProbability}% Probability
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-start gap-5">
                    <div className={`p-4 rounded-2xl ${analysis.delayProbability > 60 ? 'bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-900/20' : 'bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-900/20'}`}>
                        <Clock className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Forecasted Impact</p>
                        <p className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            {analysis.predictedDelayDays} <span className="text-sm font-bold text-zinc-500">Days Delay</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Info size={40} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <Info className="w-4 h-4 text-sky-400" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Reasoning</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic relative z-10">
                        &quot;{analysis.reasoning}&quot;
                    </p>
                </div>

                {analysis.riskFactors && analysis.riskFactors.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Detected Risk Vectors</p>
                        <div className="flex flex-wrap gap-2">
                            {analysis.riskFactors.map((factor: string, i: number) => (
                                <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-bold text-rose-300 shadow-sm hover:bg-rose-500/20 transition-colors cursor-default">
                                    <AlertTriangle className="w-3 h-3" />
                                    {factor}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Generated: {new Date(analysis.analyzedAt).toLocaleTimeString()}</span>
                <button className="text-xs font-bold text-sky-400 hover:text-white transition-colors flex items-center gap-2 group">
                    View Full Analysis <CheckCircle2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default React.memo(PredictiveInsights);
