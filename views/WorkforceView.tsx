
import React, { useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { AlertTriangle, Award, Calendar, CheckCircle2, Briefcase, Loader2, Sparkles, RefreshCw, Brain, BookOpen, GraduationCap, TrendingUp, Target, Users, Clock, Zap, Shield, TrendingDown, Plus, UserPlus, X } from 'lucide-react';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import { TeamMember } from '@/types';

interface TeamMemberProfile {
    id: string;
    name: string;
    role: string;
    experience: number;
    performanceScore: number;
    availability: 'Available' | 'On Site' | 'Off Site' | 'Leave';
    specialties: string[];
    certifications: Array<{ name: string; expiryDate: string; status: 'Valid' | 'Expiring' | 'Expired' }>;
    hoursWorked: number;
    projectsCompleted: number;
    safetyIncidents: number;
    lastAssigned: string;
}

interface PerformanceMetric {
    id: string;
    memberName: string;
    metric: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    threshold: number;
}

interface StaffingRecommendation {
    id: string;
    projectName: string;
    rolesNeeded: Array<{ role: string; count: number; priority: 'high' | 'medium' | 'low' }>;
    estimatedStartDate: string;
    duration: string;
    riskLevel: 'low' | 'medium' | 'high';
}

const WorkforceView: React.FC = () => {
    const { addToast } = useToast();
    const { isLoading } = useProjects();
    const { workforce, addTeamMember } = useTenant();
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    // New Member State
    const [newMember, setNewMember] = useState<Partial<TeamMember>>({
        status: 'On Site',
        skills: [],
        certifications: []
    });

    // Training Recommendation State
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [trainingPlan, setTrainingPlan] = useState<any[] | null>(null);

    // Performance & Analytics State
    const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'staffing'>('overview');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

    // Use Valid Data
    const memberProfiles = workforce;

    // Generate Performance Metrics
    const performanceMetrics: PerformanceMetric[] = [
        { id: '1', memberName: 'John Smith', metric: 'Productivity', value: 92, trend: 'up', threshold: 80 },
        { id: '2', memberName: 'Sarah Johnson', metric: 'Safety Score', value: 98, trend: 'stable', threshold: 95 },
        { id: '3', memberName: 'Mike Davis', metric: 'Quality Rating', value: 78, trend: 'down', threshold: 85 },
        { id: '4', memberName: 'Emma Wilson', metric: 'Attendance', value: 96, trend: 'up', threshold: 90 },
        { id: '5', memberName: 'James Brown', metric: 'Teamwork', value: 88, trend: 'stable', threshold: 75 },
    ];

    // Generate Staffing Recommendations
    const staffingRecommendations: StaffingRecommendation[] = [
        {
            id: '1',
            projectName: 'Downtown Tower Phase 2',
            rolesNeeded: [
                { role: 'Electrician', count: 3, priority: 'high' },
                { role: 'Welder', count: 2, priority: 'high' },
                { role: 'Safety Officer', count: 1, priority: 'medium' }
            ],
            estimatedStartDate: '2025-01-15',
            duration: '6 months',
            riskLevel: 'high'
        },
        {
            id: '2',
            projectName: 'Harbor Bridge Renovation',
            rolesNeeded: [
                { role: 'Structural Engineer', count: 2, priority: 'high' },
                { role: 'Crane Operator', count: 1, priority: 'medium' }
            ],
            estimatedStartDate: '2025-02-01',
            duration: '4 months',
            riskLevel: 'medium'
        },
        {
            id: '3',
            projectName: 'Central Park Construction',
            rolesNeeded: [
                { role: 'Laborer', count: 8, priority: 'medium' },
                { role: 'Equipment Operator', count: 2, priority: 'low' }
            ],
            estimatedStartDate: '2025-01-25',
            duration: '3 months',
            riskLevel: 'low'
        }
    ];

    // --- Derived Stats ---
    const totalMembers = workforce.length;
    const activeMembers = workforce.filter(m => m.status === 'On Site').length;
    const utilizationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

    // Skill Gaps (Mock logic for simulation)
    const allSkills = workforce.flatMap(m => m.skills?.map(s => s.name) || []);
    const uniqueSkills = Array.from(new Set(allSkills)) as string[];
    const skillCounts = uniqueSkills.reduce((acc, skill) => {
        acc[skill] = allSkills.filter(s => s === skill).length;
        return acc;
    }, {} as Record<string, number>);

    const skillGaps = Object.entries(skillCounts).filter(([_, count]) => count < 2).map(([skill]) => skill);

    // Expiring Certifications
    const expiringCerts = workforce.flatMap(m =>
        (m.certifications || [])
            .filter(c => c.status === 'Expiring' || c.status === 'Expired')
            .map(c => ({ member: m.name, cert: c.name, date: c.expiryDate, status: c.status }))
    );

    // Advanced Metrics
    const avgPerformanceScore = memberProfiles.length > 0
        ? Math.round(memberProfiles.reduce((sum, m) => sum + (m.performanceRating || 0), 0) / memberProfiles.length)
        : 0;
    const totalHoursWorked = memberProfiles.reduce((sum, m) => sum + (m.hoursWorked || 0), 0);
    const criticalStaffingGaps = staffingRecommendations.reduce((count, rec) =>
        count + rec.rolesNeeded.filter(r => r.priority === 'high').length, 0
    );

    const runWorkforceAnalysis = async () => {
        setAnalyzing(true);
        try {
            const context = {
                totalMembers,
                utilizationRate,
                skillCounts,
                gaps: skillGaps,
                expiring: expiringCerts.length
            };

            const prompt = `
            As a senior construction workforce consultant, analyze this data: ${JSON.stringify(context)}.
            Provide a concise strategic summary (max 3 sentences) identifying key risks (e.g. reliance on specific skills) and a recruitment recommendation.
            Tone: Professional and actionable.
          `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview', // Using Pro for reasoning
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 1024 }
            });

            setAiAnalysis(result);
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setAnalyzing(false);
        }
    };

    const generateTrainingPlan = async () => {
        if (skillGaps.length === 0) {
            addToast("No critical skill gaps identified.", 'info');
            return;
        }
        setTrainingLoading(true);
        try {
            const prompt = `
            Based on these skill gaps in a construction team: ${skillGaps.join(', ')}.
            Recommend 3 specific training courses or certifications to address these gaps.
            Return JSON: [{ "course": "string", "provider": "string", "targetSkill": "string" }]
          `;
            const res = await runRawPrompt(prompt, { model: 'gemini-2.5-flash', responseMimeType: 'application/json' });
            setTrainingPlan(parseAIJSON(res));
        } catch (e) {
            console.error("Training plan failed", e);
        } finally {
            setTrainingLoading(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-zinc-400" size={32} /></div>;
    }

    const getTrendIcon = (trend: string) => {
        if (trend === 'up') return <TrendingUp size={14} className="text-green-500" />;
        if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
        return <Zap size={14} className="text-amber-500" />;
    };

    const getRiskColor = (risk: string) => {
        if (risk === 'high') return 'bg-red-50 border-red-200';
        if (risk === 'medium') return 'bg-amber-50 border-amber-200';
        return 'bg-green-50 border-green-200';
    };

    const getPriorityBadge = (priority: string) => {
        if (priority === 'high') return 'bg-red-100 text-red-700';
        if (priority === 'medium') return 'bg-amber-100 text-amber-700';
        return 'bg-green-100 text-green-700';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
            <div className="mb-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 mb-1">Workforce Analytics</h1>
                        <p className="text-zinc-500">Real-time insights into team capacity, skills, and compliance.</p>
                    </div>
                    <button
                        onClick={runWorkforceAnalysis}
                        disabled={analyzing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${analyzing
                            ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
                            }`}
                    >
                        {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                        {analyzing ? 'Thinking...' : 'AI Analysis'}
                    </button>
                    <button
                        onClick={() => setShowAddMember(true)}
                        className="flex items-center gap-2 bg-[#0f5c82] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#0c4a6e] shadow-lg ml-3"
                    >
                        <UserPlus size={16} /> Add Member
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-4 border-b border-zinc-200">
                    <button
                        onClick={() => setSelectedTab('overview')}
                        className={`px-4 py-3 font-bold text-sm transition-all ${selectedTab === 'overview'
                            ? 'text-[#0f5c82] border-b-2 border-[#0f5c82]'
                            : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                    >
                        <Users className="inline mr-2" size={16} /> Overview
                    </button>
                    <button
                        onClick={() => setSelectedTab('performance')}
                        className={`px-4 py-3 font-bold text-sm transition-all ${selectedTab === 'performance'
                            ? 'text-[#0f5c82] border-b-2 border-[#0f5c82]'
                            : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                    >
                        <TrendingUp className="inline mr-2" size={16} /> Performance
                    </button>
                    <button
                        onClick={() => setSelectedTab('staffing')}
                        className={`px-4 py-3 font-bold text-sm transition-all ${selectedTab === 'staffing'
                            ? 'text-[#0f5c82] border-b-2 border-[#0f5c82]'
                            : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                    >
                        <Target className="inline mr-2" size={16} /> Staffing
                    </button>
                </div>
            </div>

            {aiAnalysis && (
                <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-white border border-purple-100 rounded-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-600"><Sparkles size={64} /></div>
                    <h3 className="text-sm font-bold text-purple-800 uppercase mb-2 flex items-center gap-2 relative z-10">
                        <Sparkles size={14} /> Gemini Workforce Consultant
                    </h3>
                    <p className="text-purple-900 text-base leading-relaxed relative z-10 font-medium">
                        {aiAnalysis}
                    </p>
                </div>
            )}

            {/* OVERVIEW TAB */}
            {selectedTab === 'overview' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className={`text-3xl font-bold mb-1 ${utilizationRate > 80 ? 'text-green-600' : 'text-zinc-900'}`}>{utilizationRate}%</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Current Utilization</div>
                            <div className="text-xs text-zinc-400 mt-2">{activeMembers} of {totalMembers} active</div>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-zinc-900 text-3xl font-bold mb-1">{avgPerformanceScore}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Avg Performance Score</div>
                            <div className="text-xs text-green-500 mt-2 font-medium">Team Quality</div>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-zinc-900 text-3xl font-bold mb-1">{skillGaps.length}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Skill Gaps Identified</div>
                            <div className="text-xs text-red-500 mt-2 font-medium">Critical Needs</div>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-zinc-900 text-3xl font-bold mb-1">{expiringCerts.length}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Compliance Risks</div>
                            <div className="text-xs text-orange-500 mt-2 font-medium">Expiring Certifications</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Skill Matrix Card */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-zinc-800 flex items-center gap-2"><Award className="text-[#0f5c82]" size={20} /> Skill Matrix</h3>
                                {skillGaps.length > 0 && (
                                    <button
                                        onClick={generateTrainingPlan}
                                        disabled={trainingLoading}
                                        className="text-xs font-bold text-[#0f5c82] bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm border border-blue-100"
                                    >
                                        {trainingLoading ? <Loader2 size={12} className="animate-spin" /> : <GraduationCap size={14} />}
                                        Suggest Training for Gaps
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-4 custom-scrollbar">
                                {uniqueSkills.map(skill => {
                                    const isGap = skillCounts[skill] < 2;
                                    return (
                                        <div key={skill} className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                                            <span className="text-sm text-zinc-700 font-medium flex items-center gap-2">
                                                {skill}
                                                {isGap && <AlertTriangle size={14} className="text-red-500" />}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                {isGap && <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-1.5 rounded">Risk</span>}
                                                <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${isGap ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(100, (skillCounts[skill] / totalMembers) * 100 * 3)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold w-6 text-right ${isGap ? 'text-red-500' : 'text-zinc-700'}`}>{skillCounts[skill]}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Training Recommendations Result */}
                            {trainingPlan && (
                                <div className="mt-auto pt-4 border-t border-zinc-100 animate-in slide-in-from-bottom-2">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                                        <Sparkles size={12} className="text-blue-500" /> Recommended Training
                                    </h4>
                                    <div className="space-y-2">
                                        {trainingPlan.map((tp, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs hover:bg-blue-50 transition-colors">
                                                <div>
                                                    <div className="font-bold text-blue-900">{tp.course}</div>
                                                    <div className="text-blue-600/80">{tp.provider}</div>
                                                </div>
                                                <span className="px-2 py-1 bg-white text-blue-700 border border-blue-200 rounded font-bold shadow-sm">{tp.targetSkill}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Expiring Certs Card */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
                            <h3 className="font-bold text-zinc-800 mb-6 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={20} /> Expiring Qualifications</h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {expiringCerts.length > 0 ? expiringCerts.map((item, i) => (
                                    <div key={i} className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex items-start justify-between group hover:border-zinc-300 transition-colors">
                                        <div>
                                            <div className="font-bold text-zinc-900 text-sm mb-0.5">{item.member}</div>
                                            <div className="text-xs text-zinc-500 font-medium">{item.cert}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded mb-1 inline-block ${item.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {item.status}
                                            </div>
                                            <div className="text-[10px] text-zinc-400 font-mono">{item.date}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-zinc-400 py-12 italic flex flex-col items-center">
                                        <CheckCircle2 size={32} className="mb-2 opacity-20" />
                                        All certifications are valid.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Capacity Planning */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 mt-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-zinc-800 flex items-center gap-2"><Calendar className="text-green-600" size={20} /> Project Allocation</h3>
                            <button className="text-xs font-bold text-[#0f5c82] hover:underline">View Full Schedule</button>
                        </div>
                        <div className="space-y-4">
                            {workforce.slice(0, 5).map(member => (
                                <div key={member.id} className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white`}>
                                        {member.initials}
                                    </div>
                                    <div className="w-32 text-sm font-medium text-zinc-900 truncate">{member.name}</div>
                                    <div className="flex-1 h-8 bg-zinc-50 rounded-lg relative overflow-hidden border border-zinc-200 flex">
                                        {/* Simulated Gantt Bar */}
                                        <div className="w-[30%] bg-transparent border-r border-zinc-200/50"></div>
                                        <div className="flex-1 bg-blue-100 border border-blue-200 rounded-sm m-1 flex items-center justify-center text-[10px] text-blue-800 font-medium truncate px-2 shadow-sm">
                                            {member.projectName || 'Available'}
                                        </div>
                                        <div className="w-[20%] bg-transparent border-l border-zinc-200/50"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PERFORMANCE TAB */}
            {selectedTab === 'performance' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Performance Metrics */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-zinc-800 mb-6 flex items-center gap-2"><TrendingUp className="text-green-600" size={20} /> Team Performance Metrics</h3>
                            <div className="space-y-4">
                                {performanceMetrics.map(metric => (
                                    <div key={metric.id} className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 hover:border-zinc-300 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-zinc-900">{metric.memberName}</span>
                                            {getTrendIcon(metric.trend)}
                                        </div>
                                        <div className="text-xs text-zinc-600 mb-2">{metric.metric}</div>
                                        <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden mb-1">
                                            <div
                                                className={metric.value >= metric.threshold ? 'bg-green-500' : 'bg-orange-500'}
                                                style={{ width: `${Math.min(100, metric.value)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-zinc-500">
                                            <span>{metric.value}</span>
                                            <span>Target: {metric.threshold}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-zinc-800 mb-6 flex items-center gap-2"><Award className="text-[#0f5c82]" size={20} /> Top Performers</h3>
                            <div className="space-y-3">
                                {memberProfiles
                                    .sort((a, b) => (b.performanceRating || 0) - (a.performanceRating || 0))
                                    .slice(0, 6)
                                    .map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => setSelectedMember(member)}
                                            className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-bold text-sm text-zinc-900">{member.name}</div>
                                                <div className="text-sm font-bold text-blue-600">{member.performanceRating}/100</div>
                                            </div>
                                            <div className="text-xs text-zinc-600 mb-2">{member.role} • {member.experience} yrs exp</div>
                                            <div className="flex flex-wrap gap-1">
                                                {member.skills?.slice(0, 2).map((spec, i) => (
                                                    <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        {spec.name} (L{spec.level})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Member Detail Modal */}
                    {selectedMember && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900">{selectedMember.name}</h2>
                                        <p className="text-zinc-600">{selectedMember.role} • {selectedMember.experience} years experience</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="text-zinc-400 hover:text-zinc-600 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{selectedMember.performanceRating}</div>
                                        <div className="text-xs text-blue-600/60 font-bold">Performance Score</div>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{selectedMember.hoursWorked}h</div>
                                        <div className="text-xs text-green-600/60 font-bold">Hours Worked</div>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{selectedMember.completedProjects}</div>
                                        <div className="text-xs text-amber-600/60 font-bold">Projects Completed</div>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{selectedMember.safetyIncidents}</div>
                                        <div className="text-xs text-red-600/60 font-bold">Safety Incidents</div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="font-bold text-zinc-900 mb-3">Skills & Specialties</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMember.skills?.map((spec, i) => (
                                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">
                                                {spec.name} <span className="opacity-50 text-xs">L{spec.level}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {selectedMember.certifications.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-zinc-900 mb-3">Certifications</h3>
                                        <div className="space-y-2">
                                            {selectedMember.certifications.map((cert, i) => (
                                                <div key={i} className="p-3 bg-zinc-50 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <div className="font-medium text-zinc-900 text-sm">{cert.name}</div>
                                                        <div className="text-xs text-zinc-500">Expires: {cert.expiryDate}</div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${cert.status === 'Valid' ? 'bg-green-100 text-green-700' : cert.status === 'Expiring' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                        {cert.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STAFFING TAB */}
            {selectedTab === 'staffing' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{staffingRecommendations.length}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Active Staffing Requests</div>
                            <div className="text-xs text-zinc-400 mt-2">Requiring immediate action</div>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-3xl font-bold text-red-600 mb-1">{criticalStaffingGaps}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Critical Positions</div>
                            <div className="text-xs text-zinc-400 mt-2">High priority roles</div>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                            <div className="text-3xl font-bold text-green-600 mb-1">{Math.round((memberProfiles.filter(m => m.status === 'Off Site').length / memberProfiles.length) * 100)}%</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold">Available for Assignment</div>
                            <div className="text-xs text-zinc-400 mt-2">Ready to deploy</div>
                        </div>
                    </div>

                    {/* Staffing Recommendations */}
                    <div className="space-y-4">
                        {staffingRecommendations.map(rec => (
                            <div key={rec.id} className={`p-6 rounded-xl border-2 ${getRiskColor(rec.riskLevel)}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-900">{rec.projectName}</h3>
                                        <div className="text-sm text-zinc-600 mt-1 flex items-center gap-4">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> Starts: {rec.estimatedStartDate}</span>
                                            <span className="flex items-center gap-1"><Clock size={14} /> Duration: {rec.duration}</span>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-2 rounded-lg font-bold text-sm ${rec.riskLevel === 'high' ? 'bg-red-100 text-red-700' : rec.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {rec.riskLevel === 'high' ? '⚠️ High Risk' : rec.riskLevel === 'medium' ? '⚡ Medium Risk' : '✓ Low Risk'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {rec.rolesNeeded.map((role, i) => (
                                        <div key={i} className="p-4 bg-white/50 rounded-lg border border-zinc-200/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-bold text-zinc-900">{role.role}</div>
                                                    <div className="text-2xl font-bold text-blue-600">{role.count}</div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${getPriorityBadge(role.priority)}`}>
                                                    {role.priority}
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-600">
                                                {memberProfiles.filter(m => m.skills?.some(s => s.name.toLowerCase().includes(role.role.toLowerCase()))).length} qualified
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><UserPlus className="text-[#0f5c82]" /> Add Team Member</h3>
                            <button onClick={() => setShowAddMember(false)}><X size={20} className="text-zinc-400 hover:text-zinc-600" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Name</label>
                                    <input type="text" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" value={newMember.name || ''} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full Name" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Role</label>
                                    <input type="text" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" value={newMember.role || ''} onChange={e => setNewMember({ ...newMember, role: e.target.value })} placeholder="e.g. Electrician" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Email</label>
                                    <input type="email" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" value={newMember.email || ''} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="email@company.com" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Phone</label>
                                    <input type="text" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" value={newMember.phone || ''} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} placeholder="(555) 555-5555" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Hourly Rate ($)</label>
                                    <input type="number" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" value={newMember.hourlyRate || ''} onChange={e => setNewMember({ ...newMember, hourlyRate: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Experience (Yrs)</label>
                                    <input type="number" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" placeholder="5" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Primary Skills (Comma separated)</label>
                                <input type="text" className="w-full p-2 border border-zinc-200 rounded-lg text-sm" placeholder="Wiring, Safety, Blueprint Reading" onChange={e => setNewMember({
                                    ...newMember,
                                    skills: e.target.value.split(',').map(s => ({ name: s.trim(), level: 3, verified: false }))
                                })} />
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                            <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => {
                                if (newMember.name && newMember.role) {
                                    addTeamMember({
                                        id: `tm-${Date.now()}`,
                                        companyId: 'c1',
                                        name: newMember.name,
                                        initials: newMember.name.split(' ').map(n => n[0]).join(''),
                                        role: newMember.role,
                                        status: 'On Site',
                                        phone: newMember.phone || '',
                                        email: newMember.email || '',
                                        color: 'bg-blue-500',
                                        skills: newMember.skills || [],
                                        performanceRating: 80, // Default start
                                        completedProjects: 0,
                                        hourlyRate: newMember.hourlyRate || 30,
                                        certifications: []
                                    } as TeamMember);
                                    setShowAddMember(false);
                                    addToast(`Added ${newMember.name} to workforce`, 'success');
                                }
                            }} disabled={!newMember.name || !newMember.role} className="px-6 py-2 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] disabled:opacity-50">Create Member</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkforceView;
