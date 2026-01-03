import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const getMarketplaceModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category, search } = req.query as any;
        const db = getDb();

        let query = `
            SELECT m.*, 
                   m.developer_id as developerId, 
                   u.name as developerName 
            FROM modules m
            LEFT JOIN users u ON m.developer_id = u.id
            WHERE m.status = 'published'
        `;
        const params: any[] = [];

        if (category) {
            query += ' AND m.category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY m.downloads DESC';

        const modules = await db.all(query, params);
        res.json(modules);
    } catch (e) {
        next(e);
    }
};

export const getMarketplaceCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const categories = await db.all('SELECT * FROM module_categories ORDER BY sortOrder ASC');
        res.json(categories);
    } catch (e) {
        next(e);
    }
};

export const installModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { moduleId } = req.params;
        const { companyId } = req.body;
        const userId = (req as any).userId;

        if (!companyId) {
            throw new AppError('Company ID is required', 400);
        }

        const db = getDb();
        const now = new Date().toISOString();

        // Check if module exists
        const module = await db.get('SELECT * FROM modules WHERE id = ?', [moduleId]);
        if (!module) {
            throw new AppError('Module not found', 404);
        }

        // Check if already installed
        const existing = await db.get(
            'SELECT id FROM module_installations WHERE companyId = ? AND moduleId = ?',
            [companyId, moduleId]
        );

        if (existing) {
            throw new AppError('Module already installed for this company', 400);
        }

        const installationId = `inst-${uuidv4()}`;
        await db.run(`
            INSERT INTO module_installations (id, companyId, moduleId, installedAt, updatedAt, isActive)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [installationId, companyId, moduleId, now, now, true]);

        // Increment download count
        await db.run('UPDATE modules SET downloads = downloads + 1 WHERE id = ?', [moduleId]);

        res.status(201).json({
            message: 'Module installed successfully',
            installationId
        });
    } catch (e) {
        next(e);
    }
};

export const uninstallModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { moduleId } = req.params;
        const { companyId } = req.body;

        if (!companyId) {
            throw new AppError('Company ID is required', 400);
        }

        const db = getDb();
        await db.run(
            'DELETE FROM module_installations WHERE companyId = ? AND moduleId = ?',
            [companyId, moduleId]
        );

        res.json({ message: 'Module uninstalled successfully' });
    } catch (e) {
        next(e);
    }
};

export const getInstalledModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;
        const db = getDb();

        const modules = await db.all(`
            SELECT m.*, mi.installedAt, mi.isActive, mi.config
            FROM modules m
            JOIN module_installations mi ON m.id = mi.moduleId
            WHERE mi.companyId = ?
        `, [companyId]);

        res.json(modules);
    } catch (e) {
        next(e);
    }
};
