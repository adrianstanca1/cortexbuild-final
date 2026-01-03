import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { MLService } from '../services/mlService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const getModels = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        if (!tenantId) throw new AppError('Tenant context required', 400);

        // Ensure we have some initial models for this company
        await MLService.seedInitialModels(tenantId);

        const models = await MLService.getModels(tenantId);
        res.json(Array.isArray(models) ? models : []);
    } catch (error) {
        next(error);
    }
};

export const getPredictions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const { modelId } = req.query;
        const predictions = await MLService.getPredictions(tenantId, modelId as string);
        res.json(Array.isArray(predictions) ? predictions : []);
    } catch (error) {
        next(error);
    }
};

export const trainModel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        if (!tenantId) throw new AppError('Tenant context required', 400);

        const { id } = req.params;
        if (!id) throw new AppError('Model ID is required', 400);

        // Broadcast training start
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'ml_model_training_start',
            modelId: id,
            timestamp: new Date().toISOString()
        });

        // Simulate training delay
        const updatedModel = await MLService.trainModel(tenantId, id);

        // Broadcast training end
        broadcastToCompany(tenantId, {
            type: 'ml_model_training_end',
            modelId: id,
            accuracy: updatedModel.accuracy,
            version: updatedModel.version,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: updatedModel });
    } catch (error) {
        next(error);
    }
};
