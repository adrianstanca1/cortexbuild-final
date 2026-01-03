import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { z } from 'zod';
import { projectService } from '../services/projectService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { getDb } from '../database.js';
import { WorkflowService } from '../services/workflowService.js';
import { auditService } from '../services/auditService.js';

// Validation schemas
const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    health: z.string().optional(),
    progress: z.number().min(0).max(100).optional(),
    budget: z.number().optional(),
    spent: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    manager: z.string().optional(),
    image: z.string().optional(),
    teamSize: z.number().optional(),
    weatherLocation: z.any().optional(),
    aiAnalysis: z.string().optional(),
    zones: z.array(z.any()).optional(),
    phases: z.array(z.any()).optional(),
    timelineOptimizations: z.array(z.any()).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

/**
 * Get all projects for the current tenant
 */
export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;

        if (!userId) {
            throw new AppError('User not authenticated', 401);
        }

        if (!tenantId) {
            throw new AppError('Tenant context required', 400);
        }

        const projects = await projectService.getProjects(req.tenantDb || getDb(), userId, tenantId);
        res.json(projects);
    } catch (error) {
        logger.error('Error fetching projects:', error);
        next(error);
    }
};

/**
 * Get a single project by ID
 */
export const getProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) {
            throw new AppError('User not authenticated', 401);
        }

        if (!tenantId) {
            throw new AppError('Tenant context required', 400);
        }

        const project = await projectService.getProject(req.tenantDb || getDb(), userId, tenantId, id);
        res.json(project);
    } catch (error) {
        logger.error('Error fetching project:', error);
        next(error);
    }
};

/**
 * Create a new project
 */
export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;

        if (!userId) {
            throw new AppError('User not authenticated', 401);
        }

        if (!tenantId) {
            throw new AppError('Tenant context required', 400);
        }

        // Validate request body
        const validationResult = createProjectSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError('Validation failed', 400);
        }

        const project = await projectService.createProject(req.tenantDb || getDb(), userId, tenantId, validationResult.data);

        // Log action
        await auditService.logRequest(req, 'CREATE_PROJECT', 'Project', project.id, validationResult.data);
        await auditService.logActivityRequest(req, project.id, 'created project', 'Project', project.id);

        res.status(201).json(project);
    } catch (error) {
        logger.error('Error creating project:', error);
        next(error);
    }
};

/**
 * Update a project
 */
export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) {
            throw new AppError('User not authenticated', 401);
        }

        if (!tenantId) {
            throw new AppError('Tenant context required', 400);
        }

        // Validate request body
        const validationResult = updateProjectSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError('Validation failed', 400);
        }

        // Create a copy of the old project state before update for comparison
        const db = req.tenantDb || getDb();
        const oldProject = await projectService.getProject(db, userId, tenantId, id);

        const project = await projectService.updateProject(db, userId, tenantId, id, validationResult.data);

        // Log action
        await auditService.logRequest(req, 'UPDATE_PROJECT', 'Project', id, validationResult.data);
        await auditService.logActivityRequest(req, id, 'updated project', 'Project', id);

        // Automation Trigger: Check for phase/status changes
        if (oldProject && project) {
            // Trigger 1: Phase Changed
            if (validationResult.data.status && validationResult.data.status !== oldProject.status) {
                await WorkflowService.trigger(tenantId, 'phase_changed', {
                    projectId: id,
                    oldStatus: oldProject.status,
                    newStatus: project.status,
                    project
                });
            }
        }

        res.json(project);
    } catch (error) {
        logger.error('Error updating project:', error);
        next(error);
    }
};

/**
 * Delete a project
 */
export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { id } = req.params;

        if (!userId) {
            throw new AppError('User not authenticated', 401);
        }

        if (!tenantId) {
            throw new AppError('Tenant context required', 400);
        }

        const result = await projectService.deleteProject(req.tenantDb || getDb(), userId, tenantId, id);

        // Log action
        await auditService.logRequest(req, 'DELETE_PROJECT', 'Project', id);
        await auditService.logActivityRequest(req, null, 'deleted project', 'Project', id);

        res.json(result);
    } catch (error) {
        logger.error('Error deleting project:', error);
        next(error);
    }
};
