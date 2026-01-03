import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { PredictiveService } from '../services/predictiveService.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get predictive delay analysis for a project
 */
export const analyzeProjectDelays = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { tenantId } = req.context;
        const result = await PredictiveService.analyzeProjectDelays(tenantId, projectId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const analyzeCompanyProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const results = await PredictiveService.analyzeAllProjects(tenantId);
        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};
