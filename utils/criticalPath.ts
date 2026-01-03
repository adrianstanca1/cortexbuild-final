import { Task } from '@/types';

interface CriticalPathResult {
    criticalPath: string[];
    pathDuration: number;
    slackTimes: Record<string, number>;
    earliestStart: Record<string, number>;
    earliestFinish: Record<string, number>;
    latestStart: Record<string, number>;
    latestFinish: Record<string, number>;
}

/**
 * Calculate the critical path for a set of tasks using CPM algorithm
 */
export function calculateCriticalPath(tasks: Task[]): CriticalPathResult {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const earliestStart: Record<string, number> = {};
    const earliestFinish: Record<string, number> = {};
    const latestStart: Record<string, number> = {};
    const latestFinish: Record<string, number> = {};
    const slackTimes: Record<string, number> = {};

    // Forward pass - calculate earliest start and finish
    const calculateEarliest = (taskId: string, visited = new Set<string>()): number => {
        if (earliestFinish[taskId] !== undefined) {
            return earliestFinish[taskId];
        }

        if (visited.has(taskId)) {
            return 0; // Circular dependency protection
        }
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task) return 0;

        const duration = task.duration || 1;
        let maxPredecessorFinish = 0;

        // Check dependencies
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depId of task.dependencies) {
                const depFinish = calculateEarliest(depId, new Set(visited));
                maxPredecessorFinish = Math.max(maxPredecessorFinish, depFinish);
            }
        }

        earliestStart[taskId] = maxPredecessorFinish;
        earliestFinish[taskId] = maxPredecessorFinish + duration;

        return earliestFinish[taskId];
    };

    // Calculate earliest times for all tasks
    tasks.forEach(task => calculateEarliest(task.id));

    // Find project duration (maximum earliest finish)
    const projectDuration = Math.max(...Object.values(earliestFinish));

    // Backward pass - calculate latest start and finish
    const calculateLatest = (taskId: string, visited = new Set<string>()): number => {
        if (latestStart[taskId] !== undefined) {
            return latestStart[taskId];
        }

        if (visited.has(taskId)) {
            return projectDuration;
        }
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task) return projectDuration;

        const duration = task.duration || 1;

        // Find tasks that depend on this task
        const successors = tasks.filter(t =>
            t.dependencies?.includes(taskId)
        );

        let minSuccessorStart = projectDuration;

        if (successors.length === 0) {
            // No successors, this is an end task
            minSuccessorStart = projectDuration;
        } else {
            for (const successor of successors) {
                const succStart = calculateLatest(successor.id, new Set(visited));
                minSuccessorStart = Math.min(minSuccessorStart, succStart);
            }
        }

        latestFinish[taskId] = minSuccessorStart;
        latestStart[taskId] = minSuccessorStart - duration;

        return latestStart[taskId];
    };

    // Calculate latest times for all tasks
    tasks.forEach(task => calculateLatest(task.id));

    // Calculate slack times and identify critical path
    const criticalPath: string[] = [];

    tasks.forEach(task => {
        const slack = latestStart[task.id] - earliestStart[task.id];
        slackTimes[task.id] = slack;

        // Tasks with zero slack are on the critical path
        if (Math.abs(slack) < 0.001) {
            criticalPath.push(task.id);
        }
    });

    return {
        criticalPath,
        pathDuration: projectDuration,
        slackTimes,
        earliestStart,
        earliestFinish,
        latestStart,
        latestFinish,
    };
}

/**
 * Get the longest path through the task network
 */
export function getCriticalPathTasks(tasks: Task[], result: CriticalPathResult): Task[] {
    return tasks
        .filter(t => result.criticalPath.includes(t.id))
        .sort((a, b) => result.earliestStart[a.id] - result.earliestStart[b.id]);
}

/**
 * Calculate resource utilization over time
 */
export function calculateResourceUtilization(
    tasks: Task[],
    startDate: Date,
    endDate: Date
): Map<string, Map<string, number>> {
    const utilizationByDate = new Map<string, Map<string, number>>();

    tasks.forEach(task => {
        if (!task.startDate || !task.duration || !task.assigneeName) return;

        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(taskStart.getTime() + task.duration * 24 * 60 * 60 * 1000);

        // For each day the task spans
        for (let d = new Date(taskStart); d <= taskEnd; d.setDate(d.getDate() + 1)) {
            if (d < startDate || d > endDate) continue;

            const dateKey = d.toISOString().split('T')[0];

            if (!utilizationByDate.has(dateKey)) {
                utilizationByDate.set(dateKey, new Map());
            }

            const dayUtilization = utilizationByDate.get(dateKey)!;
            const currentHours = dayUtilization.get(task.assigneeName) || 0;
            dayUtilization.set(task.assigneeName, currentHours + 8); // Assume 8 hours per day
        }
    });

    return utilizationByDate;
}
