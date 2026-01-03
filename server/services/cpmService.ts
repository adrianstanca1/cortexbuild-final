import { getDb } from '../database.js';

export interface CPMTask {
    id: string;
    title: string;
    duration: number;
    dependencies: string[];
    es: number; // Early Start
    ef: number; // Early Finish
    ls: number; // Late Start
    lf: number; // Late Finish
    slack: number;
    isCritical: boolean;
}

export const calculateCriticalPath = async (projectId: string, companyId: string) => {
    const db = getDb();
    const tasks = await db.all(
        'SELECT id, title, duration, dependencies FROM tasks WHERE projectId = ? AND companyId = ?',
        [projectId, companyId]
    );

    if (tasks.length === 0) return [];

    // Map tasks for easy lookup
    const taskMap: Map<string, CPMTask> = new Map();
    tasks.forEach(t => {
        let deps: string[] = [];
        if (t.dependencies) {
            try {
                deps = typeof t.dependencies === 'string'
                    ? (t.dependencies.startsWith('[') ? JSON.parse(t.dependencies) : t.dependencies.split(',').map((s: string) => s.trim()))
                    : t.dependencies;
            } catch (e) {
                deps = [];
            }
        }

        taskMap.set(t.id, {
            id: t.id,
            title: t.title,
            duration: t.duration || 1,
            dependencies: deps.filter(d => d),
            es: 0,
            ef: 0,
            ls: 0,
            lf: 0,
            slack: 0,
            isCritical: false
        });
    });

    // 1. Forward Pass
    const calculated: Set<string> = new Set();
    const calculateES = (taskId: string) => {
        if (calculated.has(taskId)) return;
        const task = taskMap.get(taskId)!;

        let maxPredecessorEF = 0;
        for (const depId of task.dependencies) {
            if (taskMap.has(depId)) {
                calculateES(depId);
                maxPredecessorEF = Math.max(maxPredecessorEF, taskMap.get(depId)!.ef);
            }
        }

        task.es = maxPredecessorEF;
        task.ef = task.es + task.duration;
        calculated.add(taskId);
    };

    taskMap.forEach((_, id) => calculateES(id));

    // 2. Backward Pass
    const maxEF = Math.max(...Array.from(taskMap.values()).map(t => t.ef));
    const backCalculated: Set<string> = new Set();

    const calculateLF = (taskId: string) => {
        if (backCalculated.has(taskId)) return;
        const task = taskMap.get(taskId)!;

        // Find successors (tasks that depend on this one)
        const successors = Array.from(taskMap.values()).filter(t => t.dependencies.includes(taskId));

        if (successors.length === 0) {
            task.lf = maxEF;
        } else {
            let minSuccessorLS = Infinity;
            for (const succ of successors) {
                calculateLF(succ.id);
                minSuccessorLS = Math.min(minSuccessorLS, succ.ls);
            }
            task.lf = minSuccessorLS;
        }

        task.ls = task.lf - task.duration;
        task.slack = task.ls - task.es;
        task.isCritical = task.slack <= 0;
        backCalculated.add(taskId);
    };

    taskMap.forEach((_, id) => calculateLF(id));

    return Array.from(taskMap.values());
};
