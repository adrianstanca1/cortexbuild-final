/**
 * React Performance Optimization Examples
 * 
 * This file demonstrates React.memo, useMemo, and useCallback usage
 * for optimizing component performance in BuildPro.
 */

import React, { memo, useMemo, useCallback } from 'react';

// ============================================================================
// Example 1: React.memo for preventing unnecessary re-renders
// ============================================================================

interface TaskCardProps {
    task: {
        id: string;
        title: string;
        status: string;
        priority: string;
    };
    onUpdate: (id: string) => void;
}

// Memoized component - only re-renders when props change
export const ExpensiveComponent = React.memo(({ data }: { data: any }) => {
    // Expensive logic here
    return <div>{data.name}</div>;
});
ExpensiveComponent.displayName = 'ExpensiveComponent';

// Memoized component - only re-renders when props change
export const TaskCard = memo<TaskCardProps>(({ task, onUpdate }) => {
    console.log('TaskCard rendered:', task.id);

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold">{task.title}</h3>
            <p className="text-sm text-zinc-600">{task.status}</p>
            <button onClick={() => onUpdate(task.id)}>Update</button>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function - return true if props are equal (skip render)
    return prevProps.task.id === nextProps.task.id &&
        prevProps.task.title === nextProps.task.title &&
        prevProps.task.status === nextProps.task.status;
});
TaskCard.displayName = 'TaskCard';

// ============================================================================
// Example 2: useMemo for expensive calculations
// ============================================================================

interface ProjectStatsProps {
    tasks: Array<{ id: string; status: string; duration: number }>;
}

export const ProjectStats: React.FC<ProjectStatsProps> = ({ tasks }) => {
    // Memoize expensive calculation - only recalculates when tasks change
    const statistics = useMemo(() => {
        console.log('Calculating statistics...');

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
        const avgDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;

        return {
            total: totalTasks,
            completed: completedTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            avgDuration,
        };
    }, [tasks]); // Only recalculate if tasks array changes

    return (
        <div className="grid grid-cols-4 gap-4">
            <div>
                <div className="text-2xl font-bold">{statistics.total}</div>
                <div className="text-sm text-zinc-600">Total Tasks</div>
            </div>
            <div>
                <div className="text-2xl font-bold">{statistics.completed}</div>
                <div className="text-sm text-zinc-600">Completed</div>
            </div>
            <div>
                <div className="text-2xl font-bold">{statistics.completionRate.toFixed(1)}%</div>
                <div className="text-sm text-zinc-600">Completion Rate</div>
            </div>
            <div>
                <div className="text-2xl font-bold">{statistics.avgDuration.toFixed(1)}</div>
                <div className="text-sm text-zinc-600">Avg Duration</div>
            </div>
        </div>
    );
};

// ============================================================================
// Example 3: useCallback for stable function references
// ============================================================================

interface TaskListProps {
    tasks: Array<{ id: string; title: string }>;
    onTaskUpdate: (id: string, data: any) => Promise<void>;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskUpdate }) => {
    // Memoize callback - prevents child re-renders when parent re-renders
    const handleTaskClick = useCallback((taskId: string) => {
        console.log('Task clicked:', taskId);
        onTaskUpdate(taskId, { clicked: true });
    }, [onTaskUpdate]); // Only recreate if onTaskUpdate changes

    // Memoize filtered list
    const activeTasks = useMemo(() => {
        return tasks.filter(t => !t.title.includes('[archived]'));
    }, [tasks]);

    return (
        <div className="space-y-2">
            {activeTasks.map(task => (
                // TaskCard won't re-render unnecessarily thanks to memoized callback
                <TaskCard
                    key={task.id}
                    task={task as any}
                    onUpdate={handleTaskClick}
                />
            ))}
        </div>
    );
};

// ============================================================================
// Example 4: Memoized selector functions
// ============================================================================

export const useFilteredTasks = (
    tasks: Array<{ status: string; priority: string }>,
    statusFilter: string,
    priorityFilter: string
) => {
    return useMemo(() => {
        let filtered = tasks;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }

        return filtered;
    }, [tasks, statusFilter, priorityFilter]);
};

// ============================================================================
// Best Practices Summary:
// ============================================================================

/**
 * 1. Use React.memo for:
 *    - Pure components that render the same output for same props
 *    - Components that re-render often with same props
 *    - Expensive components (complex calculations, many children)
 * 
 * 2. Use useMemo for:
 *    - Expensive calculations (filtering, sorting large arrays)
 *    - Creating objects/arrays that will be passed as props
 *    - Derived data calculations
 * 
 * 3. Use useCallback for:
 *    - Functions passed to memoized child components
 *    - Dependencies in other hooks
 *    - Event handlers passed down multiple levels
 * 
 * 4. DON'T overuse:
 *    - Memoization has overhead - only use when needed
 *    - Profile first, optimize second
 *    - Premature optimization is the root of all evil
 */
