import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const getCostCodes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { projectId } = req.query;

        let query = `SELECT * FROM cost_codes WHERE 1=1`;
        const params: any[] = [];

        // In Tenant DB, cost codes are already scoped to tenant. 
        // We can just filter by projectId if provided.
        // We don't need to filter by companyId again unless we want to be explicit, 
        // but the table might still have the column.
        query += ` AND companyId = ?`;
        params.push(tenantId);

        if (projectId) {
            query += ` AND projectId = ?`;
            params.push(projectId);
        }

        const codes = await db.all(query, params);

        res.json(codes);
    } catch (error) {
        logger.error('Error fetching cost codes:', error);
        next(error);
    }
};

export const createCostCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { projectId, code, description, budget, spent, id: bodyId } = req.body;
        const id = bodyId || `cc-${uuidv4()}`; // Use standardized UUID or existing convention? Existing was time-based. UUID is safer.

        await db.run(`
            INSERT INTO cost_codes (id, projectId, companyId, code, description, budget, spent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, projectId, tenantId, code, description, budget, spent || 0]);

        res.json({
            id, projectId, companyId: tenantId, code, description, budget, spent: spent || 0
        });
    } catch (error) {
        logger.error('Error creating cost code:', error);
        next(error);
    }
};

export const updateCostCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const updates = req.body;

        const fields = Object.keys(updates).filter(key => key !== 'id');
        const values: any[] = [];
        const setParts: string[] = [];

        for (const key of fields) {
            setParts.push(`${key} = ?`);
            values.push(updates[key]);
        }

        if (setParts.length === 0) return res.json({ success: true });

        values.push(id);

        // Scope update to tenant
        await db.run(`UPDATE cost_codes SET ${setParts.join(', ')} WHERE id = ? AND companyId = ?`, [...values, tenantId]);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error updating cost code:', error);
        next(error);
    }
};
