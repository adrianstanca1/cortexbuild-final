import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Sparkles, DollarSign, Calendar } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';

const BudgetForecasting: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { transactions, projects } = useProjects();
    const project = projects.find(p => p.id === projectId);
    const projectTransactions = transactions.filter(t => t.projectId === projectId);

    const [forecast, setForecast] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const stats = useMemo(() => {
        const totalSpent = projectTransactions.reduce((acc, t) => acc + t.amount, 0);
        const monthlyAvg = projectTransactions.length > 0 ? totalSpent / Math.max(1, (projectTransactions.length / 2)) : 0; // Rough mock logic
        return { totalSpent, monthlyAvg };
    }, [projectTransactions]);

    const generateForecast = async () => {
        if (projectTransactions.length === 0) return;
        setIsLoading(true);
        try {
            const dataSummary = projectTransactions.map(t => ({ date: t.date, amount: t.amount, category: t.category }));
            const prompt = `Act as a Construction Financial Controller. Analyze these transactions: ${JSON.stringify(dataSummary.slice(-10))}. 
      Total spent so far: £${stats.totalSpent}. 
      Predict the final project cost and identify top risk categories. 
      Return JSON: { prediction: number, confidence: number, riskFactors: [string], recommendation: string }`;

            const res = await runRawPrompt(prompt, { model: 'gemini-1.5-flash', responseMimeType: 'application/json' });
            const data = parseAIJSON(res);
            setForecast(data);
        } catch (e) {
            console.error("Forecasting error", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectTransactions.length > 0) {
            generateForecast();
        }
    }, [projectId, projectTransactions.length]);

    if (projectTransactions.length === 0) {
        return (
            <div className="p-8 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl text-center">
                <DollarSign className="mx-auto mb-3 text-zinc-300" size={32} />
                <p className="text-zinc-500 text-sm">Not enough transaction data for AI forecasting yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <div>
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Sparkles className="text-[#0f5c82]" size={18} /> AI Budget Forecast
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Predictive spending analysis based on current velocity.</p>
                </div>
                <button
                    onClick={generateForecast}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    title="Refresh Analysis"
                >
                    <Calendar size={16} className="text-zinc-400" />
                </button>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Projected Total Cost</p>
                        <p className="text-2xl font-black text-[#0f5c82]">
                            £{forecast?.prediction ? forecast.prediction.toLocaleString() : (stats.totalSpent * 1.5).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-amber-600">
                            <TrendingUp size={12} /> {forecast?.confidence || 85}% Confidence Score
                        </div>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Burn Rate (Avg/Month)</p>
                        <p className="text-2xl font-black text-zinc-900">
                            £{stats.monthlyAvg.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-green-600">
                            <TrendingDown size={12} /> Stabilizing velocity
                        </div>
                    </div>
                </div>

                {forecast && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                            <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <AlertCircle size={14} /> Risk Factors Identified
                            </p>
                            <ul className="text-xs text-blue-800 space-y-1">
                                {forecast.riskFactors?.map((risk: string, i: number) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="opacity-50">•</span> {risk}
                                    </li>
                                )) || <li>No major risks identified in current spend.</li>}
                            </ul>
                        </div>

                        <div className="bg-zinc-900 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">AI Recommendation</p>
                            <p className="text-xs text-white leading-relaxed italic">
                                &quot;{forecast.recommendation || 'Maintain current procurement velocity. Consider early ordering of Phase 3 materials to lock in rates.'}&quot;
                            </p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-[#0f5c82]/30 border-t-[#0f5c82] rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-[#0f5c82] animate-pulse">Analyzing financials...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetForecasting;
