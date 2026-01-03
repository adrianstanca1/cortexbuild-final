import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { IntegrationService } from '../services/integrationService.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get integration status
 */
export const getStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { type } = req.params;

        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const status = await IntegrationService.getIntegration(tenantId, type);
        res.json({ success: true, data: status || { status: 'disconnected' } });
    } catch (error) {
        next(error);
    }
};

/**
 * Connect integration
 */
export const connect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { type, tokens } = req.body;

        if (!tenantId) throw new AppError('Tenant ID required', 401);
        if (!type || !tokens) throw new AppError('Type and tokens are required', 400);

        const result = await IntegrationService.connectIntegration(tenantId, type, tokens);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * Sync data from external tool
 */
export const sync = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { type, externalProjectId } = req.body;

        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const result = await IntegrationService.syncProjectData(tenantId, type, externalProjectId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
