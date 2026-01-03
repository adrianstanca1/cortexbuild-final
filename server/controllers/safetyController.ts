import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { AppError } from '../utils/AppError.js';
import { WorkflowService } from '../services/workflowService.js';
import { auditService } from '../services/auditService.js';

// --- Safety Incidents ---

export const getSafetyIncidents = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.query;
        const { tenantId } = req.context;

        let query = 'SELECT * FROM safety_incidents WHERE companyId = ?';
        const params: any[] = [tenantId];

        if (projectId) {
            query += ' AND projectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY date DESC';

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);
        const incidents = await db.all(query, params);
        res.json(Array.isArray(incidents) ? incidents : []);
    } catch (error) {
        next(error);
    }
};

export const createSafetyIncident = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            id, projectId, type, title, severity, date, location,
            description, personInvolved, actionTaken, status
        } = req.body;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const incidentId = id || randomUUID();

        await db.run(
            `INSERT INTO safety_incidents (
                id, companyId, projectId, type, title, severity, date,
                location, description, personInvolved, actionTaken, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                incidentId, tenantId, projectId, type, title, severity, date,
                location, description, personInvolved, actionTaken || '', status || 'Open'
            ]
        );

        const newIncident = await db.get('SELECT * FROM safety_incidents WHERE id = ?', [incidentId]);

        // Trigger Workflow Automation (Phase 14)
        if (severity >= 3) {
            await WorkflowService.trigger(tenantId, 'safety_incident_high', { incidentId, incident: newIncident, projectId });
            await auditService.logRequest(req, 'HIGH_SEVERITY_SAFETY_INCIDENT', 'SafetyIncident', incidentId, newIncident);
        }
        await WorkflowService.trigger(tenantId, 'safety_incident_logged', { incidentId, incident: newIncident, projectId });

        // Log action & Activity
        await auditService.logRequest(req, 'CREATE_SAFETY_INCIDENT', 'SafetyIncident', incidentId, req.body);
        await auditService.logActivityRequest(req, projectId, 'logged safety incident', 'SafetyIncident', incidentId, { title, severity });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_create',
            entityType: 'safety_incidents',
            data: newIncident,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ success: true, data: newIncident });
    } catch (error) {
        next(error);
    }
};

export const updateSafetyIncident = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const existing = await db.get('SELECT id FROM safety_incidents WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!existing) {
            throw new AppError('Incident not found', 404);
        }

        const fields: string[] = [];
        const values: any[] = [];

        Object.keys(updates).forEach(key => {
            if (['type', 'title', 'severity', 'date', 'location', 'description', 'personInvolved', 'actionTaken', 'status'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (fields.length > 0) {
            values.push(id);
            values.push(tenantId);
            await db.run(`UPDATE safety_incidents SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`, values);
        }

        const updatedIncident = await db.get('SELECT * FROM safety_incidents WHERE id = ?', [id]);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'safety_incidents',
            id,
            changes: updates,
            timestamp: new Date().toISOString()
        });

        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_SAFETY_INCIDENT', 'SafetyIncident', id, updates);
        await auditService.logActivityRequest(req, updatedIncident?.projectId || null, 'updated safety incident', 'SafetyIncident', id, { updates });

        res.json({ success: true, data: updatedIncident });
    } catch (error) {
        next(error);
    }
};

// --- Safety Hazards (AI Detected or Manual) ---

export const getSafetyHazards = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.query;
        const { tenantId } = req.context;

        let query = 'SELECT * FROM safety_hazards WHERE companyId = ?';
        const params: any[] = [tenantId];

        if (projectId) {
            query += ' AND projectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY createdAt DESC';

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);
        const hazards = await db.all(query, params);

        const parsedHazards = hazards.map((h: any) => ({
            ...h,
            box_2d: h.box_2d ? JSON.parse(h.box_2d) : undefined
        }));

        res.json(Array.isArray(parsedHazards) ? parsedHazards : []);
    } catch (error) {
        next(error);
    }
};

export const createSafetyHazard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {
            id, projectId, type, severity, riskScore, description,
            recommendation, regulation, box_2d, timestamp
        } = req.body;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const hazardId = id || randomUUID();

        await db.run(
            `INSERT INTO safety_hazards (
                id, companyId, projectId, type, severity, riskScore,
                description, recommendation, regulation, box_2d, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                hazardId, tenantId, projectId, type, severity, riskScore,
                description, recommendation, regulation,
                JSON.stringify(box_2d),
                timestamp || new Date().toISOString()
            ]
        );

        const newHazard = await db.get('SELECT * FROM safety_hazards WHERE id = ?', [hazardId]);

        // Log action & Activity
        await auditService.logRequest(req, 'CREATE_SAFETY_HAZARD', 'SafetyHazard', hazardId, req.body);
        await auditService.logActivityRequest(req, projectId, 'logged safety hazard', 'SafetyHazard', hazardId, { type, severity });

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_create',
            entityType: 'safety_hazards',
            data: newHazard,
            timestamp: new Date().toISOString()
        });

        // Automation Trigger
        try {
            await WorkflowService.trigger(tenantId, 'safety_hazard_logged', { hazard: newHazard, projectId }, db);
        } catch (e) {
            logger.warn('Workflow trigger safety_hazard_logged failed', e);
        }

        res.status(201).json({ success: true, data: newHazard });
    } catch (error) {
        next(error);
    }
};

export const updateSafetyHazard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const existing = await db.get('SELECT id FROM safety_hazards WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!existing) {
            throw new AppError('Hazard not found', 404);
        }

        const fields: string[] = [];
        const values: any[] = [];

        Object.keys(updates).forEach(key => {
            if (['type', 'severity', 'riskScore', 'description', 'recommendation', 'regulation', 'box_2d', 'status'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(key === 'box_2d' ? JSON.stringify(updates[key]) : updates[key]);
            }
        });

        if (fields.length > 0) {
            values.push(id);
            values.push(tenantId);
            await db.run(`UPDATE safety_hazards SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`, values);
        }

        const updatedHazard = await db.get('SELECT * FROM safety_hazards WHERE id = ?', [id]);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_update',
            entityType: 'safety_hazards',
            id,
            changes: updates,
            timestamp: new Date().toISOString()
        });

        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_SAFETY_HAZARD', 'SafetyHazard', id, updates);
        await auditService.logActivityRequest(req, updatedHazard?.projectId || null, 'updated safety hazard', 'SafetyHazard', id, { updates });

        res.json({ success: true, data: updatedHazard });
    } catch (error) {
        next(error);
    }
};

export const deleteSafetyIncident = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const result = await db.run('DELETE FROM safety_incidents WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (result.changes === 0) {
            throw new AppError('Incident not found', 404);
        }

        // Log action & Activity
        await auditService.logRequest(req, 'DELETE_SAFETY_INCIDENT', 'SafetyIncident', id);
        await auditService.logActivityRequest(req, null, 'deleted safety incident', 'SafetyIncident', id);

        // Broadcast Real-time Event
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'entity_delete',
            entityType: 'safety_incidents',
            id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// --- Safety Checklists (Audits) ---

export const getSafetyChecklists = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.query;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        let query = 'SELECT * FROM safety_checklists WHERE companyId = ?';
        const params: any[] = [tenantId];

        if (projectId) {
            query += ' AND projectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY date DESC';
        const checklists = await db.all(query, params);
        res.json(Array.isArray(checklists) ? checklists : []);
    } catch (error) {
        next(error);
    }
};

export const createSafetyChecklist = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id, projectId, name, date, inspector, status, notes } = req.body;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const checklistId = id || randomUUID();
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO safety_checklists (id, companyId, projectId, name, date, inspector, status, notes, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [checklistId, tenantId, projectId, name, date, inspector, status || 'In Progress', notes, now, now]
        );

        const newChecklist = await db.get('SELECT * FROM safety_checklists WHERE id = ?', [checklistId]);

        // Log action & Activity
        await auditService.logRequest(req, 'CREATE_SAFETY_CHECKLIST', 'SafetyChecklist', checklistId, req.body);
        await auditService.logActivityRequest(req, projectId, 'created safety checklist', 'SafetyChecklist', checklistId, { name });

        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, { type: 'entity_create', entityType: 'safety_checklists', data: newChecklist, timestamp: now });

        // Automation Trigger
        try {
            await WorkflowService.trigger(tenantId, 'safety_checklist_created', { checklist: newChecklist, projectId }, db);
        } catch (e) {
            logger.warn('Workflow trigger safety_checklist_created failed', e);
        }

        res.status(201).json({ success: true, data: newChecklist });
    } catch (error) {
        next(error);
    }
};

export const getSafetyChecklistItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { checklistId } = req.params;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const items = await db.all('SELECT * FROM safety_checklist_items WHERE checklistId = ?', [checklistId]);
        res.json(Array.isArray(items) ? items : []);
    } catch (error) {
        next(error);
    }
};

export const updateSafetyChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { checklistId, itemId } = req.params;
        const { status, notes } = req.body;
        const db = req.tenantDb;

        // Ensure checklist belongs to tenant (security check)
        const { tenantId } = req.context;
        const checklist = await db?.get('SELECT id FROM safety_checklists WHERE id = ? AND companyId = ?', [checklistId, tenantId]);
        if (!checklist) throw new AppError('Checklist not found', 404);

        if (itemId === 'new') { // Create
            const newItemId = randomUUID();
            const { category, text } = req.body;
            await db?.run(
                `INSERT INTO safety_checklist_items (id, checklistId, category, text, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [newItemId, checklistId, category, text, status || 'PENDING', notes, new Date().toISOString()]
            );
            res.status(201).json({ success: true, id: newItemId });
        } else { // Update
            await db?.run(
                `UPDATE safety_checklist_items SET status = ?, notes = ?, updatedAt = ? WHERE id = ? AND checklistId = ?`,
                [status, notes, new Date().toISOString(), itemId, checklistId]
            );
            res.json({ success: true });
        }
    } catch (error) {
        next(error);
    }
};
