import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '../types.js';
import { AuthenticatedRequest } from '../types/express.js';

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // List of public paths that should bypass maintenance mode
    const publicPaths = [
        '/api/health',
        '/api/v1/health',
        '/api/live',
        '/live'
    ];

    if (publicPaths.some(path => req.originalUrl?.startsWith(path)) || req.originalUrl?.includes('/api/client-portal/shared/')) {
        return next();
    }

    try {
        const db = getDb();
        const configKey = db.getType() === 'postgres' ? '"key"' : '`key`';
        const maintenanceSetting = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['maintenance_mode']);
        const maintenanceSettingCamel = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['maintenanceMode']);
        const globalConfig = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['global_config']);

        let isMaintenance = false;

        // Check snake_case key
        if (maintenanceSetting) {
            try {
                const val = JSON.parse(maintenanceSetting.value);
                if (val && typeof val === 'object' && val.enabled === true) isMaintenance = true;
            } catch (error) { /* ignore */ }
            if (maintenanceSetting.value === 'true') isMaintenance = true;
        }

        // Check camelCase key (Frontend default)
        if (maintenanceSettingCamel && !isMaintenance) {
            if (maintenanceSettingCamel.value === 'true' || maintenanceSettingCamel.value === '1') isMaintenance = true;
            try {
                const val = JSON.parse(maintenanceSettingCamel.value);
                if (val === true) isMaintenance = true;
            } catch (e) { /* ignore */ }
        }

        if (globalConfig && !isMaintenance) {
            try {
                const config = JSON.parse(globalConfig.value);
                if (config && config.maintenanceMode === true) isMaintenance = true;
            } catch (e) {
                // Ignore parsing errors for global config
            }
        }

        if (!isMaintenance) {
            return next();
        }

        // Allow CORS preflight requests
        if (req.method === 'OPTIONS') {
            return next();
        }

        // Allow authentication routes so admins can log in
        if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/system-settings')) {
            return next();
        }

        // Check user role from request (set by authenticateToken middleware)
        // Constraint: This middleware must be placed AFTER authenticateToken
        const userRole = (req as AuthenticatedRequest).user?.role;

        if (userRole === UserRole.SUPERADMIN) {
            return next();
        }

        // Block everyone else
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'System is currently under maintenance. Please try again later.',
            code: 'MAINTENANCE_MODE'
        });

    } catch (error) {
        logger.error('Maintenance check failed:', {
            id: (req as any).id,
            error: (error as Error).message
        });
        // Fail open or closed? Safe to fail open if DB is down, likely means main app is down anyway.
        // But to be safe, let's proceed and let other errors catch it if DB is truly broken.
        next();
    }
};
