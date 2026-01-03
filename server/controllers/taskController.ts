import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { z } from 'zod';
import { taskService } from '../services/taskService.js'; // Use service
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { WorkflowService } from '../services/workflowService.js';
import { logActivity } from '../services/activityService.js';
import { sendNotification } from '../services/notificationService.js';
import { broadcastToCompany } from '../socket.js';
import { auditService } from '../services/auditService.js';
import { getDb } from '../database.js';

// Validation schemas
const createTaskSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'done', 'Done', 'In Progress', 'To Do', 'todo']).default('pending'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assignedTo: z.string().optional(),
    assigneeId: z.string().optional(),
    assigneeName: z.string().optional(),
    assigneeType: z.string().optional(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    duration: z.number().int().min(1).optional(),
    dependencies: z.union([z.string(), z.array(z.string())]).optional(),
    progress: z.number().min(0).max(100).optional(),
    color: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
});

const updateTaskSchema = createTaskSchema.partial();

/**
 * Get all tasks for tenant (optionally filtered by project)
 */
export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { projectId } = req.query;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const tasks = await taskService.getTasks(req.tenantDb, userId, tenantId, projectId as string);
        res.json(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
        logger.error('Error fetching tasks:', error);
        next(error);
    }
};

/**
 * Get single task by ID
 */
export const getTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const task = await taskService.getTask(req.tenantDb, userId, tenantId, id);
        res.json({ success: true, data: task });
    } catch (error) {
        logger.error('Error fetching task:', error);
        next(error);
    }
};

/**
 * Create new task
 */
export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        // Validate
        const validationResult = createTaskSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError('Validation failed', 400);
        }

        const task = await taskService.createTask(req.tenantDb, userId, tenantId, validationResult.data);

        // Log action & activity
        await auditService.logRequest(req, 'CREATE_TASK', 'Task', task.id, validationResult.data);
        await auditService.logActivityRequest(req, task.projectId, 'created task', 'Task', task.id);

        // Broadcast Real-time Event
        broadcastToCompany(tenantId, {
            type: 'entity_create',
            entityType: 'tasks',
            data: task,
            timestamp: new Date().toISOString()
        });

        // Send notification to assignee
        if (task.assigneeId && task.assigneeId !== userId) {
            await sendNotification(
                tenantId,
                task.assigneeId,
                'info',
                'New Task Assigned',
                `You have been assigned to: ${task.title}`,
                `/projects/${task.projectId}`
            );
        }

        // Trigger 'task_created' automation
        try {
            await WorkflowService.trigger(tenantId, 'task_created', { task }, req.tenantDb);
        } catch (e) {
            logger.warn('Workflow trigger task_created failed', e);
        }

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        logger.error('Error creating task:', error);
        next(error);
    }
};

/**
 * Update task
 */
export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        // Validate
        const validationResult = updateTaskSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError('Validation failed', 400);
        }

        const updatedTask = await taskService.updateTask(req.tenantDb, userId, tenantId, id, validationResult.data);

        // Log action & activity
        await auditService.logRequest(req, 'UPDATE_TASK', 'Task', id, validationResult.data);
        await auditService.logActivityRequest(req, updatedTask.projectId, 'updated task', 'Task', id);

        // Trigger Workflow
        if (updatedTask.status === 'completed' || updatedTask.status === 'Done') {
            try {
                // Best effort trigger - pass tenantDb for isolation
                await WorkflowService.trigger(tenantId, 'task_completed', { taskId: id, task: updatedTask }, req.tenantDb);
            } catch (e) {
                logger.warn('Workflow trigger failed', e);
            }
        }

        // Broadcast Real-time Event
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'tasks',
            id,
            changes: validationResult.data,
            data: updatedTask,
            timestamp: new Date().toISOString()
        });

        // Notify if assignee changed
        if (validationResult.data.assigneeId && validationResult.data.assigneeId !== userId) {
            await sendNotification(
                tenantId,
                validationResult.data.assigneeId,
                'info',
                'Task Assigned to You',
                `A task has been reassigned to you: ${updatedTask.title}`,
                `/projects/${updatedTask.projectId}`
            );
        }

        res.json({ success: true, data: updatedTask });
    } catch (error) {
        logger.error('Error updating task:', error);
        next(error);
    }
};

/**
 * Delete task
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const task = await taskService.getTask(req.tenantDb, userId, tenantId, id);
        await taskService.deleteTask(req.tenantDb, userId, tenantId, id);

        // Log action & activity
        await auditService.logRequest(req, 'DELETE_TASK', 'Task', id);
        if (task) {
            await auditService.logActivityRequest(req, task.projectId, 'deleted task', 'Task', id);
        }

        // Broadcast Real-time Event
        broadcastToCompany(tenantId, {
            type: 'entity_delete',
            entityType: 'tasks',
            id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        logger.error('Error deleting task:', error);
        next(error);
    }
};

/**
 * Get assignments for a task
 */
export const getTaskAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const assignments = await taskService.getTaskAssignments(req.tenantDb, id);
        res.json({ success: true, data: assignments });
    } catch (error) {
        logger.error('Error fetching task assignments:', error);
        next(error);
    }
};

/**
 * Assign resources to a task
 */
export const assignResources = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;
        const { resources } = req.body; // Array of { userId, role, allocatedHours }

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);
        if (!Array.isArray(resources)) throw new AppError('Resources must be an array', 400);

        const result = await taskService.assignResources(req.tenantDb, id, resources);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'tasks',
            id,
            subEntity: 'assignments',
            data: result,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error assigning resources:', error);
        next(error);
    }
};

/**
 * Get Critical Path Analysis
 */
export const getCriticalPath = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { projectId } = req.query;

        if (!userId) throw new AppError('User not authenticated', 401);
        if (!tenantId) throw new AppError('Tenant context required', 400);
        if (!projectId) throw new AppError('Project ID is required', 400);

        const analysis = await taskService.calculateCriticalPath(req.tenantDb, userId, tenantId, projectId as string);
        res.json({ success: true, data: analysis });
    } catch (error) {
        logger.error('Error calculating critical path:', error);
        next(error);
    }
};
