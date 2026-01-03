import React, { useState, useMemo } from 'react';
import {
    Search, Plus, Filter, Calendar, Users, MapPin,
    CheckSquare, Activity, Image as ImageIcon, ArrowRight, MoreVertical,
    LayoutGrid, List as ListIcon, Briefcase, Clock, Building, AlertTriangle, X, Trash2, Sparkles, TrendingUp, BrainCircuit, AlertCircle
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useProjects } from '@/contexts/ProjectContext';
import { Project, Page } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { AddProjectModal } from '@/components/AddProjectModal';
import { Can } from '@/components/Can';

interface ProjectsViewProps {
    onProjectSelect?: (projectId: string) => void;
    setPage?: (page: Page) => void;
    autoLaunch?: boolean;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ onProjectSelect, setPage, autoLaunch }) => {
    const { projects, addProject, updateProject, deleteProject, documents } = useProjects();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { canAddResource, currentTenant } = useTenant();
    const { joinRoom, lastMessage } = useWebSocket();

    // Real-time Updates
    React.useEffect(() => {
        joinRoom('all_projects');
    }, [joinRoom]);

    React.useEffect(() => {
        if (lastMessage && lastMessage.type === 'project_updated') {
            addToast(`Project updated: ${lastMessage.payload?.name || 'A project'}`, 'info');
        }
    }, [lastMessage, addToast]);

    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // Modal States
    const [editingProjectStatus, setEditingProjectStatus] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Auto-launch logic
    React.useEffect(() => {
        if (autoLaunch && setPage) {
            // In a real app, this might trigger a modal or specific route
        }
    }, [autoLaunch, setPage]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchQuery, filterStatus]);



    const getLatestPhotos = (projectId: string) => {
        return documents
            .filter(d => d.projectId === projectId && d.type === 'Image')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);
    };

    const getPhotoCount = (projectId: string) => {
        return documents.filter(d => d.projectId === projectId && d.type === 'Image').length;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700';
            case 'Planning': return 'bg-blue-100 text-blue-700';
            case 'Delayed': return 'bg-red-100 text-red-700';
            case 'Completed': return 'bg-gray-100 text-gray-700';
            default: return 'bg-zinc-100 text-zinc-600';
        }
    };

    const handleDelete = async () => {
        if (projectToDelete) {
            await deleteProject(projectToDelete.id);
            addToast(`Project "${projectToDelete.name}" deleted.`, 'success');
            setProjectToDelete(null);
        }
    };

    const handleSaveStatus = async () => {
        if (editingProjectStatus) {
            await updateProject(editingProjectStatus.id, {
                status: editingProjectStatus.status,
                health: editingProjectStatus.health,
                progress: editingProjectStatus.progress
            });
            addToast("Project status updated successfully", "success");
            setEditingProjectStatus(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-1">Projects Portfolio</h1>
                    <p className="text-zinc-500">Manage and monitor all active construction sites.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-zinc-100 p-1 rounded-lg flex border border-zinc-200">
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-[#0f5c82]' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#0f5c82]' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                    <Can permission="projects.create">
                        <button
                            onClick={() => {
                                if (!canAddResource('projects')) {
                                    addToast(`Project limit reached for ${currentTenant?.plan} plan.`, 'error');
                                    return;
                                }
                                setIsCreateModalOpen(true);
                            }}
                            disabled={!canAddResource('projects')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all ${canAddResource('projects')
                                ? 'bg-[#0f5c82] text-white hover:bg-[#0c4a6e]'
                                : 'bg-zinc-200 text-zinc-500 cursor-not-allowed opacity-70'
                                }`}
                        >
                            <Plus size={18} /> New Project
                        </button>
                    </Can>
                </div>
            </div>

            {!canAddResource('projects') && (
                <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3 text-orange-800 shadow-sm">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold">Project limit approaching</p>
                        <p className="text-xs">You&apos;ve reached your maximum of {currentTenant?.maxProjects || 5} projects. <button className="underline font-bold">Upgrade your plan</button> to add more.</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search projects by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg min-w-[160px]">
                        <Filter size={14} className="text-zinc-500" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent border-none text-sm text-zinc-700 font-medium focus:ring-0 cursor-pointer w-full outline-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Planning">Planning</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20">
                {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredProjects.map(project => {
                            const latestPhotos = getLatestPhotos(project.id);
                            const photoCount = getPhotoCount(project.id);

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => onProjectSelect && onProjectSelect(project.id)}
                                    className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-full relative"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 flex items-center justify-center">
                                                {project.image ? (
                                                    <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Briefcase size={20} className="text-zinc-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-zinc-900 leading-tight line-clamp-1 group-hover:text-[#0f5c82] transition-colors">{project.name}</h3>
                                                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                                    <MapPin size={10} /> {project.location}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <p className="text-sm text-zinc-600 line-clamp-2">{project.aiExecutiveSummary || project.description}</p>
                                        {project.timelineOptimizations && project.timelineOptimizations.length > 0 && (
                                            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg w-fit">
                                                <Sparkles size={12} />
                                                {project.timelineOptimizations.length} AI Optimizations Available
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                            <span>Progress</span>
                                            <span className="font-bold text-zinc-700">{project.progress}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${project.health === 'At Risk' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${project.progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-zinc-50">
                                        <div>
                                            <div className="text-[10px] text-zinc-400 uppercase font-bold">Manager</div>
                                            <div className="text-sm font-medium text-zinc-800 flex items-center gap-1.5 mt-0.5">
                                                <div className="w-5 h-5 bg-[#0f5c82] rounded-full text-white text-[8px] flex items-center justify-center">
                                                    {project.manager.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                {project.manager}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-400 uppercase font-bold">Timeline</div>
                                            <div className="text-sm font-medium text-zinc-800 flex items-center gap-1.5 mt-0.5">
                                                <Calendar size={12} className="text-zinc-400" /> {new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    {project.aiAnalysis && (
                                        <div className="mt-0 mb-4 px-3 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg flex items-start gap-2">
                                            <BrainCircuit size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-[10px] text-zinc-600 leading-snug"><span className="font-bold text-indigo-700">AI Insight:</span> {project.aiAnalysis}</p>
                                        </div>
                                    )}

                                    {/* Quick Action Buttons (Visible on Hover) */}
                                    <div className="absolute bottom-6 left-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onProjectSelect) onProjectSelect(project.id);
                                            }}
                                            className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[10px] font-bold rounded-lg transition-colors border border-zinc-200 flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <CheckSquare size={14} className="text-zinc-400" /> Tasks
                                        </button>
                                        <Can permission="projects.update">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingProjectStatus(project);
                                                }}
                                                className="flex-1 py-2.5 bg-white border border-zinc-200 hover:border-[#0f5c82] hover:text-[#0f5c82] text-zinc-600 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Activity size={14} /> Status
                                            </button>
                                        </Can>
                                        <Can permission="projects.delete">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProjectToDelete(project);
                                                }}
                                                className="flex-1 py-2.5 bg-white border border-zinc-200 hover:border-red-500 hover:text-red-600 text-zinc-600 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </Can>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Add New Project Card */}
                        <button
                            onClick={() => {
                                if (!canAddResource('projects')) {
                                    addToast(`Project limit reached.`, 'error');
                                    return;
                                }
                                setIsCreateModalOpen(true);
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all group min-h-[300px] ${canAddResource('projects')
                                ? 'border-zinc-200 text-zinc-400 hover:border-[#0f5c82] hover:text-[#0f5c82] hover:bg-blue-50/30'
                                : 'border-zinc-100 text-zinc-300 cursor-not-allowed'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${canAddResource('projects')
                                ? 'bg-zinc-50 group-hover:bg-white group-hover:shadow-md'
                                : 'bg-zinc-50/50'
                                }`}>
                                <Plus size={32} />
                            </div>
                            <h3 className="font-bold text-lg">Create New Project</h3>
                            <p className="text-sm opacity-70 mt-2 text-center max-w-xs">
                                {canAddResource('projects')
                                    ? "Launch a new project with AI assistance using Gemini 3 Pro."
                                    : `Project limit reached for your ${currentTenant?.plan} plan.`}
                            </p>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Project Name</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Manager</th>
                                    <th className="px-6 py-4 font-bold">Location</th>
                                    <th className="px-6 py-4 font-bold">Progress</th>
                                    <th className="px-6 py-4 font-bold">Budget</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredProjects.map(project => (
                                    <tr
                                        key={project.id}
                                        onClick={() => onProjectSelect && onProjectSelect(project.id)}
                                        className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-zinc-900 group-hover:text-[#0f5c82]">{project.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600">{project.manager}</td>
                                        <td className="px-6 py-4 text-zinc-600">{project.location}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${project.health === 'At Risk' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${project.progress}%` }} />
                                                </div>
                                                <span className="text-xs font-bold">{project.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 font-mono">£{project.budget.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProjectStatus(project);
                                                    }}
                                                    className="p-1.5 hover:bg-blue-100 rounded text-zinc-400 hover:text-[#0f5c82] transition-colors"
                                                >
                                                    <Activity size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProjectToDelete(project);
                                                    }}
                                                    className="p-1.5 hover:bg-red-100 rounded text-zinc-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Status Update Modal */}
            <Modal isOpen={!!editingProjectStatus} onClose={() => setEditingProjectStatus(null)} title="Update Project Status" size="sm">
                {editingProjectStatus && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Project Phase Status</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Planned', 'Active', 'On Hold', 'Completed'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setEditingProjectStatus({ ...editingProjectStatus, status: s as any })}
                                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${editingProjectStatus.status === s ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Health Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Good', 'At Risk', 'Critical'].map(h => (
                                    <button
                                        key={h}
                                        onClick={() => setEditingProjectStatus({ ...editingProjectStatus, health: h as any })}
                                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${editingProjectStatus.health === h
                                            ? (h === 'Good' ? 'bg-green-50 border-green-200 text-green-700' : h === 'At Risk' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-red-50 border-red-200 text-red-700')
                                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                            }`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Completion Progress</label>
                                <span className="text-xs font-bold text-[#0f5c82]">{editingProjectStatus.progress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={editingProjectStatus.progress}
                                onChange={(e) => setEditingProjectStatus({ ...editingProjectStatus, progress: parseInt(e.target.value) })}
                                className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#0f5c82]"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                            <button onClick={() => setEditingProjectStatus(null)} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:text-zinc-900">Cancel</button>
                            <button
                                onClick={handleSaveStatus}
                                className="px-6 py-2 bg-[#0f5c82] text-white text-sm font-bold rounded-xl hover:bg-[#0c4a6e] shadow-sm"
                            >
                                Save Updates
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} title="Delete Project" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-red-800 mb-1">Are you absolutely sure?</h4>
                            <p className="text-xs text-red-700 leading-relaxed">
                                This action cannot be undone. This will permanently delete <strong>{projectToDelete?.name}</strong> and remove all associated data, including tasks, documents, and logs.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-lg">Cancel</button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 shadow-sm"
                        >
                            Delete Project
                        </button>
                    </div>
                </div>
            </Modal>

            <AddProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

export default ProjectsView;
