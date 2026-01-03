import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

/**
 * Generate a secure API key
 */
function generateAPIKey(): string {
    return 'pk_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Get all platform API keys
 */
export const getAPIKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const keys = await db.all(`
            SELECT id, name, \`key\` as apiKey, 
                   permissions, createdBy, createdAt, expiresAt, lastUsedAt
            FROM platform_api_keys
            ORDER BY createdAt DESC
        `);

        // Mask API keys (show only last 8 characters)
        const maskedKeys = keys.map(key => ({
            ...key,
            apiKey: '••••••••' + key.apiKey.slice(-8),
            permissions: key.permissions ? JSON.parse(key.permissions) : []
        }));

        res.json(maskedKeys);
    } catch (e) {
        next(e);
    }
};

/**
 * Create new platform API key
 */
export const createAPIKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, permissions, expiresInDays } = req.body;
        const db = getDb();

        const apiKey = generateAPIKey();
        const id = `apikey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let expiresAt = null;
        if (expiresInDays) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + expiresInDays);
            expiresAt = expiry.toISOString();
        }

        await db.run(
            `INSERT INTO platform_api_keys (id, name, \`key\`, permissions, createdBy, createdAt, expiresAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                name,
                apiKey,
                JSON.stringify(permissions || []),
                (req as any).userName,
                new Date().toISOString(),
                expiresAt
            ]
        );

        logger.info(`Platform API key created: ${name} by ${(req as any).userName}`);

        // Return the full API key ONCE (user must save it)
        res.json({
            success: true,
            id,
            name,
            apiKey, // Full key shown only once
            expiresAt,
            warning: 'Save this key now. It will not be shown again.'
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Delete API key
 */
export const deleteAPIKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.run('DELETE FROM platform_api_keys WHERE id = ?', [id]);

        logger.warn(`Platform API key deleted: ${id} by ${(req as any).userName}`);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Update API key last used timestamp
 */
export const updateAPIKeyUsage = async (apiKey: string) => {
    const db = getDb();
    try {
        await db.run(
            'UPDATE platform_api_keys SET lastUsedAt = ? WHERE `key` = ?',
            [new Date().toISOString(), apiKey]
        );
    } catch (e) {
        logger.error('Failed to update API key usage:', e);
    }
};

/**
 * Get all webhooks
 */
export const getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const webhooks = await db.all(`
            SELECT id, name, url, events, status, createdAt, lastTriggered
            FROM webhooks
            ORDER BY createdAt DESC
        `);

        const parsedWebhooks = webhooks.map(webhook => ({
            ...webhook,
            events: webhook.events ? JSON.parse(webhook.events) : []
        }));

        res.json(parsedWebhooks);
    } catch (e) {
        next(e);
    }
};

/**
 * Create webhook
 */
export const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, url, events } = req.body;
        const db = getDb();

        const id = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await db.run(
            `INSERT INTO webhooks (id, name, url, events, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                name,
                url,
                JSON.stringify(events || []),
                'active',
                new Date().toISOString()
            ]
        );

        logger.info(`Webhook created: ${name} by ${(req as any).userName}`);
        res.json({ success: true, id });
    } catch (e) {
        next(e);
    }
};

/**
 * Update webhook status
 */
export const updateWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status, events } = req.body;
        const db = getDb();

        const updates = [];
        const params = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        if (events) {
            updates.push('events = ?');
            params.push(JSON.stringify(events));
        }

        params.push(id);

        await db.run(
            `UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Delete webhook
 */
export const deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.run('DELETE FROM webhooks WHERE id = ?', [id]);

        logger.info(`Webhook deleted: ${id} by ${(req as any).userName}`);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Test webhook
 */
export const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const webhook = await db.get('SELECT * FROM webhooks WHERE id = ?', [id]);
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        // Send test payload
        const testPayload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook from CortexBuild Pro' }
        };

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });

            await db.run(
                'UPDATE webhooks SET lastTriggered = ? WHERE id = ?',
                [new Date().toISOString(), id]
            );

            res.json({
                success: response.ok,
                status: response.status,
                statusText: response.statusText
            });
        } catch (fetchError) {
            res.json({
                success: false,
                error: (fetchError as Error).message
            });
        }
    } catch (e) {
        next(e);
    }
};
