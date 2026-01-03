import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const getUserDashboards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).userId;
        const db = getDb();
        const dashboards = await db.all('SELECT * FROM user_dashboards WHERE userId = ?', [userId]);
        res.json(dashboards);
    } catch (e) {
        next(e);
    }
};

export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).userId;
        const { name, layout, isDefault } = req.body;
        const db = getDb();
        const id = `dash-${uuidv4()}`;
        const now = new Date().toISOString();

        if (isDefault) {
            await db.run('UPDATE user_dashboards SET isDefault = 0 WHERE userId = ?', [userId]);
        }

        await db.run(`
            INSERT INTO user_dashboards (id, userId, name, layout, isDefault, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, userId, name || 'My Dashboard', JSON.stringify(layout || []), isDefault ? 1 : 0, now, now]);

        const dashboard = await db.get('SELECT * FROM user_dashboards WHERE id = ?', [id]);
        res.status(201).json(dashboard);
    } catch (e) {
        next(e);
    }
};

export const getDashboardWidgets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { dashboardId } = req.params;
        const db = getDb();
        const widgets = await db.all('SELECT * FROM dashboard_widgets WHERE dashboardId = ?', [dashboardId]);
        res.json(widgets);
    } catch (e) {
        next(e);
    }
};

export const addWidget = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { dashboardId } = req.params;
        const { widgetType, moduleId, title, config, position_x, position_y, width, height } = req.body;
        const db = getDb();
        const id = `widg-${uuidv4()}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO dashboard_widgets (
                id, dashboardId, widgetType, moduleId, title, config, 
                position_x, position_y, width, height, isVisible, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, dashboardId, widgetType, moduleId, title, JSON.stringify(config || {}),
            position_x || 0, position_y || 0, width || 4, height || 2, 1, now, now
        ]);

        const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
        res.status(201).json(widget);
    } catch (e) {
        next(e);
    }
};

export const updateWidget = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = getDb();

        const fields = Object.keys(updates).filter(key =>
            ['title', 'config', 'position_x', 'position_y', 'width', 'height', 'isVisible'].includes(key)
        );

        if (fields.length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field =>
            typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field]
        );
        const now = new Date().toISOString();

        await db.run(`
            UPDATE dashboard_widgets 
            SET ${setClause}, updatedAt = ?
            WHERE id = ?
        `, [...values, now, id]);

        const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
        res.json(widget);
    } catch (e) {
        next(e);
    }
};

export const deleteWidget = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();
        await db.run('DELETE FROM dashboard_widgets WHERE id = ?', [id]);
        res.json({ message: 'Widget deleted successfully' });
    } catch (e) {
        next(e);
    }
};
