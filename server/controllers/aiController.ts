import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get AI assets (images/videos) for a tenant
 */
export const getAIAssets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId, userId } = req.context;
        const { type, limit = 50 } = req.query;

        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const db = getDb();
        let query = 'SELECT * FROM ai_assets WHERE companyId = ?';
        const params: any[] = [tenantId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY createdAt DESC LIMIT ?';
        params.push(Number(limit));

        const assets = await db.all(query, params);

        // Parse metadata if using Postgres/SQLite adapters that don't auto-parse JSON
        const parsedAssets = assets.map(asset => ({
            ...asset,
            metadata: typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata
        }));

        res.json({ success: true, data: parsedAssets });
    } catch (error) {
        next(error);
    }
};

/**
 * Save a new AI asset
 */
export const saveAIAsset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId, userId } = req.context;
        const { type, url, prompt, projectId, metadata } = req.body;

        if (!tenantId || !userId) throw new AppError('Authentication required', 401);
        if (!type || !url) throw new AppError('Type and URL are required', 400);

        const db = getDb();
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO ai_assets (id, companyId, projectId, userId, type, url, prompt, metadata, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                tenantId,
                projectId || null,
                userId,
                type,
                url,
                prompt || '',
                JSON.stringify(metadata || {}),
                now
            ]
        );

        res.status(201).json({ success: true, data: { id, url, prompt, createdAt: now } });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an AI asset
 */
export const deleteAIAsset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { id } = req.params;

        if (!tenantId) throw new AppError('Tenant ID required', 401);

        const db = getDb();
        await db.run('DELETE FROM ai_assets WHERE id = ? AND companyId = ?', [id, tenantId]);

        res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
        next(error);
    }
};
