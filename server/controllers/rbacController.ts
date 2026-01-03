import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        // Assuming we have a 'roles' table. If not, we might need to create it or read from a config if dynamic roles weren't implemented yet.
        // Based on previous context, roles seem hardcoded in Typescript enums, but for dynamic RBAC we need a DB table.
        // I will check if 'roles' table exists or if I need to create it.
        // For now, I'll assume we are fetching from a 'roles' table.
        const roles = await db.all('SELECT * FROM roles');
        res.json(roles);
    } catch (e) {
        next(e);
    }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const { name, description, permissions } = req.body;

        if (!name) throw new AppError('Role name is required', 400);

        const id = name.toUpperCase().replace(/\s+/g, '_'); // Simple ID generation

        await db.run(
            'INSERT INTO roles (id, name, description, isSystem, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, name, description, 0, new Date().toISOString()]
        );

        if (permissions && Array.isArray(permissions)) {
            for (const perm of permissions) {
                await db.run(
                    'INSERT INTO role_permissions (roleId, permission, resource, action) VALUES (?, ?, ?, ?)',
                    [id, perm.id, perm.resource, perm.action]
                );
            }
        }

        res.status(201).json({ id, name, description, permissions });
    } catch (e) {
        next(e);
    }
};

export const updateRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { permissions } = req.body; // Array of permission objects or strings

        // Simple wipe and replace strategy for now
        await db.run('DELETE FROM role_permissions WHERE roleId = ?', [id]);

        if (permissions && Array.isArray(permissions)) {
            // Assuming permissions body is list of { id, resource, action }
            for (const perm of permissions) {
                await db.run(
                    'INSERT INTO role_permissions (roleId, permission, resource, action) VALUES (?, ?, ?, ?)',
                    [id, perm.id, perm.resource, perm.action]
                );
            }
        }

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

export const getPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        // Return all available permissions in the system (could be a static list or from DB)
        // If dynamic, fetch from DB.
        const permissions = await db.all('SELECT * FROM permissions');
        res.json(permissions);
    } catch (e) {
        next(e);
    }
};

export const getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const permissions = await db.all('SELECT * FROM role_permissions WHERE roleId = ?', [id]);
        res.json(permissions.map(p => p.permission)); // Return list of permission IDs
    } catch (e) {
        next(e);
    }
};
