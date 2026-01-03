import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RiskAnalysis {
    projectId: string;
    projectName: string;
    riskScore: number;
    delayProbability: number;
    reasoning: string;
    riskFactors: string[];
}

const HighRiskProjectsWidget: React.FC = () => {
    const { token } = useAuth();
    const [risks, setRisks] = useState<RiskAnalysis[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRisks = async () => {
            try {
                const res = await fetch('/api/predictive/all', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const { data } = await res.json();
                // Filter for high risk (score > 60)
                setRisks(data.filter((r: any) => r.riskScore > 60 || r.delayProbability > 60).sort((a: any, b: any) => b.riskScore - a.riskScore));
            } catch (e) {
                console.error("Failed to fetch project risks", e);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchRisks();
    }, [token]);

    if (loading) return (
        <div className="flex items-center gap-3 text-zinc-500 p-4">
            <Loader2 size={16} className="animate-spin text-sky-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Portfolio Risks...</span>
        </div>
    );

    if (risks.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-400" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">High Risk Vectors</span>
                </div>
                <div className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-black rounded-full border border-rose-500/20">
                    {risks.length} CRITICAL
                </div>
            </div>

            <div className="space-y-3">
                {risks.map((risk) => (
                    <div key={risk.projectId} className="bg-white/5 border border-white/5 hover:border-amber-400/30 rounded-2xl p-4 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="text-sm font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">{risk.projectName}</h4>
                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">Delay Prob: {risk.delayProbability}%</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-rose-400 tracking-tighter leading-none">{risk.riskScore}</div>
                                <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Risk Index</div>
                            </div>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed italic border-l-2 border-amber-400/30 pl-3 py-1">
                            &quot;{risk.reasoning}&quot;
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HighRiskProjectsWidget;
