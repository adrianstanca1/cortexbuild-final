import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const settings = await db.all('SELECT * FROM system_settings WHERE companyId = ?', [tenantId]);

        // Transform to key-value object
        const settingsMap: Record<string, any> = {};
        settings.forEach((s: any) => {
            try {
                // Try to parse JSON values, otherwise keep as string
                settingsMap[s.key] = JSON.parse(s.value);
            } catch {
                settingsMap[s.key] = s.value;
            }
        });

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        next(error);
    }
};

export const updateSetting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { key, value } = req.body;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        if (!key) throw new AppError('Key is required', 400);

        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const now = new Date().toISOString();

        // Check if exists
        const existing = await db.get('SELECT key FROM system_settings WHERE key = ? AND companyId = ?', [key, tenantId]);

        if (existing) {
            await db.run(
                'UPDATE system_settings SET value = ?, updatedAt = ? WHERE key = ? AND companyId = ?',
                [strValue, now, key, tenantId]
            );
        } else {
            await db.run(
                'INSERT INTO system_settings (companyId, key, value, updatedAt) VALUES (?, ?, ?, ?)',
                [tenantId, key, strValue, now]
            );
        }

        // Broadcast Real-time Event (Optional, but good for settings sync)
        const { broadcastToCompany } = await import('../socket.js');
        broadcastToCompany(tenantId, {
            type: 'setting_update',
            key,
            value,
            timestamp: now
        });

        res.json({ success: true, key, value });
    } catch (error) {
        next(error);
    }
};
