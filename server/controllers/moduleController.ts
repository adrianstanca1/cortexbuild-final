import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const getModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            category,
            status = 'published',
            search,
            page = '1',
            limit = '20'
        } = req.query as any;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const db = getDb();
        let query = `
            SELECT m.*, 
                   u.name as developer_name
            FROM modules m
            LEFT JOIN users u ON m.developer_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (category) {
            query += ' AND m.category = ?';
            params.push(category);
        }

        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        const countResult = await db.get(`SELECT COUNT(*) as total FROM (${query})`, params);
        const total = countResult.total;

        query += ' ORDER BY m.downloads DESC, m.published_at DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const modules = await db.all(query, params);

        res.json({
            success: true,
            data: modules,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (e) {
        next(e);
    }
};

export const getModuleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const module = await db.get(`
            SELECT m.*, 
                   u.name as developer_name,
                   u.email as developer_email
            FROM modules m
            LEFT JOIN users u ON m.developer_id = u.id
            WHERE m.id = ?
        `, [id]);

        if (!module) {
            throw new AppError('Module not found', 404);
        }

        res.json({
            success: true,
            data: module
        });
    } catch (e) {
        next(e);
    }
};

export const publishModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            description,
            category,
            version,
            price = 0,
            repository_url,
            documentation_url,
            icon,
            slug
        } = req.body;

        const developer_id = (req as any).userId;

        if (!name || !description || !category || !version || !slug) {
            throw new AppError('Name, description, category, version, and slug are required', 400);
        }

        const db = getDb();
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO modules (
                id, developer_id, name, slug, description, category, version,
                price, repository_url, documentation_url, icon,
                published_at, updated_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, developer_id, name, slug, description, category, version,
            price, repository_url, documentation_url, icon,
            now, now, 'published'
        ]);

        const module = await db.get('SELECT * FROM modules WHERE id = ?', [id]);

        res.status(201).json({
            success: true,
            data: module,
            message: 'Module published successfully'
        });
    } catch (e) {
        next(e);
    }
};

export const updateModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = (req as any).userId;

        const db = getDb();
        const existing = await db.get('SELECT * FROM modules WHERE id = ?', [id]);

        if (!existing) {
            throw new AppError('Module not found', 404);
        }

        if (existing.developer_id !== userId) {
            throw new AppError('You do not have permission to update this module', 403);
        }

        const fields = Object.keys(updates).filter(key => ['name', 'description', 'category', 'version', 'price', 'status', 'icon', 'repository_url', 'documentation_url'].includes(key));
        if (fields.length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => updates[field]);
        const now = new Date().toISOString();

        await db.run(`
            UPDATE modules 
            SET ${setClause}, updated_at = ?
            WHERE id = ?
        `, [...values, now, id]);

        const module = await db.get('SELECT * FROM modules WHERE id = ?', [id]);

        res.json({
            success: true,
            data: module,
            message: 'Module updated successfully'
        });
    } catch (e) {
        next(e);
    }
};

export const deleteModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        const db = getDb();
        const existing = await db.get('SELECT * FROM modules WHERE id = ?', [id]);

        if (!existing) {
            throw new AppError('Module not found', 404);
        }

        if (existing.developer_id !== userId) {
            throw new AppError('You do not have permission to delete this module', 403);
        }

        await db.run('DELETE FROM modules WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Module deleted successfully'
        });
    } catch (e) {
        next(e);
    }
};
