import { Request, Response } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { auditService } from './auditService.js';

/**
 * Activity Service
 * Logs and retrieves activity feed entries
 */

/**
 * Log an activity
 */
export const logActivity = async (
    companyId: string,
    projectId: string | null,
    userId: string,
    userName: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any
) => {
    const db = getDb();
    await auditService.logActivity(db, {
        companyId,
        projectId,
        userId,
        userName,
        action,
        entityType,
        entityId,
        metadata
    });
};

/**
 * Get activity feed
 */
export const getActivityFeed = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const { projectId, entityType, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT * FROM activity_feed
      WHERE companyId = ?
    `;
        const params: any[] = [companyId];

        if (projectId) {
            query += ' AND projectId = ?';
            params.push(projectId as string);
        }

        if (entityType) {
            query += ' AND entityType = ?';
            params.push(entityType as string);
        }

        query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const activities = await db.all(query, params);

        // Parse metadata
        const parsedActivities = activities.map((activity: any) => ({
            ...activity,
            metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        }));

        res.json(parsedActivities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get activity feed for a specific entity
 */
export const getEntityActivity = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const { entityType, entityId } = req.params;

        const activities = await db.all(`
      SELECT * FROM activity_feed
      WHERE companyId = ? AND entityType = ? AND entityId = ?
      ORDER BY createdAt DESC
      LIMIT 100
    `, [companyId, entityType, entityId]);

        // Parse metadata
        const parsedActivities = activities.map((activity: any) => ({
            ...activity,
            metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        }));

        res.json(parsedActivities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
