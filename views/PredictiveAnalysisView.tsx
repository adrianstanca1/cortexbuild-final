import React, { useState, useEffect } from 'react';
import {
    Brain, TrendingUp, AlertTriangle, Calendar,
    ArrowRight, Activity, Clock, BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { db } from '@/services/db';

interface RiskAnalysis {
    riskScore: number;
    predictedDelayDays: number;
    riskFactors: string[];
    recommendations: string[];
    reasoning: string;
    confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    analyzedAt: string;
}

const PredictiveAnalysisView: React.FC = () => {
    const { token } = useAuth();
    const { projects } = useProjects();
    const { currentTenant } = useTenant();

    // Default to first project if available
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
    const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedProjectId) {
            fetchAnalysis(selectedProjectId);
        }
    }, [selectedProjectId, currentTenant]);

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects]);

    const fetchAnalysis = async (projectId: string) => {
        try {
            setLoading(true);
            const data = await db.getPredictiveAnalysis(projectId);
            if (data) {
                setAnalysis({
                    ...data,
                    riskFactors: Array.isArray(data.riskFactors) ? data.riskFactors : [],
                    recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
                });
            } else {
                setAnalysis(null);
            }
        } catch (error) {
            console.error('Failed to fetch analysis', error);
            setAnalysis(null);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score < 30) return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        if (score < 70) return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
        return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    };

    if (projects.length === 0) {
        return (
            <div className="p-8 text-center">
                <Brain className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Projects Found</h2>
                <p className="text-zinc-500">Create a project to enable predictive analysis.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Brain className="text-purple-600" />
                        Predictive Intelligence
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        AI-driven insights on project timeline and risk factors
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-zinc-700 dark:text-white pr-8 cursor-pointer"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-purple-500 font-medium animate-pulse">Running AI Analysis...</p>
                    </div>
                </div>
            ) : analysis ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Risk Score Card */}
                    <div className="col-span-1 md:col-span-1 bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Project Risk Score</h3>

                        <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center mb-4 ${getScoreColor(analysis.riskScore).split(' ')[3]}`}>
                            <div>
                                <span className={`text-4xl font-bold ${getScoreColor(analysis.riskScore).split(' ')[0]}`}>{analysis.riskScore}</span>
                                <span className="text-sm block text-zinc-400">/ 100</span>
                            </div>
                        </div>

                        <div className={`px-4 py-1 rounded-full text-xs font-bold border ${getScoreColor(analysis.riskScore)}`}>
                            {analysis.riskScore < 30 ? 'Low Risk' : analysis.riskScore < 70 ? 'Medium Risk' : 'High Risk'}
                        </div>
                    </div>

                    {/* Stats & Delays */}
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                                    <Clock size={20} />
                                </div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">Predicted Delay</h3>
                            </div>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-4">
                                {analysis.predictedDelayDays} <span className="text-base font-normal text-zinc-500">Days</span>
                            </p>
                            <p className="text-xs text-zinc-400 mt-2">Based on current velocity</p>
                        </div>

                        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">Confidence</h3>
                            </div>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-4">
                                {analysis.confidenceLevel}
                            </p>
                            <p className="text-xs text-zinc-400 mt-2">AI Model Certainty</p>
                        </div>

                        <div className="col-span-2 bg-white dark:bg-zinc-800 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-yellow-500" />
                                Risk Vectors
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(analysis.riskFactors) && analysis.riskFactors.map((factor, i) => (
                                    <span key={i} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm">
                                        {factor}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Brain size={200} />
                        </div>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                            <TrendingUp className="text-green-400" />
                            AI Optimization Recommendations
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            {Array.isArray(analysis.recommendations) && analysis.recommendations.map((rec, i) => (
                                <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex gap-3">
                                    <div className="shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PredictiveAnalysisView;
