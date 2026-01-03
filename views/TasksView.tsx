
import React, { useState, useMemo, useRef } from 'react';
import {
    Plus, Calendar, User, Briefcase, X, Link, AlertCircle, Search, Filter,
    ArrowUpDown, LayoutGrid, List as ListIcon, CheckCircle2, AlertTriangle,
    Lock, Sparkles, Loader2, MapPin, Navigation,
    ChevronsUp, ChevronUp, Minus, ChevronDown, Paperclip, FileText, Eye, Trash2, Download, Image as ImageIcon, Box, Upload, Link2, Ban, Edit3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { UserRole, Task, ProjectDocument } from '@/types';
import { Can } from '@/components/Can';
import { usePermissions } from '@/hooks/usePermissions';
import { Comments } from '@/components/Comments';
import { TaskCard } from '@/components/dashboard/TaskCard';

interface TasksViewProps {
    projectId?: string;
}

const TasksView: React.FC<TasksViewProps> = ({ projectId }) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { tasks, projects, documents, addTask, updateTask, updateDocument, addDocument } = useProjects();
    const { workforce } = useTenant();
    const { can } = usePermissions();
    const teamMembers = workforce; // Map for compatibility
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Document View Modal State
    const [viewingDocsTaskId, setViewingDocsTaskId] = useState<string | null>(null);
    // Document Linking Picker State
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [docPickerSearch, setDocPickerSearch] = useState('');

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isMatchingResource, setIsMatchingResource] = useState(false);
    const [aiReasoning, setAiReasoning] = useState('');
    const [resourceMatchingReasoning, setResourceMatchingReasoning] = useState('');
    const [aiSuggested, setAiSuggested] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<string>('All');
    const [filterAssignee, setFilterAssignee] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'assignee'>('dueDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Form State
    const [draftTaskId, setDraftTaskId] = useState<string>('');
    const taskFileInputRef = useRef<HTMLInputElement>(null);
    const [formState, setFormState] = useState({
        title: '',
        description: '',
        projectId: projectId || '',
        status: 'To Do' as 'To Do' | 'In Progress' | 'Done' | 'Blocked',
        priority: 'Medium' as 'High' | 'Medium' | 'Low' | 'Critical',
        assigneeType: 'user' as 'user' | 'role',
        assigneeName: '',
        assigneeRole: 'Operative',
        dueDate: '',
        dependencies: [] as string[],
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined
    });

    // --- Permissions Helpers ---
    const isManager = user && [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR].includes(user.role);

    const canEditDetails = useMemo(() => {
        if (!editingTask) return isManager; // Only managers create tasks
        return isManager; // Only managers edit core details
    }, [editingTask, isManager]);

    const canUpdateStatus = useMemo(() => {
        if (isManager) return true;
        if (!user || !editingTask) return false;

        // Check direct assignment
        if (editingTask.assigneeType === 'user' && editingTask.assigneeName === user.name) return true;

        // Check role assignment
        if (editingTask.assigneeType === 'role') {
            // Map 'Operative' to UserRole.OPERATIVE, etc.
            if (editingTask.assigneeName === 'Operative' && user.role === UserRole.OPERATIVE) return true;
            if (editingTask.assigneeName === 'Foreman' && user.role === UserRole.SUPERVISOR) return true;
            // Add more role mappings as needed
        }
        return false;
    }, [editingTask, user, isManager]);

    // --- Helpers ---

    const getProjectName = (id: string) => {
        return projects.find(p => p.id === id)?.name || 'Unknown Project';
    };

    // Enhanced Dependency Helper
    const getDependencyStatus = (depIds?: string[]) => {
        if (!depIds || depIds.length === 0) return { isBlocked: false, blockingTasks: [], totalDeps: 0, allDeps: [] };

        const deps = tasks.filter(t => depIds.includes(t.id));
        const blocking = deps.filter(d => d.status !== 'Done');

        return {
            isBlocked: blocking.length > 0,
            blockingTasks: blocking,
            allDeps: deps,
            totalDeps: deps.length
        };
    };

    // Helper to find tasks that are blocked BY this task
    const getBlockedByThisTask = (taskId: string) => {
        return tasks.filter(t => t.dependencies?.includes(taskId) && t.status !== 'Done');
    };

    const isTaskBlocked = (depIds?: string[]) => {
        return getDependencyStatus(depIds).isBlocked;
    };

    const getLinkedDocs = (taskId: string) => {
        return documents.filter(d => d.linkedTaskIds?.includes(taskId));
    };

    // --- Data Processing ---

    const priorityValue = (p: string) => {
        switch (p) {
            case 'Critical': return 4;
            case 'High': return 3;
            case 'Medium': return 2;
            case 'Low': return 1;
            default: return 0;
        }
    };

    const processedTasks = useMemo(() => {
        let result = [...tasks];

        if (projectId) {
            result = result.filter(t => t.projectId === projectId);
        }

        // --- RBAC Enforcement: Operatives see ONLY their tasks ---
        if (user?.role === UserRole.OPERATIVE) {
            result = result.filter(t =>
                (t.assigneeType === 'user' && t.assigneeName === user.name) ||
                (t.assigneeType === 'role' && t.assigneeName === 'Operative')
            );
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
            );
        }

        if (filterPriority !== 'All') {
            result = result.filter(t => t.priority === filterPriority);
        }

        if (filterAssignee !== 'All') {
            result = result.filter(t => t.assigneeName === filterAssignee);
        }

        result.sort((a, b) => {
            let diff = 0;
            if (sortBy === 'priority') {
                diff = priorityValue(a.priority) - priorityValue(b.priority);
            } else if (sortBy === 'dueDate') {
                diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            } else if (sortBy === 'assignee') {
                diff = (a.assigneeName || '').localeCompare(b.assigneeName || '');
            }
            return sortDirection === 'asc' ? diff : -diff;
        });

        return result;
    }, [tasks, searchQuery, filterPriority, filterAssignee, sortBy, sortDirection, projectId, user]);

    const columns = useMemo(() => {
        return [
            { title: 'To Do', items: processedTasks.filter(t => t.status === 'To Do') },
            { title: 'In Progress', items: processedTasks.filter(t => t.status === 'In Progress') },
            { title: 'Blocked', items: processedTasks.filter(t => t.status === 'Blocked') },
            { title: 'Done', items: processedTasks.filter(t => t.status === 'Done') }
        ];
    }, [processedTasks]);

    // --- Actions ---

    const openCreateModal = () => {
        setEditingTask(null);
        setAiReasoning('');
        setResourceMatchingReasoning('');
        setAiSuggested(false);
        const newId = `t-${Date.now()}`;
        setDraftTaskId(newId);
        setFormState({
            title: '',
            description: '',
            projectId: projectId || (projects[0]?.id || ''),
            status: 'To Do',
            priority: 'Medium',
            assigneeType: 'user',
            assigneeName: '',
            assigneeRole: 'Operative',
            dueDate: new Date().toISOString().split('T')[0],
            dependencies: [],
            latitude: undefined,
            longitude: undefined
        });
        setShowModal(true);
    };

    const openEditModal = React.useCallback((task: Task) => {
        // Permissions check handled here for initial opening
        // We allow opening for anyone involved to at least view/upload/update status
        // if they are assignee or manager.
        setEditingTask(task); // Set first to recalculate permissions

        // Temporary logic: Check permissions immediately after setting state won't work synchronously
        // So we calculate based on the task passed in.
        const isMgr = user && [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR].includes(user.role);
        const isAsgn = user && (
            (task.assigneeType === 'user' && task.assigneeName === user.name) ||
            (task.assigneeType === 'role' && task.assigneeName === 'Operative' && user.role === UserRole.OPERATIVE)
        );

        if (!isMgr && !isAsgn) {
            addToast("You do not have permission to edit this task.", 'warning');
            setEditingTask(null);
            return;
        }

        setDraftTaskId(task.id);
        setAiReasoning('');
        setResourceMatchingReasoning('');
        setAiSuggested(false);
        setFormState({
            title: task.title,
            description: task.description || '',
            projectId: task.projectId,
            status: task.status,
            priority: task.priority,
            assigneeType: task.assigneeType,
            assigneeName: task.assigneeType === 'user' ? (task.assigneeName || '') : '',
            assigneeRole: task.assigneeType === 'role' ? (task.assigneeName || 'Operative') : 'Operative',
            dueDate: task.dueDate,
            dependencies: task.dependencies || [],
            latitude: task.latitude,
            longitude: task.longitude
        });
        setShowModal(true);
    }, [user, addToast]);

    const handleSave = () => {
        if (!formState.title || !formState.projectId) return;

        const finalAssigneeName = formState.assigneeType === 'user'
            ? (formState.assigneeName || 'Unassigned')
            : formState.assigneeRole;

        let finalStatus = formState.status;
        if (isTaskBlocked(formState.dependencies) && finalStatus !== 'Done') {
            finalStatus = 'Blocked';
        } else if (!isTaskBlocked(formState.dependencies) && finalStatus === 'Blocked') {
            finalStatus = 'To Do';
        }

        if (editingTask) {
            updateTask(editingTask.id, {
                title: formState.title,
                description: formState.description,
                projectId: formState.projectId,
                status: finalStatus,
                priority: formState.priority,
                assigneeType: formState.assigneeType,
                assigneeName: finalAssigneeName,
                dueDate: formState.dueDate,
                dependencies: formState.dependencies,
                latitude: formState.latitude,
                longitude: formState.longitude
            });
        } else {
            const newTask: Task = {
                id: draftTaskId,
                title: formState.title,
                description: formState.description,
                projectId: formState.projectId,
                status: finalStatus,
                priority: formState.priority,
                assigneeType: formState.assigneeType,
                assigneeName: finalAssigneeName,
                dueDate: formState.dueDate || 'No Date',
                dependencies: formState.dependencies,
                latitude: formState.latitude,
                longitude: formState.longitude
            };
            addTask(newTask);
        }
        setShowModal(false);
    };

    const handleLinkDocument = (docId: string) => {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        const currentLinks = doc.linkedTaskIds || [];
        // Toggle link
        const newLinks = currentLinks.includes(draftTaskId)
            ? currentLinks.filter(id => id !== draftTaskId)
            : [...currentLinks, draftTaskId];
        updateDocument(docId, { linkedTaskIds: newLinks });
    };

    const handleTaskFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newDoc: ProjectDocument = {
                    id: `doc-task-${Date.now()}`,
                    name: file.name,
                    type: file.type.includes('image') ? 'Image' : 'Document',
                    projectId: formState.projectId || projectId || projects[0]?.id || '',
                    projectName: getProjectName(formState.projectId || projectId || projects[0]?.id || ''),
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    date: new Date().toLocaleDateString(),
                    status: 'Approved',
                    url: reader.result as string,
                    linkedTaskIds: [draftTaskId],
                    currentVersion: 1
                };
                addDocument(newDoc);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            addToast("Geolocation is not supported by your browser", 'warning');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormState(prev => ({
                    ...prev,
                    latitude: parseFloat(position.coords.latitude.toFixed(6)),
                    longitude: parseFloat(position.coords.longitude.toFixed(6))
                }));
            },
            (error) => {
                console.error("Error obtaining location", error);
                addToast("Unable to retrieve your location", 'error');
            }
        );
    };

    const handleAIAnalyze = async () => {
        if (!formState.title) return;
        setIsAnalyzing(true);
        setAiReasoning('');
        setAiSuggested(false);

        try {
            const prompt = `
        Act as a Senior Construction Manager. Analyze this task for the project "${getProjectName(formState.projectId)}".

        Task Title: "${formState.title}"
        Description: "${formState.description || 'N/A'}"

        Determine the optimal Priority Level based on safety risks, critical path impact, and urgency.
        Estimate a realistic duration in days for this specific task.

        Return ONLY raw JSON:
        {
            "priority": "Critical" | "High" | "Medium" | "Low",
            "duration": number (estimated days, e.g. 2),
            "reasoning": "Concise explanation focusing on why this priority was assigned."
        }
        `;

            const res = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                responseMimeType: 'application/json',
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 2048 }
            });

            const data = parseAIJSON(res);

            setFormState(prev => {
                const durationDays = typeof data.duration === 'number' ? data.duration : 1;

                // Always calculate new due date from today for suggestions
                const newDueDate = new Date();
                newDueDate.setDate(newDueDate.getDate() + durationDays);

                return {
                    ...prev,
                    priority: data.priority || prev.priority,
                    // Apply suggested duration to due date immediately
                    dueDate: newDueDate.toISOString().split('T')[0]
                };
            });
            setAiReasoning(data.reasoning);
            setAiSuggested(true);
        } catch (e) {
            console.error("AI Analysis failed", e);
            setAiReasoning("Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSuggestResource = async () => {
        if (!formState.title) return;
        setIsMatchingResource(true);
        setResourceMatchingReasoning('');

        try {
            const prompt = `
        Act as a HR & Resource Manager for a construction company.
        Find the best candidate for this task.

        Task: "${formState.title}"
        Description: "${formState.description || 'N/A'}"
        Project: "${getProjectName(formState.projectId)}"

        Available Team Members:
        ${teamMembers.map(m => `- ${m.name} (Role: ${m.role}, Skills: ${m.skills?.join(', ') || 'N/A'}, Status: ${m.status})`).join('\n')}

        Select the most qualified person based on their skills matching the task requirements.
        If no direct skill match, pick based on Role.
        Prefer 'On Site' members.

        Return ONLY raw JSON:
        {
            "suggestedName": "Full Name",
            "reasoning": "Concise explanation of why this person fits the task."
        }
        `;

            const res = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                responseMimeType: 'application/json',
                temperature: 0.2
            });

            const data = parseAIJSON(res);
            if (data.suggestedName) {
                setFormState(prev => ({
                    ...prev,
                    assigneeType: 'user',
                    assigneeName: data.suggestedName
                }));
                setResourceMatchingReasoning(data.reasoning);
            }
        } catch (e) {
            console.error("Resource suggestion failed", e);
            setResourceMatchingReasoning("Matching failed. Please try again.");
        } finally {
            setIsMatchingResource(false);
        }
    };

    // --- Styling Helpers ---

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Low': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-zinc-100 text-zinc-600';
        }
    };

    const getPriorityBorder = (p: string) => {
        switch (p) {
            case 'Critical': return 'border-l-red-500';
            case 'High': return 'border-l-orange-500';
            case 'Medium': return 'border-l-blue-500';
            case 'Low': return 'border-l-green-500';
            default: return 'border-l-zinc-200';
        }
    };

    const getPriorityIcon = (p: string) => {
        switch (p) {
            case 'Critical': return <ChevronsUp size={12} strokeWidth={2.5} />;
            case 'High': return <ChevronUp size={12} strokeWidth={2.5} />;
            case 'Medium': return <Minus size={12} strokeWidth={2.5} />;
            case 'Low': return <ChevronDown size={12} strokeWidth={2.5} />;
            default: return <Minus size={12} />;
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'Done': return 'bg-green-100 text-green-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Blocked': return 'bg-red-100 text-red-700';
            case 'To Do': return 'bg-zinc-100 text-zinc-600';
            default: return 'bg-zinc-100 text-zinc-600';
        }
    };

    const canManageTask = user && [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN, UserRole.SUPERVISOR].includes(user.role);

    const assigneeOptions = useMemo(() => {
        const names = new Set(tasks.map(t => t.assigneeName).filter(Boolean));
        teamMembers.forEach(m => names.add(m.name));
        return Array.from(names).sort();
    }, [tasks, teamMembers]);

    // Get Linked Docs for current editing task (or draft ID)
    const linkedDocs = getLinkedDocs(draftTaskId);

    // Filter docs for picker
    const pickerDocs = documents.filter(d =>
        d.projectId === formState.projectId &&
        d.name.toLowerCase().includes(docPickerSearch.toLowerCase())
    );

    return (
        <div className="p-8 max-w-full mx-auto h-full flex flex-col relative bg-zinc-50">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-1">{projectId ? 'Project Tasks' : 'Global Tasks Board'}</h1>
                    <p className="text-zinc-500">Manage dependencies, track progress, and assign work.</p>
                </div>

                <Can permission="tasks.create">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-[#0f5c82] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0c4a6e] shadow-sm transition-colors"
                    >
                        <Plus size={18} /> New Task
                    </button>
                </Can>
            </div>

            {/* Controls & Filters */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-6 flex flex-col xl:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full xl:w-auto overflow-x-auto">
                    {/* Priority Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg min-w-[140px]">
                        <Filter size={14} className="text-zinc-500" />
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="bg-transparent border-none text-sm text-zinc-700 font-medium focus:ring-0 cursor-pointer w-full"
                        >
                            <option value="All">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    {/* Assignee Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg min-w-[160px]">
                        <User size={14} className="text-zinc-500" />
                        <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="bg-transparent border-none text-sm text-zinc-700 font-medium focus:ring-0 cursor-pointer w-full"
                        >
                            <option value="All">All Assignees</option>
                            {assigneeOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sorting */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg min-w-[160px]">
                        <ArrowUpDown size={14} className="text-zinc-500" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent border-none text-sm text-zinc-700 font-medium focus:ring-0 cursor-pointer w-full"
                        >
                            <option value="dueDate">Due Date</option>
                            <option value="priority">Priority</option>
                            <option value="assignee">Assignee</option>
                        </select>
                        <button
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1 hover:bg-zinc-200 rounded text-xs font-bold min-w-[24px]"
                        >
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-zinc-200 mx-1 hidden md:block" />

                    <div className="bg-zinc-100 p-1 rounded-lg flex border border-zinc-200 flex-shrink-0">
                        <button
                            onClick={() => setViewMode('KANBAN')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'KANBAN' ? 'bg-white shadow-sm text-[#0f5c82]' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#0f5c82]' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'KANBAN' ? (
                    <div className="flex gap-6 min-w-full overflow-x-auto h-full pb-4">
                        {columns.map((col, idx) => (
                            <div key={idx} className="flex-shrink-0 w-80 flex flex-col bg-zinc-100/50 rounded-xl border border-zinc-200 h-full">
                                <div className="p-3 flex justify-between items-center border-b border-zinc-100 bg-zinc-50 rounded-t-xl">
                                    <h3 className="font-bold text-zinc-700 text-sm">{col.title}</h3>
                                    <span className="bg-white border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full text-xs font-bold">{col.items.length}</span>
                                </div>
                                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {col.items.map((item, i) => {
                                        const depStatus = getDependencyStatus(item.dependencies);
                                        const linkedDocs = getLinkedDocs(item.id);
                                        const blockedByThis = getBlockedByThisTask(item.id);

                                        return (
                                            <TaskCard
                                                key={item.id}
                                                task={item}
                                                projectName={getProjectName(item.projectId)}
                                                dependencyStatus={depStatus}
                                                linkedDocs={linkedDocs}
                                                blockedByThis={blockedByThis}
                                                onSelect={openEditModal}
                                            />
                                        )
                                    })}
                                    {col.items.length === 0 && (
                                        <div className="text-center text-zinc-400 text-xs py-8 italic border-2 border-dashed border-zinc-200 rounded-lg m-2">
                                            Empty
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Task Title</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                        <th className="px-6 py-4 font-bold">Priority</th>
                                        <th className="px-6 py-4 font-bold">Assignee</th>
                                        <th className="px-6 py-4 font-bold">Project</th>
                                        <th className="px-6 py-4 font-bold">Due Date</th>
                                        <th className="px-6 py-4 font-bold">Docs</th>
                                        <th className="px-6 py-4 font-bold text-right">Deps</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {processedTasks.map((task) => {
                                        const depStatus = getDependencyStatus(task.dependencies);
                                        const linkedDocs = getLinkedDocs(task.id);
                                        const blockedByThis = getBlockedByThisTask(task.id);
                                        const isBlocking = blockedByThis.length > 0;

                                        return (
                                            <tr key={task.id} onClick={() => openEditModal(task)} className="hover:bg-zinc-50 transition-colors cursor-pointer group">
                                                <td className="px-6 py-4 font-medium text-zinc-900 group-hover:text-[#0f5c82]">
                                                    <div className="flex items-center gap-2">
                                                        {task.title}
                                                        {depStatus.isBlocked && task.status !== 'Done' && (
                                                            <span className="ml-2 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-bold flex items-center gap-1 inline-flex" title={`Blocked by: ${depStatus.blockingTasks.map(t => t.title).join(', ')}`}>
                                                                <Lock size={10} /> BLOCKED
                                                            </span>
                                                        )}
                                                        {isBlocking && (
                                                            <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-bold flex items-center gap-1 inline-flex" title={`Blocks: ${blockedByThis.map(t => t.title).join(', ')}`}>
                                                                <AlertTriangle size={10} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 w-fit ${getPriorityColor(task.priority)}`}>
                                                        {getPriorityIcon(task.priority)}
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-zinc-400" />
                                                        {task.assigneeName || 'Unassigned'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 text-xs">{getProjectName(task.projectId)}</td>
                                                <td className={`px-6 py-4 font-mono text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600 font-bold' : 'text-zinc-600'}`}>
                                                    {task.dueDate}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {linkedDocs.length > 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewingDocsTaskId(task.id); }}
                                                            className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Paperclip size={10} /> {linkedDocs.length}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {task.dependencies && task.dependencies.length > 0 ? (
                                                        <div className="relative group/listdep inline-block">
                                                            <span
                                                                className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 justify-end cursor-help border ${depStatus.isBlocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}
                                                                title={depStatus.isBlocked ? `Blocked by: ${depStatus.blockingTasks.map(t => t.title).join(', ')}` : `Depends on: ${depStatus.allDeps.map(t => t.title).join(', ')}`}
                                                            >
                                                                <Link2 size={12} /> {depStatus.totalDeps}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-zinc-300">-</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {processedTasks.length === 0 && (
                                <div className="p-12 text-center text-zinc-400 italic">No tasks found matching your filters.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Linked Documents Modal - Enhanced Quick View */}
            {viewingDocsTaskId && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-200 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                            <div>
                                <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                                    <Paperclip size={20} className="text-[#0f5c82]" /> Linked Documents
                                </h3>
                                <p className="text-xs text-zinc-500">Attachments for task: <span className="font-medium text-zinc-800">{processedTasks.find(t => t.id === viewingDocsTaskId)?.title}</span></p>
                            </div>
                            <button onClick={() => setViewingDocsTaskId(null)} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500"><X size={20} /></button>
                        </div>

                        <div className="p-4 overflow-y-auto bg-zinc-50/50 flex-1">
                            {getLinkedDocs(viewingDocsTaskId).length > 0 ? (
                                <div className="space-y-3">
                                    {getLinkedDocs(viewingDocsTaskId).map(doc => (
                                        <div key={doc.id} className="flex items-start gap-4 p-3 bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0 flex items-center justify-center">
                                                {doc.type === 'Image' && doc.url ? (
                                                    <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText size={24} className={doc.type === 'CAD' ? 'text-blue-500' : 'text-orange-500'} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-zinc-900 truncate mb-1">{doc.name}</div>
                                                <div className="text-xs text-zinc-500 mb-2">{doc.type} • {doc.size} • {doc.date}</div>
                                                <div className="flex gap-2">
                                                    <button className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 transition-colors">
                                                        <Eye size={12} /> Preview
                                                    </button>
                                                    <button className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded hover:bg-zinc-200 flex items-center gap-1 transition-colors">
                                                        <Download size={12} /> Download
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-zinc-400 text-sm flex flex-col items-center justify-center h-full">
                                    <Paperclip size={32} className="mb-2 opacity-20" />
                                    No documents linked to this task.
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
                            <button onClick={() => setViewingDocsTaskId(null)} className="px-6 py-2 bg-[#0f5c82] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a6e]">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Modal (Create/Edit) */}
            {showModal && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 flex flex-col max-h-[90vh] border border-zinc-200">
                        <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-4">
                            <h2 className="text-lg font-bold text-zinc-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                            {/* Role/Access Notice */}
                            {!canEditDetails && canUpdateStatus && (
                                <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium border border-blue-100 flex items-center gap-2">
                                    <Edit3 size={12} /> You can update status and upload files.
                                </div>
                            )}

                            {/* Main Fields */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Task Title</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formState.title}
                                        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                        className="flex-1 p-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none placeholder-zinc-400 font-medium transition-colors disabled:bg-zinc-100 disabled:text-zinc-500"
                                        placeholder="Enter task name..."
                                        autoFocus
                                        disabled={!canEditDetails}
                                    />
                                    {canEditDetails && (
                                        <button
                                            onClick={handleAIAnalyze}
                                            disabled={isAnalyzing || !formState.title}
                                            className={`px-3 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 font-bold text-xs flex items-center gap-2 transition-all ${isAnalyzing || !formState.title ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-100 shadow-sm'}`}
                                            title="AI Analysis (Gemini 3 Pro)"
                                        >
                                            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            Suggest
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Description</label>
                                <textarea
                                    value={formState.description}
                                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                                    className="w-full p-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none resize-none h-24 placeholder-zinc-400 leading-relaxed transition-colors disabled:bg-zinc-100 disabled:text-zinc-500"
                                    placeholder="Describe the work to be done..."
                                    disabled={!canEditDetails}
                                />
                            </div>

                            {/* Documents & Photos Section - Accessible to Assignee */}
                            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <Paperclip size={12} /> Documents & Photos
                                    </label>
                                    <div className="flex gap-2">
                                        <input type="file" ref={taskFileInputRef} className="hidden" onChange={handleTaskFileUpload} accept="image/*,application/pdf" />
                                        {(canEditDetails || canUpdateStatus) && (
                                            <button
                                                onClick={() => taskFileInputRef.current?.click()}
                                                className="text-[10px] font-bold text-white bg-[#0f5c82] hover:bg-[#0c4a6e] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Upload size={12} /> Upload File / Photo
                                            </button>
                                        )}
                                        {canEditDetails && (
                                            <button
                                                onClick={() => { setDocPickerSearch(''); setShowDocPicker(!showDocPicker); }}
                                                className="text-[10px] font-bold text-zinc-600 bg-white hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-zinc-200"
                                            >
                                                <Link size={12} /> Link Existing
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Active Picker */}
                                {showDocPicker && canEditDetails && (
                                    <div className="mb-3 bg-white border border-blue-200 rounded-lg p-2 shadow-sm animate-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            placeholder="Search project docs..."
                                            className="w-full p-2 text-xs border border-zinc-200 rounded-md mb-2 focus:ring-1 focus:ring-[#0f5c82] outline-none"
                                            value={docPickerSearch}
                                            onChange={e => setDocPickerSearch(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                            {pickerDocs.map(doc => {
                                                const isLinked = linkedDocs.some(d => d.id === doc.id);
                                                return (
                                                    <div key={doc.id} onClick={() => handleLinkDocument(doc.id)} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${isLinked ? 'bg-blue-50 text-blue-700' : 'hover:bg-zinc-50 text-zinc-700'}`}>
                                                        <div className={`w-3 h-3 border rounded flex items-center justify-center ${isLinked ? 'bg-blue-500 border-blue-500' : 'border-zinc-300'}`}>
                                                            {isLinked && <CheckCircle2 size={10} className="text-white" />}
                                                        </div>
                                                        <span className="truncate flex-1">{doc.name}</span>
                                                    </div>
                                                )
                                            })}
                                            {pickerDocs.length === 0 && <div className="text-xs text-zinc-400 text-center py-2">No docs found.</div>}
                                        </div>
                                    </div>
                                )}

                                {/* List of Linked Docs */}
                                <div className="space-y-2">
                                    {linkedDocs.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group hover:border-blue-300 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center flex-shrink-0">
                                                    {doc.type === 'Image' ? <ImageIcon size={14} className="text-purple-500" /> : <FileText size={14} className="text-blue-500" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-medium text-zinc-800 truncate">{doc.name}</div>
                                                    <div className="text-[9px] text-zinc-400">{doc.type} • {doc.size}</div>
                                                </div>
                                            </div>
                                            {canEditDetails && (
                                                <button
                                                    onClick={() => handleLinkDocument(doc.id)}
                                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Unlink"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {linkedDocs.length === 0 && !showDocPicker && (
                                        <div className="text-center py-4 text-xs text-zinc-400 italic border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                                            No drawings or photos attached.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Project</label>
                                <select
                                    value={formState.projectId}
                                    onChange={(e) => setFormState({ ...formState, projectId: e.target.value, dependencies: [] })}
                                    className="w-full p-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100 disabled:text-zinc-500"
                                    disabled={!canEditDetails || !!projectId}
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Location (GPS)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            placeholder="Latitude"
                                            value={formState.latitude || ''}
                                            onChange={(e) => setFormState({ ...formState, latitude: parseFloat(e.target.value) })}
                                            className="w-full p-2.5 pl-8 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                            disabled={!canEditDetails}
                                        />
                                        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    </div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            placeholder="Longitude"
                                            value={formState.longitude || ''}
                                            onChange={(e) => setFormState({ ...formState, longitude: parseFloat(e.target.value) })}
                                            className="w-full p-2.5 pl-8 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                            disabled={!canEditDetails}
                                        />
                                        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    </div>
                                    {canEditDetails && (
                                        <button
                                            onClick={handleGetLocation}
                                            className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors"
                                            title="Get Current Location"
                                        >
                                            <Navigation size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {aiReasoning && (
                                <div className="bg-[#faf5ff] border border-purple-100 rounded-xl p-4 animate-in fade-in mt-4">
                                    <div className="flex items-center gap-2 mb-2 font-bold text-purple-700 uppercase text-[10px] tracking-wider">
                                        <Sparkles size={14} /> Gemini Reasoning
                                    </div>
                                    <p className="leading-relaxed text-sm text-purple-900/80">{aiReasoning}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Status</label>
                                    <select
                                        value={formState.status}
                                        onChange={(e) => setFormState({ ...formState, status: e.target.value as any })}
                                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                        disabled={!canUpdateStatus}
                                    >
                                        <option value="To Do">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                        <option value="Blocked">Blocked</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block flex justify-between">
                                        Priority
                                        {aiSuggested && <span className="text-purple-600 flex items-center gap-1 text-[10px]"><Sparkles size={10} /> AI Recommended</span>}
                                    </label>
                                    <select
                                        value={formState.priority}
                                        onChange={(e) => { setFormState({ ...formState, priority: e.target.value as any }); setAiSuggested(false); }}
                                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                        disabled={!canEditDetails}
                                    >
                                        <option value="Critical">Critical</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={formState.dueDate}
                                        onChange={(e) => setFormState({ ...formState, dueDate: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                        disabled={!canEditDetails}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Assignment</label>
                                {canEditDetails && (
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => setFormState({ ...formState, assigneeType: 'user' })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${formState.assigneeType === 'user' ? 'bg-[#0f5c82] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                                        >
                                            <User size={14} /> User
                                        </button>
                                        <button
                                            onClick={() => setFormState({ ...formState, assigneeType: 'role' })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${formState.assigneeType === 'role' ? 'bg-[#0f5c82] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                                        >
                                            <Briefcase size={14} /> Role
                                        </button>
                                    </div>
                                )}

                                {formState.assigneeType === 'role' ? (
                                    <select
                                        value={formState.assigneeRole}
                                        onChange={(e) => setFormState({ ...formState, assigneeRole: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                        disabled={!canEditDetails}
                                    >
                                        <option value="Operative">Operative</option>
                                        <option value="Foreman">Foreman</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Safety Officer">Safety Officer</option>
                                    </select>
                                ) : (
                                    <select
                                        value={formState.assigneeName}
                                        onChange={(e) => setFormState({ ...formState, assigneeName: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-[#0f5c82] outline-none transition-colors disabled:bg-zinc-100"
                                        disabled={!canEditDetails}
                                    >
                                        <option value="">Unassigned</option>
                                        {assigneeOptions.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                )}

                                {canEditDetails && (
                                    <button
                                        onClick={handleSuggestResource}
                                        disabled={isMatchingResource || !formState.title}
                                        className={`mt-2 w-full py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-xs flex items-center justify-center gap-2 transition-all ${isMatchingResource || !formState.title ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100 shadow-sm'}`}
                                    >
                                        {isMatchingResource ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        AI Match Resource
                                    </button>
                                )}

                                {resourceMatchingReasoning && (
                                    <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 leading-relaxed italic">
                                        <div className="font-bold flex items-center gap-1 mb-1 not-italic"><Sparkles size={12} /> Matching Logic:</div>
                                        {resourceMatchingReasoning}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Comments Section */}
                        {editingTask && (
                            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 overflow-y-auto max-h-96">
                                <Comments entityType="task" entityId={editingTask.id} />
                            </div>
                        )}

                        <div className="p-4 border-t border-zinc-100 bg-white flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors font-medium text-sm">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] transition-colors shadow-md text-sm">
                                {editingTask ? 'Save Changes' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksView;
