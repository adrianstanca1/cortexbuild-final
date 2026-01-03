import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { randomUUID } from 'crypto';
import { auditService } from '../services/auditService.js';

export const getDailyLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tenantId } = req.context!;
        // Optional: Filter by project if provided in query
        const projectId = req.query.projectId as string;

        let sql = 'SELECT * FROM daily_logs WHERE companyId = ?';
        const params = [tenantId];

        if (projectId) {
            sql += ' AND projectId = ?';
            params.push(projectId);
        }

        sql += ' ORDER BY date DESC, createdBy DESC';

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const logs = await db.all(sql, params);
        res.json(logs);
    } catch (error) {
        logger.error('Error fetching daily logs:', error);
        next(error);
    }
};

export const createDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tenantId } = req.context!;
        const userId = (req as any).userId;
        const name = (req as any).userName || 'Unknown';
        const { projectId, date, weather, temperature, workforce, activities, equipment, delays, safetyIssues, notes } = req.body;

        if (!projectId || !date) {
            throw new AppError('Project ID and Date are required', 400);
        }

        const id = randomUUID();
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        await db.run(
            `INSERT INTO daily_logs (
                id, companyId, projectId, date, weather, temperature, workforce, 
                activities, equipment, delays, safetyIssues, notes, createdBy, status, attachments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)`,
            [
                id, tenantId, projectId, date, weather, temperature, workforce || 0,
                activities || '', equipment || '', delays || '', safetyIssues || '', notes || '', name,
                JSON.stringify(req.body.attachments || [])
            ]
        );

        // Log action & Activity
        await auditService.logRequest(req, 'CREATE_DAILY_LOG', 'DailyLog', id, { date });
        await auditService.logActivityRequest(req, projectId, 'created daily log', 'DailyLog', id, { date });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_create',
            entityType: 'daily_logs',
            data: { id, companyId: tenantId, projectId, date, status: 'Draft', ...req.body },
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ id, status: 'Draft' });
    } catch (error) {
        logger.error('Error creating daily log:', error);
        next(error);
    }
};

export const updateDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context!;
        const name = req.userName || 'Unknown';
        const updates = req.body;

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const existing = await db.get('SELECT * FROM daily_logs WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!existing) {
            throw new AppError('Daily Log not found', 404);
        }

        // Handle Signing specifically
        if (updates.status === 'Signed' && existing.status !== 'Signed') {
            await db.run(
                'UPDATE daily_logs SET status = ?, signedBy = ?, signedAt = ? WHERE id = ?',
                ['Signed', name, new Date().toISOString(), id]
            );

            // Broadcast Signing
            const { broadcastToCompany } = await import('../socket.js');
            broadcastToCompany(tenantId, {
                type: 'entity_update',
                entityType: 'daily_logs',
                id,
                changes: { status: 'Signed', signedBy: name, signedAt: new Date().toISOString() },
                timestamp: new Date().toISOString()
            });

            res.json({ message: 'Daily Log signed successfully' });
            return;
        }

        // Generic Updates (only if not signed, usually)
        if (existing.status === 'Signed' && !updates.force) {
            throw new AppError('Cannot edit a signed log', 403);
        }

        // Construct dynamic update
        const allowedFields = ['weather', 'temperature', 'workforce', 'activities', 'equipment', 'delays', 'safetyIssues', 'notes', 'attachments'];
        const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (fieldsToUpdate.length > 0) {
            const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
            const values = fieldsToUpdate.map(field => updates[field]);
            values.push(id);

            await db.run(`UPDATE daily_logs SET ${setClause} WHERE id = ?`, values);
        }

        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_DAILY_LOG', 'DailyLog', id, { updates });
        await auditService.logActivityRequest(req, existing.projectId, 'updated daily log', 'DailyLog', id, { updates });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'daily_logs',
            id,
            changes: updates,
            timestamp: new Date().toISOString()
        });

        res.json({ message: 'Daily Log updated' });
    } catch (error) {
        logger.error('Error updating daily log:', error);
        next(error);
    }
};

export const getDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context!;

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const log = await db.get('SELECT * FROM daily_logs WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!log) {
            throw new AppError('Daily log not found', 404);
        }
        res.json(log);
    } catch (error) {
        logger.error('Error fetching daily log:', error);
        next(error);
    }
};

export const deleteDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context!;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const result = await db.run('DELETE FROM daily_logs WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (result.changes === 0) {
            throw new AppError('Daily log not found', 404);
        }

        // Log action & Activity
        await auditService.logRequest(req, 'DELETE_DAILY_LOG', 'DailyLog', id);
        await auditService.logActivityRequest(req, null, 'deleted daily log', 'DailyLog', id);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_delete',
            entityType: 'daily_logs',
            id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting daily log:', error);
        next(error);
    }
};
