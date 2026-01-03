
import React, { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon, Filter, Plus, ChevronRight, ChevronDown,
    MoreHorizontal, Zap, Flag, ArrowRight, Search,
    LayoutGrid, List, Clock, User, AlertCircle, CheckCircle2, Loader2, Paperclip,
    ChevronLeft
} from 'lucide-react';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { useProjects } from '@/contexts/ProjectContext';

interface ScheduleViewProps {
    projectId?: string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ projectId }) => {
    const { tasks, documents, projects, addTask, updateTask, getCriticalPath } = useProjects();
    const [viewMode, setViewMode] = useState<'GANTT' | 'LIST' | 'CALENDAR'>('GANTT');
    const [showAIOptimizer, setShowAIOptimizer] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<any>(null);
    const [criticalPathIds, setCriticalPathIds] = useState<Set<string>>(new Set());
    const [analyzingCPM, setAnalyzingCPM] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        assigneeName: '',
        status: 'To Do',
        priority: 'Medium',
        startDate: new Date().toISOString().split('T')[0],
        duration: 5,
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        projectId: projectId || '',
        progress: 0,
        color: '#3b82f6'
    });

    const handleSaveTask = async () => {
        if (!taskForm.title) return;

        const taskData = {
            ...taskForm,
            id: editingTask?.id || `t-${Date.now()}`,
            assigneeType: 'user' as const,
            projectId: taskForm.projectId || projectId || 'p1',
            dependencies: editingTask?.dependencies || [],
            progress: taskForm.progress || 0,
            color: taskForm.color || '#3b82f6'
        } as any;

        if (editingTask) {
            await updateTask(editingTask.id, taskData);
        } else {
            await addTask(taskData);
        }
        setShowTaskModal(false);
        setEditingTask(null);
    };

    // Helper to check docs
    const hasLinkedDocs = (taskId: string) => {
        return documents.some(d => d.linkedTaskIds?.includes(taskId));
    };

    // Base tasks filtered by project
    const currentProject = useMemo(() => {
        return projects.find(p => p.id === projectId);
    }, [projects, projectId]);

    const projectTasks = useMemo(() => {
        return projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
    }, [tasks, projectId]);

    // Filter tasks for Gantt/List visualization
    const filteredTasks = useMemo(() => {
        if (projectTasks.length > 0) {
            const projectStart = currentProject?.startDate ? new Date(currentProject.startDate) : new Date();

            return projectTasks.map((t) => {
                const taskStart = t.startDate ? new Date(t.startDate) : new Date(t.dueDate);
                const diffTime = taskStart.getTime() - projectStart.getTime();
                const startDay = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

                return {
                    id: t.id,
                    name: t.title,
                    start: startDay,
                    duration: t.duration || 1,
                    progress: t.progress || (t.status === 'Done' ? 100 : t.status === 'In Progress' ? 50 : 0),
                    type: 'construction',
                    dependencies: t.dependencies || [],
                    assignee: t.assigneeName || 'Unassigned',
                    status: t.status,
                    priority: t.priority,
                    hasDocs: hasLinkedDocs(t.id),
                    dueDate: t.dueDate,
                    startDate: t.startDate,
                    color: t.color || '#0f5c82'
                };
            }).sort((a, b) => a.start - b.start);
        }
        return [];
    }, [projectTasks, documents, currentProject]);

    const runOptimizer = async () => {
        setOptimizing(true);
        try {
            const tasksStr = JSON.stringify(filteredTasks.map(t => ({ name: t.name, start: t.start, duration: t.duration, dependencies: t.dependencies })));
            const prompt = `
            Analyze this construction schedule tasks: ${tasksStr}.
            Identify critical path risks and potential optimizations.
            Assume current weather forecast predicts heavy rain on day 12-14.
            Return JSON:
            {
                "riskLevel": "High" | "Medium" | "Low",
                "riskAnalysis": "Concise summary of risks.",
                "recommendations": [
                    { "title": "Action Title", "desc": "What to do" }
                ]
            }
          `;

            const result = await runRawPrompt(prompt, {
                model: 'gemini-3-pro-preview',
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 1024 }
            });

            setOptimizationResult(parseAIJSON(result));
        } catch (e) {
            console.error("Optimization failed", e);
        } finally {
            setOptimizing(false);
        }
    };

    const runCPMAnalysis = async () => {
        if (!projectId) return;
        setAnalyzingCPM(true);
        try {
            const result = await getCriticalPath(projectId);
            const criticalIds = new Set(result.filter((t: any) => t.isCritical).map((t: any) => t.id));
            setCriticalPathIds(criticalIds);
        } catch (e) {
            console.error("CPM analysis failed", e);
        } finally {
            setAnalyzingCPM(false);
        }
    };

    // --- Calendar Logic ---
    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(newDate);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days: daysInMonth, firstDay: startDayOffset } = getDaysInMonth(currentDate);
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startDayOffset }, (_, i) => i);

    // Calculate Trailing Days to fill grid
    const totalSlots = startDayOffset + daysInMonth;
    const totalRows = Math.ceil(totalSlots / 7);
    const neededSlots = totalRows * 7;
    const trailingEmptyDays = Array.from({ length: neededSlots - totalSlots }, (_, i) => i);

    // Get tasks for a specific day
    const getTasksForDay = (day: number) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        // Note: This compares local date string with stored date string.
        // For robustness in real app, handle timezones. Here we assume YYYY-MM-DD consistency.
        // Using formatted string comparison to avoid timezone shift issues with simple Date objects
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const targetDate = `${year}-${month}-${dayStr}`;

        return projectTasks.filter(t => t.dueDate === targetDate);
    };

    // Constants for Gantt rendering
    const dayWidth = 40;
    const rowHeight = 48;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': case 'Done': return 'bg-green-100 text-green-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Pending': case 'To Do': return 'bg-zinc-100 text-zinc-600';
            case 'Blocked': return 'bg-red-100 text-red-700';
            default: return 'bg-zinc-100 text-zinc-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'text-red-600 bg-red-50 border-red-100';
            case 'High': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header Toolbar */}
            <div className="h-16 border-b border-zinc-200 px-6 flex items-center justify-between bg-white flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                        <CalendarIcon className="text-[#0f5c82]" /> {projectId ? 'Project Schedule' : 'Master Schedule'}
                    </h1>
                    <div className="h-6 w-px bg-zinc-200" />

                    {/* View Mode Toggle */}
                    <div className="flex bg-zinc-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('GANTT')}
                            className={`p-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'GANTT' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <LayoutGrid size={14} /> Gantt
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'LIST' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <List size={14} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('CALENDAR')}
                            className={`p-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'CALENDAR' ? 'bg-white text-[#0f5c82] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <CalendarIcon size={14} /> Calendar
                        </button>
                    </div>

                    {/* Calendar Controls */}
                    {viewMode === 'CALENDAR' && (
                        <div className="flex items-center gap-2 ml-4 animate-in fade-in slide-in-from-left-2">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-bold text-zinc-800 w-32 text-center">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500">
                                <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="ml-2 text-xs font-medium text-[#0f5c82] hover:underline"
                            >
                                Today
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setShowAIOptimizer(!showAIOptimizer); if (!optimizationResult) runOptimizer(); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${showAIOptimizer
                            ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-inner'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            }`}
                    >
                        <Zap size={16} className={showAIOptimizer ? 'fill-purple-700' : ''} /> AI Optimizer
                    </button>
                    <button
                        onClick={runCPMAnalysis}
                        disabled={analyzingCPM || !projectId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${criticalPathIds.size > 0
                            ? 'bg-red-50 border-red-200 text-red-700 shadow-inner'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            }`}
                    >
                        {analyzingCPM ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                        {criticalPathIds.size > 0 ? 'Critical Path Active' : 'Analyze Critical Path'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setTaskForm({
                                title: '',
                                assigneeName: '',
                                status: 'To Do',
                                priority: 'Medium',
                                startDate: new Date().toISOString().split('T')[0],
                                duration: 5,
                                dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                                projectId: projectId || 'p1',
                                progress: 0,
                                color: '#3b82f6'
                            });
                            setShowTaskModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-[#0f5c82] text-white rounded-lg text-sm font-medium hover:bg-[#0c4a6e] shadow-sm"
                    >
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}

                {/* --- CALENDAR VIEW --- */}
                {viewMode === 'CALENDAR' && (
                    <div className="flex-1 overflow-y-auto bg-zinc-50 p-6">
                        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="py-3 text-center text-xs font-bold text-zinc-400 uppercase">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 auto-rows-fr bg-zinc-200 gap-px border-b border-zinc-200">
                                {emptyDays.map(d => (
                                    <div key={`empty-${d}`} className="bg-zinc-50/30 min-h-[120px]" />
                                ))}

                                {calendarDays.map(day => {
                                    const dayTasks = getTasksForDay(day);
                                    const isToday =
                                        day === new Date().getDate() &&
                                        currentDate.getMonth() === new Date().getMonth() &&
                                        currentDate.getFullYear() === new Date().getFullYear();

                                    return (
                                        <div key={day} className={`bg-white min-h-[120px] p-2 hover:bg-blue-50/20 transition-colors relative group ${isToday ? 'bg-blue-50/30' : ''}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#0f5c82] text-white' : 'text-zinc-700'}`}>
                                                    {day}
                                                </span>
                                                {dayTasks.length > 0 && (
                                                    <span className="text-[10px] text-zinc-400 font-medium">{dayTasks.length} tasks</span>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                {dayTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`text-[10px] px-2 py-1 rounded border truncate cursor-pointer shadow-sm hover:shadow-md transition-all ${task.status === 'Done' ? 'bg-green-50 text-green-700 border-green-100' :
                                                            task.status === 'Blocked' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                task.priority === 'Critical' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                    'bg-white text-zinc-700 border-zinc-200'
                                                            }`}
                                                        title={`${task.title} - ${task.assigneeName}`}
                                                    >
                                                        {task.title}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Hover Add Button */}
                                            <button className="absolute bottom-2 right-2 p-1.5 bg-zinc-100 rounded-full text-zinc-400 hover:text-[#0f5c82] hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {trailingEmptyDays.map(d => (
                                    <div key={`trail-${d}`} className="bg-zinc-50/30 min-h-[120px]" />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- GANTT VIEW --- */}
                {viewMode === 'GANTT' && (
                    <>
                        {/* Desktop Gantt Chart */}
                        <div className="hidden lg:flex flex-1">
                            {/* Task List Sidebar (Left) */}
                            <div className="w-80 border-r border-zinc-200 flex flex-col bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                <div className="h-[60px] border-b border-zinc-200 flex items-center px-4 bg-zinc-50 font-bold text-xs text-zinc-500 uppercase tracking-wider">
                                    Task Name
                                </div>
                                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                    {filteredTasks.map((task, i) => (
                                        <div
                                            key={i}
                                            className="h-[48px] flex items-center px-4 border-b border-zinc-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                        >
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <span className="text-zinc-400 text-xs font-mono w-4">{i + 1}</span>
                                                <div className={`w-2 h-2 rounded-full ${task.type === 'milestone' ? 'bg-amber-500 rotate-45' : 'bg-[#0f5c82]'}`} />
                                                <span className="text-sm font-medium text-zinc-800 truncate">{task.name}</span>
                                                {task.hasDocs && <Paperclip size={10} className="text-blue-500 flex-shrink-0" />}
                                            </div>
                                            <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-[#0f5c82]">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <div className="p-4 text-center text-zinc-400 text-sm">No tasks scheduled.</div>
                                    )}
                                </div>
                            </div>

                            {/* Gantt Chart Area (Right) */}
                            <div className="flex-1 overflow-auto relative bg-zinc-50/50" style={{ scrollBehavior: 'smooth' }}>
                                <div className="min-w-[1200px] relative">

                                    {/* Timeline Header */}
                                    <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 h-[60px] flex">
                                        {[...Array(30)].map((_, i) => (
                                            <div key={i} className="flex-shrink-0 border-r border-zinc-100 flex flex-col justify-end pb-2 items-center" style={{ width: dayWidth }}>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Day</span>
                                                <span className={`text-sm font-bold ${i % 7 === 0 || i % 7 === 6 ? 'text-red-400' : 'text-zinc-700'}`}>
                                                    {i + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 top-[60px] pointer-events-none flex">
                                        {[...Array(30)].map((_, i) => (
                                            <div key={i} className={`flex-shrink-0 border-r h-full ${i % 7 === 0 || i % 7 === 6 ? 'bg-zinc-50 border-zinc-200/50' : 'border-zinc-100'}`} style={{ width: dayWidth }} />
                                        ))}
                                        {/* Current Day Indicator */}
                                        <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-0" style={{ left: 8 * dayWidth + (dayWidth / 2) }}>
                                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                                        </div>
                                    </div>

                                    {/* Dependency Arrows */}
                                    <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible" style={{ top: 60 }}>
                                        {filteredTasks.flatMap(task =>
                                            (task.dependencies || []).map(depId => {
                                                const depTask = filteredTasks.find(t => t.id === depId);
                                                if (!depTask) return null;

                                                // Find index in filteredTasks to get row
                                                const depIdx = filteredTasks.findIndex(t => t.id === depId);
                                                const taskIdx = filteredTasks.findIndex(t => t.id === task.id);
                                                if (depIdx === -1 || taskIdx === -1) return null;

                                                const startY = depIdx * rowHeight + rowHeight / 2;
                                                const endY = taskIdx * rowHeight + rowHeight / 2;
                                                const startX = (depTask.start + depTask.duration - 1) * dayWidth;
                                                const endX = (task.start - 1) * dayWidth;

                                                // Draw a stepped line (Z-shape)
                                                return (
                                                    <path
                                                        key={`${task.id}-${depId}`}
                                                        d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`}
                                                        fill="none"
                                                        stroke="#0f5c82"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4 2"
                                                        markerEnd="url(#arrowhead)"
                                                        opacity="0.4"
                                                    />
                                                );
                                            })
                                        )}
                                        <defs>
                                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                                <polygon points="0 0, 10 3.5, 0 7" fill="#0f5c82" />
                                            </marker>
                                        </defs>
                                    </svg>

                                    {/* Task Bars */}
                                    <div className="relative pt-0">
                                        {filteredTasks.map((task, i) => (
                                            <div key={i} className="relative group" style={{ height: rowHeight }}>
                                                {/* Bar */}
                                                <div
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setTaskForm({
                                                            title: task.name,
                                                            assigneeName: task.assignee,
                                                            status: task.status,
                                                            priority: task.priority,
                                                            startDate: task.startDate || new Date().toISOString().split('T')[0],
                                                            duration: task.duration,
                                                            dueDate: task.dueDate,
                                                            projectId: projectId || 'p1',
                                                            progress: task.progress || 0,
                                                            color: task.color || '#3b82f6'
                                                        });
                                                        setShowTaskModal(true);
                                                    }}
                                                    className={`absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm border border-white/20 flex items-center px-2 overflow-hidden transition-all hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${task.type === 'milestone' ? 'bg-amber-500 w-6 h-6 rotate-45 rounded-sm' :
                                                        criticalPathIds.has(task.id) ? 'bg-red-600 h-7 ring-2 ring-red-200 ring-offset-1' : 'bg-[#0f5c82] h-7'
                                                        }`}
                                                    style={{
                                                        left: (task.start - 1) * dayWidth,
                                                        width: task.type === 'milestone' ? 24 : task.duration * dayWidth
                                                    }}
                                                >
                                                    {task.type !== 'milestone' && (
                                                        <>
                                                            {/* Progress Fill */}
                                                            <div className="absolute top-0 left-0 bottom-0 bg-black/20" style={{ width: `${task.progress}%` }} />
                                                            <span className="relative text-[10px] font-bold text-white truncate px-1 drop-shadow-md flex items-center gap-1">
                                                                {task.progress}%
                                                                {task.hasDocs && <Paperclip size={8} className="text-blue-200" />}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Simplified Timeline */}
                        <div className="lg:hidden flex-1 overflow-y-auto p-4 bg-zinc-50">
                            <div className="space-y-3">
                                {filteredTasks.length === 0 ? (
                                    <div className="text-center text-zinc-400 py-12">
                                        <CalendarIcon size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No tasks scheduled</p>
                                    </div>
                                ) : (
                                    filteredTasks.map((task, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setEditingTask(task);
                                                setTaskForm({
                                                    title: task.name,
                                                    assigneeName: task.assignee,
                                                    status: task.status,
                                                    priority: task.priority,
                                                    startDate: task.startDate || new Date().toISOString().split('T')[0],
                                                    duration: task.duration,
                                                    dueDate: task.dueDate,
                                                    projectId: projectId || 'p1',
                                                    progress: task.progress || 0,
                                                    color: task.color || '#3b82f6'
                                                });
                                                setShowTaskModal(true);
                                            }}
                                            className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform"
                                            style={{ borderLeftWidth: '4px', borderLeftColor: task.color || '#0f5c82' }}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-zinc-900 text-sm flex-1">{task.name}</h4>
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ml-2 ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
                                                <div className="flex items-center gap-1">
                                                    <User size={12} />
                                                    <span>{task.assignee}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    <span>Day {task.start} - {task.start + task.duration}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="font-bold text-zinc-700">{task.progress}%</span>
                                                </div>
                                                <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#0f5c82] transition-all duration-500"
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {task.hasDocs && (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                                                    <Paperclip size={12} />
                                                    <span>Has attachments</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Task Name</th>
                                        <th className="px-6 py-4 font-bold">Assignee</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                        <th className="px-6 py-4 font-bold">Priority</th>
                                        <th className="px-6 py-4 font-bold">Start Day</th>
                                        <th className="px-6 py-4 font-bold">Duration</th>
                                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredTasks.map((task, i) => (
                                        <tr key={i} className="hover:bg-zinc-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {task.type === 'milestone' ? (
                                                        <div className="w-3 h-3 bg-amber-500 rotate-45 rounded-[1px]" />
                                                    ) : (
                                                        <div className="w-4 h-4 border-2 border-zinc-300 rounded-full" />
                                                    )}
                                                    <span className="font-medium text-zinc-900">{task.name}</span>
                                                    {task.hasDocs && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100"><Paperclip size={10} /></span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-zinc-600">
                                                    <User size={14} /> {task.assignee}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600">
                                                Day {task.start}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600">
                                                {task.duration} days
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setTaskForm({
                                                            title: task.name,
                                                            assigneeName: task.assignee,
                                                            status: task.status,
                                                            priority: task.priority,
                                                            startDate: task.startDate || new Date().toISOString().split('T')[0],
                                                            duration: task.duration,
                                                            dueDate: task.dueDate,
                                                            projectId: projectId || 'p1',
                                                            progress: task.progress || 0,
                                                            color: task.color || '#3b82f6'
                                                        });
                                                        setShowTaskModal(true);
                                                    }}
                                                    className="text-zinc-400 hover:text-[#0f5c82]"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {filteredTasks.length === 0 ? (
                                <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-400">
                                    No tasks found
                                </div>
                            ) : (
                                filteredTasks.map((task, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            setEditingTask(task);
                                            setTaskForm({
                                                title: task.name,
                                                assigneeName: task.assignee,
                                                status: task.status,
                                                priority: task.priority,
                                                startDate: task.startDate || new Date().toISOString().split('T')[0],
                                                duration: task.duration,
                                                dueDate: task.dueDate,
                                                projectId: projectId || 'p1',
                                                progress: task.progress || 0,
                                                color: task.color || '#3b82f6'
                                            });
                                            setShowTaskModal(true);
                                        }}
                                        className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-1">
                                                {task.type === 'milestone' ? (
                                                    <div className="w-3 h-3 bg-amber-500 rotate-45 rounded-[1px] flex-shrink-0" />
                                                ) : (
                                                    <div className="w-4 h-4 border-2 border-zinc-300 rounded-full flex-shrink-0" />
                                                )}
                                                <h4 className="font-bold text-zinc-900 text-sm">{task.name}</h4>
                                            </div>
                                            <MoreHorizontal size={16} className="text-zinc-400 flex-shrink-0" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div>
                                                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Assignee</p>
                                                <div className="flex items-center gap-1 text-xs text-zinc-600">
                                                    <User size={12} /> {task.assignee}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Duration</p>
                                                <p className="text-xs text-zinc-600">{task.duration} days</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                            {task.hasDocs && (
                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                                                    <Paperclip size={10} /> Files
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* AI Optimizer Sidebar */}
                {showAIOptimizer && (
                    <div className="w-80 bg-white border-l border-zinc-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right">
                        <div className="p-4 border-b border-zinc-200 bg-purple-50 flex justify-between items-center">
                            <h3 className="font-bold text-purple-900 flex items-center gap-2">
                                <Zap size={18} className="fill-purple-700 text-purple-700" /> Schedule Optimizer
                            </h3>
                            <button onClick={() => setShowAIOptimizer(false)} className="text-purple-700 hover:bg-purple-100 rounded p-1">
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {optimizing ? (
                                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-3">
                                    <Loader2 size={24} className="animate-spin text-purple-600" />
                                    <p className="text-xs">Analyzing critical path with reasoning...</p>
                                </div>
                            ) : optimizationResult ? (
                                <>
                                    <div className={`bg-white border rounded-xl p-4 shadow-sm ${optimizationResult.riskLevel === 'High' ? 'border-red-200 bg-red-50' : 'border-purple-100'
                                        }`}>
                                        <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Analysis Result</div>
                                        <p className="text-sm text-zinc-700 leading-relaxed mb-2">
                                            {optimizationResult.riskAnalysis}
                                        </p>
                                        <div className={`text-xs font-bold px-2 py-1 rounded inline-block ${optimizationResult.riskLevel === 'High' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                                            }`}>
                                            {optimizationResult.riskLevel} Risk
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Recommendations</div>
                                        <div className="space-y-2">
                                            {optimizationResult.recommendations?.map((rec: any, i: number) => (
                                                <div key={i} className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm hover:bg-blue-100 cursor-pointer transition-colors">
                                                    <div className="font-bold text-blue-800 mb-1">{rec.title}</div>
                                                    <p className="text-blue-700 text-xs">{rec.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-100">
                                        <button className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 shadow-sm">
                                            Apply Top Recommendations
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-zinc-400 text-sm py-10">
                                    Click run to analyze schedule risks.
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-zinc-200">
                            <button
                                onClick={runOptimizer}
                                disabled={optimizing}
                                className="w-full py-2 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 flex items-center justify-center gap-2"
                            >
                                <Zap size={14} /> Re-Run Analysis
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Task Create/Edit Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <h3 className="text-lg font-bold text-zinc-900">{editingTask ? 'Edit Task' : 'New Schedule Task'}</h3>
                            <button onClick={() => setShowTaskModal(false)} className="text-zinc-400 hover:text-zinc-600">
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Task Title</label>
                                <input
                                    type="text"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent transition-all outline-none"
                                    placeholder="e.g., Concrete Pouring"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Assignee</label>
                                    <input
                                        type="text"
                                        value={taskForm.assigneeName}
                                        onChange={(e) => setTaskForm({ ...taskForm, assigneeName: e.target.value })}
                                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                                    <select
                                        value={taskForm.status}
                                        onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                                    >
                                        <option>To Do</option>
                                        <option>In Progress</option>
                                        <option>Done</option>
                                        <option>Blocked</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Priority</label>
                                    <select
                                        value={taskForm.priority}
                                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Duration (Days)</label>
                                    <input
                                        type="number"
                                        value={taskForm.duration}
                                        onChange={(e) => setTaskForm({ ...taskForm, duration: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={taskForm.startDate}
                                        onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={taskForm.dueDate}
                                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                            <button
                                onClick={() => setShowTaskModal(false)}
                                className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-white transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTask}
                                className="flex-1 py-2.5 bg-[#0f5c82] text-white rounded-xl font-bold hover:bg-[#0c4a6e] transition-all shadow-lg active:scale-95"
                            >
                                {editingTask ? 'Update Schedule' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
