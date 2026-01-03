import React, { useState, useEffect } from 'react';
import { Page, Project, ProjectDocument } from '@/types';
import { db } from '@/services/db';
import {
    Building2, Calendar, FileText, CheckCircle2, Clock,
    ArrowRight, Download, MessageSquare, AlertCircle, Menu, X, Bell, Lock, Activity
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ClientPortalViewProps {
    setPage?: (page: Page) => void;
}

const ClientPortalView: React.FC<ClientPortalViewProps> = ({ setPage }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState<Project | null>(null);
    const [documents, setDocuments] = useState<ProjectDocument[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'financials'>('overview');
    const [password, setPassword] = useState('');
    const [isPasswordRequired, setIsPasswordRequired] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Extract token from URL
    const token = window.location.pathname.split('/').pop();

    useEffect(() => {
        if (token) {
            validateToken();
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const validateToken = async (pwd?: string) => {
        setIsLoading(true);
        try {
            // 1. Validate Token (Post to validation endpoint)
            await db.validateShareToken(token!, pwd);

            // 2. Fetch Project Data
            const projectData = await db.getSharedProject(token!);
            const docsData = await db.getSharedDocuments(token!);

            setProject(projectData);
            setDocuments(docsData);
            setIsAuthenticated(true);
            setIsPasswordRequired(false);
        } catch (error: any) {
            console.error(error);
            if (error.message === 'PASSWORD_REQUIRED') {
                setIsPasswordRequired(true);
            } else {
                addToast(error.message || 'Invalid or expired link', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validateToken(password);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f5c82]"></div>
            </div>
        );
    }

    if (isPasswordRequired && !isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-zinc-200">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0f5c82]">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900">Protected Project</h2>
                        <p className="text-zinc-500 mt-2">This shared project is password protected.</p>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] outline-none"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!password}
                            className="w-full bg-[#0f5c82] text-white py-3 rounded-xl font-bold hover:bg-[#0c4a6e] transition-colors disabled:opacity-50"
                        >
                            Access Project
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-zinc-50">
                <Building2 size={64} className="text-zinc-300 mb-4" />
                <h2 className="text-2xl font-bold text-zinc-800">Project Not Found</h2>
                <p className="text-zinc-500 mt-2">The link may be invalid or expired.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-zinc-50 h-screen overflow-y-auto flex flex-col">
            {/* Client Header */}
            <header className="bg-white border-b border-zinc-200 px-6 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0f5c82] rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">
                        {project.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 leading-tight">{project.name}</h1>
                        <p className="text-zinc-500 text-xs flex items-center gap-1">
                            <Building2 size={10} /> {project.location || 'Site Location'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-xs text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Client View
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-10 flex-1 relative z-10">
                {/* Background Decoration */}
                <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-[#0f5c82]/5 to-transparent -z-10 pointer-events-none" />

                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-[#0f5c82] to-[#0c4a6e] rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                <Building2 size={20} className="text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Client Access Portal</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                            {project.name}
                        </h2>
                        <p className="text-blue-100 max-w-xl text-lg leading-relaxed">
                            Welcome to your project command center. Track real-time progress, review verified documents, and monitor milestones from anywhere.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Completion</div>
                            <Activity size={16} className="text-[#0f5c82]" />
                        </div>
                        <div className="text-4xl font-black text-zinc-900 mb-4">{project.progress || 0}%</div>
                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-[#0f5c82] h-full transition-all duration-1000 group-hover:brightness-110" style={{ width: `${project.progress || 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Status</div>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-zinc-900">{project.status}</div>
                        <div className="text-xs text-zinc-400 mt-2 font-medium">Current Phase</div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Kickoff</div>
                            <Calendar size={16} className="text-zinc-400" />
                        </div>
                        <div className="text-xl font-bold text-zinc-900">{project.startDate || 'TBD'}</div>
                        <div className="text-xs text-zinc-400 mt-2 font-medium">Project Start</div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Target Delivery</div>
                            <Clock size={16} className="text-zinc-400" />
                        </div>
                        <div className="text-xl font-bold text-zinc-900">{project.endDate || 'TBD'}</div>
                        <div className="text-xs text-zinc-400 mt-2 font-medium">Estimated Completion</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Feed */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Recent Photos */}
                        <div className="bg-white p-8 rounded-[2rem] border border-zinc-200/60 shadow-xl">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-black text-xl text-zinc-900 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-xl text-[#0f5c82]">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    Project Imagery
                                </h3>
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-50 px-3 py-1 rounded-full">{documents.filter(d => d.type === 'Image').length} items</span>
                            </div>

                            {documents.filter(d => d.type === 'Image').length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {documents.filter(d => d.type === 'Image').slice(0, 6).map((photo) => (
                                        <div key={photo.id} className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden relative group cursor-pointer shadow-inner">
                                            {photo.url ? (
                                                <>
                                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50">
                                                    <div className="p-3 bg-zinc-100 rounded-full mb-2">
                                                        <FileText size={20} />
                                                    </div>
                                                    <span className="text-xs font-medium">No Preview</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                    <p className="text-zinc-500 font-medium">No progress photos uploaded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Widgets */}
                    <div className="space-y-6">
                        {/* Documents */}
                        <div className="bg-white p-8 rounded-[2rem] border border-zinc-200/60 shadow-xl sticky top-24">
                            <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-zinc-100 rounded-xl text-zinc-600">
                                    <Download size={20} />
                                </div>
                                Documents
                            </h3>
                            <div className="space-y-4">
                                {documents.filter(d => d.type !== 'Image').length > 0 ? (
                                    documents.filter(d => d.type !== 'Image').map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl text-sm group cursor-pointer hover:bg-white hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-zinc-100 transition-all duration-300">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="hidden sm:flex p-2 bg-white rounded-xl border border-zinc-200 text-rose-500 shadow-sm">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="truncate">
                                                    <span className="block truncate text-zinc-700 group-hover:text-zinc-900 font-bold">{doc.name}</span>
                                                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{doc.date}</span>
                                                </div>
                                            </div>
                                            <a href={doc.url} download className="p-2 text-zinc-300 bg-white rounded-lg border border-zinc-100 group-hover:text-[#0f5c82] group-hover:border-[#0f5c82]/30 transition-colors">
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-zinc-500 text-sm italic text-center py-4">No public documents available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientPortalView;
