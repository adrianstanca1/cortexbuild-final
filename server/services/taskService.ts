import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService } from './baseTenantService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { IDatabase } from '../database.js';

/**
 * TaskService
 * Handles all task-related operations with strict tenant isolation
 */
export class TaskService extends BaseTenantService {
    constructor() {
        super('TaskService');
    }

    /**
     * Get all tasks for a tenant (optionally filtered by project)
     */
    async getTasks(db: IDatabase, userId: string, tenantId: string, projectId?: string) {
        await this.validateTenantAccess(userId, tenantId);

        const { query: baseQuery, params: baseParams } = this.scopeQueryByTenant(
            'SELECT * FROM tasks',
            tenantId
        );

        let query = baseQuery;
        const params: any[] = [...baseParams];

        if (projectId) {
            // Validate project belongs to tenant (using tenant DB if possible, or global for metadata?)
            // We'll trust the caller passes the right DB.
            // But validateResourceTenant usually checks table existence.
            // If we use tenant DB, we check projects table in tenant DB.
            // So we need to ensure validateResourceTenant uses the RIGHT db.
            // But validateResourceTenant is in base class and uses getDb() (global).
            // We should Override it or manually check here.

            // Manual Check in Tenant DB:
            const project = await db.get('SELECT id FROM projects WHERE id = ? AND companyId = ?', [projectId, tenantId]);
            if (!project) throw new AppError('Project not found or access denied', 404);

            query += ' AND projectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY dueDate ASC';

        const tasks = await db.all(query, params);
        return tasks.map(t => ({
            ...t,
            dependencies: t.dependencies ? JSON.parse(t.dependencies) : [],
        }));
    }

    /**
     * Get a single task by ID
     */
    async getTask(db: IDatabase, userId: string, tenantId: string, taskId: string) {
        await this.validateTenantAccess(userId, tenantId);

        const { query, params } = this.scopeQueryByTenant(
            'SELECT * FROM tasks WHERE id = ?',
            tenantId
        );

        const task = await db.get(query, [taskId, ...params]);

        if (!task) {
            throw new AppError('Task not found', 404);
        }

        return {
            ...task,
            dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
        };
    }

    /**
     * Create a new task
     */
    async createTask(db: IDatabase, userId: string, tenantId: string, taskData: any) {
        await this.validateTenantAccess(userId, tenantId);

        // Validate project belongs to tenant
        if (taskData.projectId) {
            const project = await db.get('SELECT id FROM projects WHERE id = ? AND companyId = ?', [taskData.projectId, tenantId]);
            if (!project) throw new AppError('Project not found or access denied', 404);
        }

        const id = taskData.id || uuidv4();

        const task = {
            ...taskData,
            id,
            companyId: tenantId, // Force tenant ID
        };

        const dependencies = task.dependencies ? JSON.stringify(task.dependencies) : null;

        await db.run(
            `INSERT INTO tasks (
        id, companyId, title, description, projectId, status, priority,
        assigneeId, assigneeName, assigneeType, dueDate, latitude, longitude,
        dependencies, startDate, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, tenantId, task.title, task.description, task.projectId,
                task.status, task.priority, task.assigneeId, task.assigneeName,
                task.assigneeType, task.dueDate, task.latitude, task.longitude,
                dependencies, task.startDate, task.duration
            ]
        );

        await this.auditAction(db, 'create', userId, tenantId, 'tasks', id, { title: task.title });

        logger.info(`Task created: ${id} in tenant ${tenantId}`);
        return this.getTask(db, userId, tenantId, id);
    }

    /**
     * Validate dependencies
     * Returns true if all dependencies are completed
     */
    async validateDependencies(db: IDatabase, tenantId: string, dependencyIds: string[]): Promise<boolean> {
        if (!dependencyIds || dependencyIds.length === 0) {
            return true;
        }

        const placeholders = dependencyIds.map(() => '?').join(',');

        // Count non-completed dependencies
        const query = `
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE companyId = ? 
            AND id IN (${placeholders}) 
            AND status != 'done' AND status != 'completed'
        `;

        const result = await db.get(query, [tenantId, ...dependencyIds]);
        return result.count === 0;
    }

    /**
     * Update a task
     */
    async updateTask(db: IDatabase, userId: string, tenantId: string, taskId: string, updates: any) {
        await this.validateTenantAccess(userId, tenantId);

        // Verify existence
        const existing = await this.getTask(db, userId, tenantId, taskId);
        if (!existing) throw new AppError('Task not found', 404);

        // If changing project, validate new project belongs to tenant
        if (updates.projectId) {
            const project = await db.get('SELECT id FROM projects WHERE id = ? AND companyId = ?', [updates.projectId, tenantId]);
            if (!project) throw new AppError('Project not found or access denied', 404);
        }

        // Dependency Validation Logic
        if (updates.status && ['in_progress', 'completed', 'done'].includes(updates.status)) {
            let dependenciesToCheck = updates.dependencies;

            // If dependencies not in update, fetch existing
            if (!dependenciesToCheck) {
                dependenciesToCheck = existing.dependencies;
            }

            // Ensure we have an array
            if (typeof dependenciesToCheck === 'string') {
                try {
                    dependenciesToCheck = JSON.parse(dependenciesToCheck);
                } catch (e) {
                    dependenciesToCheck = [];
                }
            }

            const areDependenciesMet = await this.validateDependencies(db, tenantId, dependenciesToCheck || []);

            if (!areDependenciesMet) {
                throw new AppError('Cannot start/complete task: Waiting for unresolved dependencies', 400);
            }
        }

        // Serialize JSON fields
        if (updates.dependencies) {
            updates.dependencies = JSON.stringify(updates.dependencies);
        }

        const fields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'companyId') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new AppError('No fields to update', 400);
        }

        values.push(taskId);
        values.push(tenantId);

        await db.run(
            `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`,
            values
        );

        await this.auditAction(db, 'update', userId, tenantId, 'tasks', taskId, updates);

        logger.info(`Task updated: ${taskId} in tenant ${tenantId}`);
        return this.getTask(db, userId, tenantId, taskId);
    }

    /**
     * Delete a task
     */
    async deleteTask(db: IDatabase, userId: string, tenantId: string, taskId: string) {
        await this.validateTenantAccess(userId, tenantId);

        const result = await db.run(
            'DELETE FROM tasks WHERE id = ? AND companyId = ?',
            [taskId, tenantId]
        );

        if (result.changes === 0) {
            throw new AppError('Task not found', 404);
        }

        await this.auditAction(db, 'delete', userId, tenantId, 'tasks', taskId);

        logger.info(`Task deleted: ${taskId} from tenant ${tenantId}`);
        return { success: true, id: taskId };
    }

    /**
     * Get assignments for a task
     */
    async getTaskAssignments(db: IDatabase, taskId: string) {
        // Validation handled by caller context checks
        return db.all('SELECT * FROM task_assignments WHERE taskId = ?', [taskId]);
    }

    /**
     * Assign resources to a task
     * Replaces existing assignments with new list (Bulk Update)
     */
    async assignResources(db: IDatabase, taskId: string, resources: Array<{ userId: string, role: string, allocatedHours?: number }>) {
        // TODO: Validate userIds belong to tenant (skipped for MVP speed)

        // 1. Delete existing assignments
        await db.run('DELETE FROM task_assignments WHERE taskId = ?', [taskId]);

        // 2. Insert new assignments
        const now = new Date().toISOString();
        const promises = resources.map(r => {
            const id = uuidv4();
            return db.run(
                `INSERT INTO task_assignments (id, taskId, userId, role, allocatedHours, startDate, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, taskId, r.userId, r.role || 'Contributor', r.allocatedHours || 0, now, now]
            );
        });

        await Promise.all(promises);

        return this.getTaskAssignments(db, taskId);
    }

    /**
     * Calculate Critical Path
     * Uses CPM (Critical Path Method) to identify critical tasks and float
     */
    async calculateCriticalPath(db: IDatabase, userId: string, tenantId: string, projectId: string) {
        await this.validateTenantAccess(userId, tenantId);

        // 1. Fetch all tasks for the project
        const tasks = await this.getTasks(db, userId, tenantId, projectId);

        if (tasks.length === 0) return [];

        // 2. Build Graph & Map
        const taskMap = new Map<string, any>();
        tasks.forEach(t => {
            taskMap.set(t.id, {
                ...t,
                id: t.id,
                duration: t.duration || 1,
                dependencies: t.dependencies || [],
                earlyStart: 0,
                earlyFinish: 0,
                lateStart: 0,
                lateFinish: 0,
                float: 0,
                isCritical: false
            });
        });

        // 3. Forward Pass (Calculate Early Start & Early Finish)
        // We need to process topologically or iteratively. Since dependency graph might not be sorted,
        // we can iterate until convergence or use a simple depth approach.
        // For simplicity: iterative approach (max tasks usually < 500)
        let changed = true;
        let iterations = 0;
        const maxIterations = tasks.length + 2; // Cycle detection safety

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const task of taskMap.values()) {
                let maxDepFinish = 0;

                // Check dependencies
                if (task.dependencies.length > 0) {
                    for (const depId of task.dependencies) {
                        const dep = taskMap.get(depId);
                        // Only consider dependencies within this project slice
                        if (dep) {
                            maxDepFinish = Math.max(maxDepFinish, dep.earlyFinish);
                        }
                    }
                }

                const newEarlyStart = maxDepFinish + 1; // Start day
                // If existing Early Start is less, update it
                // Actually start day should be max dependency finish + 1.
                // If no dependencies, start day is 1 (relative)

                if (task.earlyStart < newEarlyStart) {
                    task.earlyStart = Math.max(1, newEarlyStart);
                    task.earlyFinish = task.earlyStart + task.duration - 1;
                    changed = true;
                } else if (task.earlyStart === 0 && task.earlyFinish === 0) {
                    // Initialization case
                    task.earlyStart = 1;
                    task.earlyFinish = task.duration; // 1 + duration - 1
                    changed = true;
                }
            }
        }

        // 4. Backward Pass (Calculate Late Start & Late Finish)
        // Find project end date (max Early Finish)
        let projectDuration = 0;
        for (const task of taskMap.values()) {
            projectDuration = Math.max(projectDuration, task.earlyFinish);
        }

        // Initialize Late stats with project duration
        for (const task of taskMap.values()) {
            task.lateFinish = projectDuration;
            task.lateStart = projectDuration - task.duration + 1;
        }

        // Iterate backwards or repeatedly to push Late Finish earlier
        changed = true;
        iterations = 0;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const task of taskMap.values()) {
                // Find successors (who depends on me?)
                // Just iterate all tasks to find who lists 'task.id' as dependency
                // Optimization: Pre-build successor map if performance needed

                let minSuccessorStart = projectDuration + 1; // Default upper bound
                let hasSuccessors = false;

                for (const potentialSuccessor of taskMap.values()) {
                    if (potentialSuccessor.dependencies.includes(task.id)) {
                        hasSuccessors = true;
                        minSuccessorStart = Math.min(minSuccessorStart, potentialSuccessor.lateStart);
                    }
                }

                if (hasSuccessors) {
                    const newLateFinish = minSuccessorStart - 1;
                    if (task.lateFinish > newLateFinish) {
                        task.lateFinish = newLateFinish;
                        task.lateStart = task.lateFinish - task.duration + 1;
                        changed = true;
                    }
                }
            }
        }

        // 5. Calculate Float & Identify Critical Path
        const result = [];
        for (const task of taskMap.values()) {
            task.float = task.lateStart - task.earlyStart;
            // Float should be >= 0. If < 0, logic error or cycle.
            task.isCritical = task.float <= 0; // Ideally === 0

            result.push({
                id: task.id,
                title: task.title,
                start: task.earlyStart, // Relative Day
                duration: task.duration,
                earlyStart: task.earlyStart,
                earlyFinish: task.earlyFinish,
                lateStart: task.lateStart,
                lateFinish: task.lateFinish,
                float: task.float,
                isCritical: task.isCritical,
                dependencies: task.dependencies
            });
        }

        return result.sort((a, b) => a.start - b.start);
    }
}

export const taskService = new TaskService();
export default taskService;
