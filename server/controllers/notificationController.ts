import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Get recent system events (platform alerts) - PLATFORM DB
 */
export const getSystemEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const limit = parseInt(req.query.limit as string) || 50;

        const events = await db.all(
            `SELECT * FROM system_events 
             ORDER BY createdAt DESC 
             LIMIT ?`,
            [limit]
        );

        // Parse metadata JSON
        const parsedEvents = events.map(event => ({
            ...event,
            metadata: event.metadata ? JSON.parse(event.metadata) : null,
            isRead: Boolean(event.isRead)
        }));

        res.json(parsedEvents);
    } catch (e: any) {
        logger.error('Failed to fetch system events:', e);
        next(e);
    }
};

/**
 * Mark an event as read - PLATFORM DB
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.run('UPDATE system_events SET isRead = 1 WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Mark all events as read - PLATFORM DB
 */
export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        await db.run('UPDATE system_events SET isRead = 1');
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Delete old events - PLATFORM DB
 */
export const clearEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        // Clear events older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await db.run('DELETE FROM system_events WHERE createdAt < ?', [thirtyDaysAgo]);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Get notifications for the current user - TENANT DB
 */
export const getUserNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;

        if (!userId) throw new AppError('Unauthorized', 401);

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const notifications = await db.all(
            'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
            [userId]
        );

        const parsed = notifications.map(n => ({
            ...n,
            isRead: Boolean(n.isRead)
        }));

        res.json(parsed);
    } catch (e) {
        next(e);
    }
};

/**
 * Mark a specific notification as read - TENANT DB
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { userId } = req.context;

        if (!userId) throw new AppError('Unauthorized', 401);

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const result = await db.run(
            'UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?',
            [id, userId]
        );

        if (result.changes === 0) {
            throw new AppError('Notification not found or access denied', 404);
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Mark all notifications as read for current user - TENANT DB
 */
export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.context;

        if (!userId) throw new AppError('Unauthorized', 401);

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        await db.run('UPDATE notifications SET isRead = 1 WHERE userId = ?', [userId]);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};
