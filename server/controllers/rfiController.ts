import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { sendNotification } from '../services/notificationService.js';
import { WorkflowService } from '../services/workflowService.js';
import { AppError } from '../utils/AppError.js';
import { auditService } from '../services/auditService.js';

export const getRFIs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tenantId } = req.context!;
        const projectId = req.query.projectId as string;

        let sql = 'SELECT * FROM rfis WHERE companyId = ?';
        const params = [tenantId];

        if (projectId) {
            sql += ' AND projectId = ?';
            params.push(projectId);
        }

        sql += ' ORDER BY createdAt DESC';

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);
        const rfis = await db.all(sql, params);
        res.json({ success: true, data: rfis });
    } catch (error) {
        logger.error('Error fetching RFIs:', error);
        next(error);
    }
};

export const createRFI = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tenantId } = req.context!;
        const name = (req as any).userName || 'Unknown';
        const { projectId, subject, question, assignedTo, dueDate, number, status } = req.body;

        if (!projectId || !subject || !question) {
            throw new AppError('Project ID, Subject, and Question are required', 400);
        }

        const id = randomUUID();
        // Use supplied number or auto-generate simpler one if needed logic
        const rfiNumber = number || `RFI-${Date.now().toString().slice(-4)}`;

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);
        await db.run(
            `INSERT INTO rfis (
                id, companyId, projectId, number, subject, description, 
                raisedBy, assignedTo, status, dueDate, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, tenantId, projectId, rfiNumber, subject, question, // Mapping question -> description
                name, assignedTo || 'Unassigned', status || 'Open', dueDate, new Date().toISOString()
            ]
        );

        if (assignedTo && assignedTo !== 'Unassigned') {
            await sendNotification(
                tenantId,
                assignedTo,
                'info',
                'New RFI Assigned',
                `You have been assigned RFI-${rfiNumber}: ${subject}`,
                `/rfi`
            );
        }

        const newRfi = await db.get('SELECT * FROM rfis WHERE id = ?', [id]);

        // Trigger Workflow Automation (Phase 14)
        await WorkflowService.trigger(tenantId, 'rfi_created', { rfiId: id, rfi: newRfi });

        // Log action & Activity
        await auditService.logRequest(req, 'CREATE_RFI', 'RFI', id, { subject, number: rfiNumber });
        await auditService.logActivityRequest(req, projectId, 'raised RFI', 'RFI', id, { subject, number: rfiNumber });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_create',
            entityType: 'rfis',
            data: newRfi,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ success: true, data: { id, number: rfiNumber, status: 'Open' } });
    } catch (error) {
        logger.error('Error creating RFI:', error);
        next(error);
    }
};

export const updateRFI = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context!;
        const name = (req as any).userName || 'Unknown';
        const updates = req.body; // Expect { answer, status }

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const existing = await db.get('SELECT * FROM rfis WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!existing) {
            throw new AppError('RFI not found', 404);
        }

        // Logic for answering
        if (updates.answer) {
            await db.run(
                'UPDATE rfis SET response = ?, status = ? WHERE id = ?',
                [updates.answer, 'Closed', id]
            );

            // Broadcast Answer
            const { broadcastToCompany } = await import('../socket.js');
            broadcastToCompany(tenantId, {
                type: 'entity_update',
                entityType: 'rfis',
                id,
                changes: { response: updates.answer, status: 'Closed' },
                timestamp: new Date().toISOString()
            });

            res.json({ message: 'RFI answered and closed' });
            return;
        }

        // Logic for other updates (status, assignment)
        const allowedFields = ['status', 'assignedTo', 'dueDate', 'priority'];
        const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (fieldsToUpdate.length > 0) {
            const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
            const values = fieldsToUpdate.map(field => updates[field]);
            values.push(id);

            await db.run(`UPDATE rfis SET ${setClause} WHERE id = ?`, values);
        }

        const updatedRfi = await db.get('SELECT * FROM rfis WHERE id = ?', [id]);

        // Trigger Workflow Automation (Phase 14)
        await WorkflowService.trigger(tenantId, 'rfi_status_changed', { rfiId: id, rfi: updatedRfi });

        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_RFI', 'RFI', id, { updates });
        await auditService.logActivityRequest(req, updatedRfi?.projectId || null, 'updated RFI', 'RFI', id, { updates });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'rfis',
            id,
            changes: updates,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, data: updatedRfi });
    } catch (error) {
        logger.error('Error updating RFI:', error);
        next(error);
    }
};

export const deleteRFI = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context!;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const result = await db.run('DELETE FROM rfis WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (result.changes === 0) {
            throw new AppError('RFI not found', 404);
        }

        // Log action & Activity
        await auditService.logRequest(req, 'DELETE_RFI', 'RFI', id);
        await auditService.logActivityRequest(req, null, 'deleted RFI', 'RFI', id);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_delete',
            entityType: 'rfis',
            id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting RFI:', error);
        next(error);
    }
};
