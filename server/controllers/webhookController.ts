import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * Webhook Controller
 * Manages outbound webhooks for integration
 */

export const getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;

        const webhooks = await db.all(`
      SELECT id, name, url, events, active, lastTriggered
      FROM webhooks
      WHERE companyId = ?
      ORDER BY createdAt DESC
    `, [companyId]);

        res.json(webhooks.map((w: any) => ({
            ...w,
            events: JSON.parse(w.events || '[]'),
            secret: undefined // Don't expose secret
        })));
    } catch (error: any) {
        logger.error('Error fetching webhooks:', error);
        next(error);
    }
};

export const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const { name, url, events } = req.body;

        if (!name || !url || !events) {
            throw new AppError('Name, URL, and events are required', 400);
        }

        const id = uuidv4();
        const secret = crypto.randomBytes(32).toString('hex');

        await db.run(`
      INSERT INTO webhooks (id, companyId, name, url, events, secret, active, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `, [
            id,
            companyId,
            name,
            url,
            JSON.stringify(events),
            secret,
            new Date().toISOString()
        ]);

        const webhook = await db.get('SELECT * FROM webhooks WHERE id = ?', [id]);
        res.json(webhook);
    } catch (error: any) {
        logger.error('Error creating webhook:', error);
        next(error);
    }
};

export const deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const { id } = req.params;

        const result = await db.run('DELETE FROM webhooks WHERE id = ? AND companyId = ?', [id, companyId]);
        if (result.changes === 0) {
            throw new AppError('Webhook not found', 404);
        }

        res.json({ message: 'Webhook deleted' });
    } catch (error: any) {
        logger.error('Error deleting webhook:', error);
        next(error);
    }
};
