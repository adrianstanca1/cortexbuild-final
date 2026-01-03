import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { WorkflowService } from '../services/workflowService.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get all automations
 */
export const getAutomations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const automations = await WorkflowService.getAutomations(tenantId);
        res.json({ success: true, data: automations });
    } catch (error) {
        next(error);
    }
};

/**
 * Create automation
 */
export const createAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const automation = await WorkflowService.createAutomation(tenantId, req.body);
        res.json({ success: true, data: automation });
    } catch (error) {
        next(error);
    }
};

/**
 * Update automation
 */
export const updateAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { id } = req.params;
        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const result = await WorkflowService.updateAutomation(tenantId, id, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete automation
 */
export const deleteAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { id } = req.params;
        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const result = await WorkflowService.deleteAutomation(tenantId, id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
