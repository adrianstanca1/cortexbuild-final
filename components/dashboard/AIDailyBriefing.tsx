import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';

interface AIDailyBriefingProps {
    role: UserRole;
}

export const AIDailyBriefing: React.FC<AIDailyBriefingProps> = React.memo(({ role }) => {
    const { projects, safetyHazards, equipment } = useProjects();
    const { user } = useAuth();
    const [briefing, setBriefing] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const generateBriefing = async () => {
        setLoading(true);
        try {
            const openHazards = safetyHazards;
            const maintenanceDone = equipment.filter(e => e.status === 'Maintenance').length;
            const overdueService = equipment.filter(e => {
                if (!e.nextService) return false;
                return new Date(e.nextService) < new Date();
            }).length;

            const context = {
                role,
                userName: user?.name,
                projectCount: projects.length,
                topProjects: projects.slice(0, 3).map(p => ({ name: p.name, health: p.health, progress: p.progress })),
                safety: {
                    openHazards: openHazards.length,
                    criticalHazards: openHazards.filter(h => h.severity === 'High').length
                },
                fleet: {
                    inMaintenance: maintenanceDone,
                    overdueService: overdueService
                },
                date: new Date().toLocaleDateString()
            };

            const userName = user?.name || 'User';
            const userRole = role || 'Admin';
            const contextStr = JSON.stringify(context);
            const prompt = `Act as a Chief of Staff AI for a Construction Executive.
Generate a personalized 'Daily Briefing' for ${userName} in the role of ${userRole}.

Data context: ${contextStr}

Return JSON:
{
  "greeting": "Personalized morning greeting",
  "agenda": ["Item 1", "Item 2", "Item 3"],
  "risks": ["Risk 1", "Risk 2"],
  "wins": ["Recent win or positive trend"],
  "quote": "Motivational construction/leadership quote"
}`;


            const res = await runRawPrompt(prompt, {
                model: 'gemini-1.5-flash',
                temperature: 0.7,
                responseMimeType: 'application/json'
            });
            setBriefing(parseAIJSON(res));
        } catch (e) {
            console.error("Briefing failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateBriefing();
    }, [role]);

    if (loading) return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 animate-pulse flex items-center justify-center gap-4 min-h-[220px]">
            <Loader2 className="animate-spin text-sky-400" />
            <span className="font-bold text-zinc-400 uppercase tracking-widest text-xs">Assembling Intelligent Briefing...</span>
        </div>
    );

    if (!briefing) return null;

    return (
        <div className="relative group overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] -z-10 group-hover:bg-sky-400/20 transition-all duration-700"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10 group-hover:bg-indigo-400/20 transition-all duration-700"></div>

            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/20">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Sparkles size={160} className="text-white" />
                </div>

                <div className="flex flex-col md:flex-row gap-12 items-start relative z-10">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">AI Intelligence Briefing</h3>
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tight leading-[1.1]">{briefing.greeting}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-5">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-sky-400" /> Strategic Priorities
                                </h4>
                                <ul className="space-y-4">
                                    {briefing.agenda?.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-4 transition-transform hover:translate-x-1 duration-300">
                                            <div className="mt-1.5 w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                            <span className="text-sm font-semibold text-zinc-300 leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-5">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle size={14} className="text-rose-500" /> Critical Risk Vectors
                                </h4>
                                <ul className="space-y-4">
                                    {briefing.risks?.map((risk: string, i: number) => (
                                        <li key={i} className="flex items-start gap-4 transition-transform hover:translate-x-1 duration-300">
                                            <div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                            <span className="text-sm font-semibold text-zinc-300 leading-relaxed">{risk}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-72 space-y-6">
                        <div className="p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-900 rounded-[2rem] border border-white/5 shadow-2xl">
                            <TrendingUp size={28} className="text-emerald-400 mb-4" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase mb-3 tracking-widest">Global Traction</p>
                            <p className="text-sm font-bold text-white leading-snug italic tracking-tight">&quot;{briefing.wins?.[0]}&quot;</p>
                        </div>
                        <div className="px-6 py-4 border-l-2 border-sky-500/30 bg-white/5 rounded-r-2xl transform transition-transform hover:scale-[1.02]">
                            <p className="text-[10px] text-sky-400 font-black mb-2 uppercase tracking-widest">Leadership Insight</p>
                            <p className="text-xs text-zinc-400 font-medium italic leading-relaxed">&quot;{briefing.quote}&quot;</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

AIDailyBriefing.displayName = 'AIDailyBriefing';
