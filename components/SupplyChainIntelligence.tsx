import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck, Zap, Loader2, Sparkles, TrendingDown } from 'lucide-react';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';

interface MarketTrend {
    material: string;
    trend: 'up' | 'down' | 'stable';
    change: string;
    prediction: string;
    risk: 'High' | 'Medium' | 'Low';
}

const SupplyChainIntelligence: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [trends, setTrends] = useState<MarketTrend[]>([]);
    const [insights, setInsights] = useState<string>('');

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const prompt = `Analyze current global construction supply chain trends for 2024-2025. 
        Focus on: Steel, Concrete, Lumber, and Semiconductors for HVAC.
        Return JSON with:
        1) 'trends': array of {material, trend (up/down/stable), change (%), prediction, risk (High/Medium/Low)}
        2) 'summary': 2-sentence executive summary of supply chain health.`;

                const response = await runRawPrompt(prompt, {
                    model: 'gemini-3-pro-preview',
                    responseMimeType: 'application/json',
                    temperature: 0.2
                });

                const parsed = parseAIJSON(response);
                setTrends(parsed.trends || []);
                setInsights(parsed.summary || 'Market volatility remains moderate. Monitor steel prices closely.');
            } catch (error) {
                console.error('Failed to fetch supply chain intelligence:', error);
                // Fallback data
                setTrends([
                    { material: 'Structural Steel', trend: 'up', change: '+5.2%', prediction: 'Rising scrap costs', risk: 'High' },
                    { material: 'Portland Cement', trend: 'stable', change: '+0.8%', prediction: 'Steady supply', risk: 'Low' },
                    { material: 'Lumber', trend: 'down', change: '-2.4%', prediction: 'Increased milling output', risk: 'Medium' }
                ]);
                setInsights('Supply chain stabilization continues, though geopolitical factors pose risks to metal imports.');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, []);

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#0f5c82] p-4 flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" /> Supply Chain Intelligence
                </h3>
                {loading && <Loader2 size={16} className="text-white/50 animate-spin" />}
            </div>

            <div className="p-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <p className="text-blue-900 text-sm leading-relaxed font-medium italic">
                        &quot;{insights}&quot;
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {trends.map((t, i) => (
                        <div key={i} className="p-4 border border-zinc-100 rounded-xl bg-zinc-50/50 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-zinc-400 uppercase tracking-tight">{t.material}</span>
                                {t.trend === 'up' ? (
                                    <TrendingUp size={16} className="text-red-500" />
                                ) : t.trend === 'down' ? (
                                    <TrendingDown size={16} className="text-green-500" />
                                ) : (
                                    <Zap size={16} className="text-blue-500" />
                                )}
                            </div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xl font-black text-zinc-900">{t.change}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.risk === 'High' ? 'bg-red-100 text-red-700' :
                                    t.risk === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {t.risk} Risk
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium leading-tight group-hover:text-zinc-700 transition-colors">
                                {t.prediction}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SupplyChainIntelligence;
