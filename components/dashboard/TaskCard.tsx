import React from 'react';
import {
    Calendar, Briefcase, Link, AlertTriangle, Lock, MapPin, Paperclip, FileText,
    ChevronsUp, ChevronUp, Minus, ChevronDown
} from 'lucide-react';
import { Task, ProjectDocument } from '@/types';

interface DependencyStatus {
    isBlocked: boolean;
    blockingTasks: Task[];
    totalDeps: number;
    allDeps: Task[];
}

interface TaskCardProps {
    task: Task;
    projectName: string;
    dependencyStatus: DependencyStatus;
    linkedDocs: ProjectDocument[];
    blockedByThis: Task[];
    onSelect: (task: Task) => void;
}

// Styling Helpers
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

const TaskCardComponent: React.FC<TaskCardProps> = ({
    task,
    projectName,
    dependencyStatus,
    linkedDocs,
    blockedByThis,
    onSelect
}) => {
    const isBlocking = blockedByThis.length > 0;

    return (
        <div
            onClick={() => onSelect(task)}
            className={`bg-white p-4 rounded-xl border-y border-r border-l-[6px] shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col gap-2 ${dependencyStatus.isBlocked && task.status !== 'Done'
                ? 'border-red-200 ring-1 ring-red-100 bg-red-50/50'
                : 'border-zinc-200 hover:border-[#0f5c82]'
                } ${getPriorityBorder(task.priority)}`}
        >
            {dependencyStatus.isBlocked && (
                <div className="absolute -top-px -right-px w-12 h-12 pointer-events-none overflow-hidden rounded-tr-xl">
                    <div className="absolute top-0 right-0 transform translate-x-[30%] -translate-y-[30%] rotate-45 bg-red-500 text-white text-[6px] font-bold py-3 w-24 text-center shadow-sm">
                        BLOCKED
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start flex-wrap gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                    {getPriorityIcon(task.priority)}
                    {task.priority}
                </span>
                <div className="flex gap-1">
                    {/* Doc Indicator */}
                    {linkedDocs.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); /* Logic for viewing docs handled by parent via click or we might need a prop for this specifc action */ }}
                            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 transition-colors z-10"
                            title={`${linkedDocs.length} Linked Documents`}
                        >
                            <Paperclip size={10} /> {linkedDocs.length}
                        </button>
                    )}
                    {/* Blocking Others Indicator */}
                    {isBlocking && (
                        <span
                            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 cursor-help z-10 font-bold"
                            title={`Blocking: ${blockedByThis.map(t => t.title).join(', ')}`}
                        >
                            <AlertTriangle size={10} /> Blocks {blockedByThis.length}
                        </span>
                    )}
                    {/* Blocked By Indicator */}
                    {task.dependencies && task.dependencies.length > 0 && (
                        <span
                            className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-help z-10 ${dependencyStatus.isBlocked ? 'bg-red-100 text-red-600 border-red-200 font-bold' : 'bg-green-50 text-green-600 border-green-200'}`}
                            title={dependencyStatus.isBlocked ? `Blocked by: ${dependencyStatus.blockingTasks.map(t => t.title).join(', ')}` : `Depends on: ${dependencyStatus.allDeps.map(t => t.title).join(', ')}`}
                        >
                            {dependencyStatus.isBlocked ? <Lock size={10} /> : <Link size={10} />} {dependencyStatus.totalDeps}
                        </span>
                    )}
                </div>
            </div>

            <h4 className="font-semibold text-zinc-900 text-sm leading-tight group-hover:text-[#0f5c82] transition-colors mt-1">{task.title}</h4>
            {task.description && <p className="text-xs text-zinc-500 line-clamp-2">{task.description}</p>}

            {/* Document Thumbnails Strip */}
            {linkedDocs.length > 0 && (
                <div className="flex gap-1 mt-1">
                    {linkedDocs.slice(0, 3).map((d, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-md overflow-hidden border border-zinc-200 bg-zinc-100 flex items-center justify-center relative">
                            {d.type === 'Image' && d.url ? (
                                <img src={d.url} alt="thumb" className="w-full h-full object-cover" />
                            ) : (
                                <FileText size={14} className="text-zinc-400" />
                            )}
                        </div>
                    ))}
                    {linkedDocs.length > 3 && (
                        <div className="w-8 h-8 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-500">
                            +{linkedDocs.length - 3}
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mt-1">
                <p className="text-[10px] text-zinc-400 truncate">{projectName}</p>
                {task.latitude && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                        <MapPin size={10} />
                        <span>GPS</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-2 mt-1 border-t border-zinc-50">
                <div className={`flex items-center gap-1.5 text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
                    <Calendar size={12} />
                    <span>{task.dueDate}</span>
                </div>
                {task.assigneeType === 'role' ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-[10px] font-bold">
                        <Briefcase size={10} /> {task.assigneeName}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5" title={task.assigneeName}>
                        <div className={`w-6 h-6 rounded-full bg-[#1f7d98] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white`}>
                            {(task.assigneeName || 'U').substring(0, 2).toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom comparison function for React.memo
const arePropsEqual = (prev: TaskCardProps, next: TaskCardProps) => {
    if (prev.task.id !== next.task.id) return false;
    if (prev.task.title !== next.task.title) return false;
    if (prev.task.status !== next.task.status) return false;
    if (prev.task.priority !== next.task.priority) return false;
    if (prev.task.dueDate !== next.task.dueDate) return false;
    if (prev.task.assigneeName !== next.task.assigneeName) return false;
    if (prev.projectName !== next.projectName) return false;

    // Deep check for derived arrays to prevent re-renders from fresh array references
    const linkedDocsChanged = prev.linkedDocs.length !== next.linkedDocs.length ||
        !prev.linkedDocs.every((d, i) => d.id === next.linkedDocs[i].id);

    const blockedByChanged = prev.blockedByThis.length !== next.blockedByThis.length ||
        !prev.blockedByThis.every((t, i) => t.id === next.blockedByThis[i].id);

    const depsChanged = prev.dependencyStatus.isBlocked !== next.dependencyStatus.isBlocked ||
        prev.dependencyStatus.blockingTasks.length !== next.dependencyStatus.blockingTasks.length ||
        !prev.dependencyStatus.blockingTasks.every((t, i) => t.id === next.dependencyStatus.blockingTasks[i].id);

    if (linkedDocsChanged || blockedByChanged || depsChanged) return false;

    return true;
};

export const TaskCard = React.memo(TaskCardComponent, arePropsEqual);
