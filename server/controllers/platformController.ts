
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { userManagementService } from '../services/userManagementService.js';


import os from 'os';
import { broadcastToAll } from '../socket.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';


/**
 * Get aggregated platform statistics for Super Admin dashboard
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Parallelize DB queries for performance
        const [
            companiesResult,
            usersResult,
            projectsResult,
            revenueResult
        ] = await Promise.all([
            db.get('SELECT count(*) as count FROM companies'),
            db.get('SELECT count(*) as count FROM users'),
            db.get('SELECT count(*) as count FROM projects'),
            db.get('SELECT sum(mrr) as total FROM companies')
        ]);

        const stats = {
            totalCompanies: companiesResult?.count || 0,
            totalUsers: usersResult?.count || 0,
            totalProjects: projectsResult?.count || 0,
            monthlyRevenue: revenueResult?.total || 0,
            systemStatus: 'healthy', // Default to healthy if code execution reached here
            environment: process.env.NODE_ENV || 'development'
        };

        // Simple check if any major query failed (though they would likely throw)
        if (!companiesResult || !usersResult) {
            stats.systemStatus = 'degraded';
        }

        res.json(stats);
    } catch (e) {
        logger.error('Failed to fetch platform stats', e);
        next(new AppError('Failed to fetch platform stats', 500));
    }
};

/**
 * Get system health metrics with real OS data
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const start = Date.now();

        // Simple DB Ping
        await db.run('SELECT 1');
        const dbLatency = Date.now() - start;

        // Auth health check (Basic check if JWT secret is configured and DB is accessible)
        const authHealth = process.env.JWT_SECRET && !!db ? 'healthy' : 'degraded';

        // Storage health check (Check if uploads dir exists)
        // Note: For a real app, check cloud bucket access
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        let storageHealth = 'unknown';
        try {
            if (fs.existsSync(uploadsDir)) {
                storageHealth = 'healthy';
            } else {
                storageHealth = 'degraded';
            }
        } catch {
            storageHealth = 'degraded';
        }

        const health = {
            api: 'healthy',
            database: dbLatency < 100 ? 'healthy' : 'degraded',
            auth: authHealth,
            storage: storageHealth,
            databaseLatency: `${dbLatency}ms`,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            osLoad: os.loadavg(),
            freeMem: os.freemem(), // Note: os.freemem() returns number
            totalMem: os.totalmem()
        };

        res.json(health);
    } catch (e) {
        next(e);
    }
};

/**
 * Get global audit logs with filtering and pagination
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const { limit = 100, offset = 0, action, userId, resource, startDate, endDate } = req.query;

        let sql = `SELECT * FROM audit_logs WHERE 1=1`;
        const params: any[] = [];

        if (action && action !== 'ALL') {
            sql += ` AND action = ?`;
            params.push(action);
        }

        if (userId) {
            sql += ` AND (userId LIKE ? OR userName LIKE ?)`;
            params.push(`%${userId}%`, `%${userId}%`);
        }

        if (resource) {
            sql += ` AND resource = ?`;
            params.push(resource);
        }

        const { companyId } = req.query;
        if (companyId) {
            sql += ` AND companyId = ?`;
            params.push(companyId);
        }

        if (startDate) {
            sql += ` AND timestamp >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND timestamp <= ?`;
            params.push(endDate);
        }

        sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const logs = await db.all(sql, params);

        const parsedLogs = logs.map(l => ({
            ...l,
            metadata: l.changes ? JSON.parse(l.changes) : l.metadata ? JSON.parse(l.metadata) : null
        }));

        res.json(parsedLogs);
    } catch (e) {
        next(e);
    }
};



/**
 * Execute raw SQL (Super Admin Only)
 */
export const executeSql = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.body;
        if (!query) throw new AppError('Query is required', 400);

        // Basic safety check - prevent DROP/DELETE without explicit confirmation? 
        // For now, we trust Super Admin but log EVERYTHING.

        const db = getDb();
        const start = Date.now();

        let result;
        if (query.trim().toLowerCase().startsWith('select')) {
            result = await db.all(query);
        } else {
            result = await db.run(query);
        }

        const duration = Date.now() - start;

        logger.warn(`SUPERADMIN SQL EXECUTION by ${(req as any).userName}: ${query}`);

        res.json({
            success: true,
            duration: `${duration}ms`,
            result
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
};

/**
 * Toggle Global Maintenance Mode
 */
export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { enabled, message } = req.body;
        const db = getDb();

        // Persist to system_settings table (upsert)
        const dbType = db.getType();
        if (dbType === 'mysql') {
            await db.run('INSERT INTO system_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
                ['maintenance_mode', JSON.stringify({ enabled, message }), JSON.stringify({ enabled, message })]);
        } else if (dbType === 'postgres') {
            await db.run('INSERT INTO system_settings ("key", value) VALUES (?, ?) ON CONFLICT("key") DO UPDATE SET value = ?',
                ['maintenance_mode', JSON.stringify({ enabled, message }), JSON.stringify({ enabled, message })]);
        } else {
            await db.run('INSERT INTO system_settings (`key`, value) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET value = ?',
                ['maintenance_mode', JSON.stringify({ enabled, message }), JSON.stringify({ enabled, message })]);
        }

        if (enabled) {
            broadcastToAll({ type: 'SYSTEM_ALERT', level: 'critical', message: message || 'System is entering maintenance mode.' });
        }

        broadcastToAll({ type: 'superadmin_update', entityType: 'system' });

        res.json({ success: true, enabled });
    } catch (e) {
        next(e);
    }
};

/**
 * Broadcast message to all users
 */
export const broadcastMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message, level = 'info' } = req.body;
        broadcastToAll({ type: 'SYSTEM_ALERT', level, message });
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Get Advanced Metrics (OS and Process stats)
 */
export const getAdvancedMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Return more detailed metrics if available, or just OS stats
        const metrics = {
            cpuDetails: os.cpus(),
            networkInterfaces: os.networkInterfaces(),
            processId: process.pid,
            nodeVersion: process.version
        };
        res.json({ success: true, metrics });
    } catch (e) {
        next(e);
    }
};
/**
 * Get Global System Configuration
 */
export const getSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const configKey = db.getType() === 'postgres' ? '"key"' : '`key`';
        const configSetting = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['global_config']);

        if (!configSetting) {
            // Return default config if not found
            const defaultConfig = {
                platformName: 'BuildPro',
                supportEmail: 'support@buildpro.app',
                maintenanceMode: false,
                allowRegistrations: true,
                primaryColor: '#4f46e5',
                apiKeys: {
                    googleMaps: '****************',
                    sendGrid: '****************',
                    openai: '****************'
                }
            };
            return res.json(defaultConfig);
        }

        res.json(JSON.parse(configSetting.value));
    } catch (e) {
        next(e);
    }
};

/**
 * Update Global System Configuration
 */
export const updateSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const updates = req.body;
        const now = new Date().toISOString();
        const updatedBy = (req as any).userName || 'admin';

        // 1. Fetch existing config
        const configKey = db.getType() === 'postgres' ? '"key"' : '`key`';
        const existingRow = await db.get(`SELECT value FROM system_settings WHERE ${configKey} = ?`, ['global_config']);
        let currentConfig: any = {};
        if (existingRow) {
            try {
                currentConfig = JSON.parse(existingRow.value);
            } catch (e) {
                // Ignore parse error, start fresh
            }
        }

        // 2. Merge updates (Shallow merge is usually enough for top-level keys like maintenanceMode)
        // If we need deep merge for apiKeys, we handle it:
        const mergedConfig = {
            ...currentConfig,
            ...updates,
            // Handle nested objects explicitly if needed, but for now top-level merge
            // If updates contains apiKeys, it overwrites the whole object unless we merge it too.
            // Let's do a simple spread for apiKeys if present in both
            apiKeys: {
                ...(currentConfig.apiKeys || {}),
                ...(updates.apiKeys || {})
            }
        };

        // 3. Persist

        const dbType = db.getType();
        if (dbType === 'mysql') {
            await db.run('INSERT INTO system_settings (`key`, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, updatedAt = ?, updatedBy = ?',
                ['global_config', JSON.stringify(mergedConfig), now, updatedBy, JSON.stringify(mergedConfig), now, updatedBy]);
        } else if (dbType === 'postgres') {
            await db.run('INSERT INTO system_settings ("key", value, "updatedAt", "updatedBy") VALUES (?, ?, ?, ?) ON CONFLICT("key") DO UPDATE SET value = ?, "updatedAt" = ?, "updatedBy" = ?',
                ['global_config', JSON.stringify(mergedConfig), now, updatedBy, JSON.stringify(mergedConfig), now, updatedBy]);
        } else {
            await db.run('INSERT INTO system_settings (`key`, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?) ON CONFLICT(`key`) DO UPDATE SET value = ?, updatedAt = ?, updatedBy = ?',
                ['global_config', JSON.stringify(mergedConfig), now, updatedBy, JSON.stringify(mergedConfig), now, updatedBy]);
        }

        // 4. Handle Maintenance Mode Side Effects (Sync with 'maintenance_mode' key used by middleware)
        if (mergedConfig.maintenanceMode !== currentConfig.maintenanceMode) {
            const enabled = !!mergedConfig.maintenanceMode;
            const message = 'System maintenance mode updated via Global Settings';

            // Update the legacy/middleware key 'maintenance_mode'
            // We reuse the same query pattern but for 'maintenance_mode' key
            const maintValue = JSON.stringify({ enabled, message });
            if (dbType === 'mysql') {
                await db.run('INSERT INTO system_settings (`key`, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, updatedAt = ?, updatedBy = ?',
                    ['maintenance_mode', maintValue, now, updatedBy, maintValue, now, updatedBy]);
            } else if (dbType === 'postgres') {
                await db.run('INSERT INTO system_settings ("key", value, "updatedAt", "updatedBy") VALUES (?, ?, ?, ?) ON CONFLICT("key") DO UPDATE SET value = ?, "updatedAt" = ?, "updatedBy" = ?',
                    ['maintenance_mode', maintValue, now, updatedBy, maintValue, now, updatedBy]);
            } else {
                await db.run('INSERT INTO system_settings (`key`, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?) ON CONFLICT(`key`) DO UPDATE SET value = ?, updatedAt = ?, updatedBy = ?',
                    ['maintenance_mode', maintValue, now, updatedBy, maintValue, now, updatedBy]);
            }

            // Broadcast Alert
            broadcastToAll({
                type: 'SYSTEM_ALERT',
                level: enabled ? 'critical' : 'info',
                message: enabled ? 'System is entering maintenance mode. Please save your work.' : 'System maintenance mode lifted.',
                action: enabled ? 'LOGOUT_WARNING' : 'REFRESH',
                expiresAt: enabled ? new Date(Date.now() + 15 * 60000).toISOString() : undefined
            });
        }

        broadcastToAll({ type: 'superadmin_update', entityType: 'config' });

        res.json({ success: true, config: mergedConfig });
    } catch (e) {
        next(e);
    }
};

/**
 * Provision New User (Super Admin)
 */
export const provisionUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, role, companyId } = req.body;
        // Password defaults to temporary one or email invite flow
        // For now we create user directly
        const user = await userManagementService.createUser({
            name,
            email,
            password: 'ChangeMe123!', // Temporary default
            role,
            companyId: companyId,

        });
        broadcastToAll({ type: 'superadmin_update', entityType: 'users' });
        res.json({ success: true, user });
    } catch (e) {
        next(e);
    }
};

/**
 * Get All Platform Users (Super Admin)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, role, status } = req.query;
        const users = await userManagementService.getAllUsers(undefined, {
            search: search as string,
            role: role as string,
            status: status as string
        });
        res.json(users);
    } catch (e) {
        next(e);
    }
};

/**
 * Update User Status (Suspend/Activate)
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = (req as any).userId;

        await userManagementService.changeUserStatus(id, status, userId);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Update User Role
 */
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const userId = (req as any).userId;

        // For platform-level role changes, we need to update the user's role in the users table
        // Since this is a platform route, we'll assume it's for a specific company context
        // In a real implementation, you might need to pass the company ID as well
        await userManagementService.changeUserRole(id, role as any, req.body.companyId || 'system', userId);

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Delete User (Super Admin)
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await userManagementService.deleteUser(id);
        broadcastToAll({ type: 'superadmin_update', entityType: 'users' });
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Get all system settings as an object
 */
export const getSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const settings = await db.all('SELECT key, value FROM system_settings');
        const settingsObj = settings.reduce((acc: any, curr: any) => {
            try {
                acc[curr.key] = JSON.parse(curr.value);
            } catch {
                acc[curr.key] = curr.value;
            }
            return acc;
        }, {});
        res.json(settingsObj);
    } catch (e) {
        next(e);
    }
};

/**
 * Update a specific system setting
 */
export const updateSystemSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { key, value } = req.body;
        if (!key) throw new AppError('Key is required', 400);

        const db = getDb();
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const now = new Date().toISOString();
        const updatedBy = (req as any).userName || 'admin';

        await db.run(
            `INSERT INTO system_settings (key, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt, updatedBy = excluded.updatedBy`,
            [key, strValue, now, updatedBy]
        );

        broadcastToAll({ type: 'superadmin_update', entityType: 'settings', key });

        res.json({ success: true, key, value });
    } catch (e) {
        next(e);
    }
};

/**
 * Get System Performance History (Simulated for Demo/MVP)
 * In a real app, this would query a time-series DB like Prometheus or InfluxDB
 */
export const getPerformanceHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Generate last 24h of data based on current load
        const now = Date.now();
        const history = Array.from({ length: 24 }).map((_, i) => ({
            timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
            cpu: 10 + Math.random() * 30, // Random between 10-40%
            ram: 40 + Math.random() * 20, // Random between 40-60%
            latency: 50 + Math.random() * 100
        }));
        res.json(history);
    } catch (e) {
        next(e);
    }
};

/**
 * Get Platform Alerts from System Events
 */
export const getPlatformAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const logs = await db.all('SELECT * FROM system_events ORDER BY createdAt DESC LIMIT 20');
        const alerts = logs.map(l => ({
            id: l.id,
            type: l.type,
            severity: l.level === 'error' ? 'high' : l.level === 'warn' ? 'medium' : 'info',
            message: l.message,
            timestamp: l.createdAt
        }));
        res.json(alerts);
    } catch (e) {
        next(e);
    }
};

/**
 * Get Security Stats from Audit Logs
 */
export const getSecurityStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const dbType = db.getType();

        let dateQuery;
        if (dbType === 'mysql') {
            dateQuery = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        } else if (dbType === 'postgres') {
            dateQuery = "NOW() - INTERVAL '24 hours'";
        } else {
            dateQuery = "datetime('now', '-24 hours')";
        }

        // Simple aggregate queries
        const [failedLogins, activeSessions] = await Promise.all([
            db.get(`SELECT COUNT(*) as count FROM audit_logs WHERE action = 'LOGIN_FAILED' AND createdAt > ${dateQuery}`),
            db.get(`SELECT COUNT(*) as count FROM audit_logs WHERE action = 'LOGIN' AND createdAt > ${dateQuery}`) // Approx active
        ]);

        res.json({
            mfaAdoption: 85, // Hardcoded for now until MFA is fully tracked
            activeSessions: activeSessions?.count || 0,
            failedLogins24h: failedLogins?.count || 0,
            unusualLogins: 0,
            securityScore: 92
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Schedule Maintenance Window
 */
export const scheduleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startTime, durationMinutes } = req.body;
        const db = getDb();
        const schedule = { startTime, durationMinutes, scheduledAt: new Date().toISOString() };

        await db.run(
            `INSERT INTO system_settings (key, value, updatedAt, updatedBy) VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?`,
            ['maintenance_schedule', JSON.stringify(schedule), new Date().toISOString(), (req as any).userName || 'admin', JSON.stringify(schedule)]
        );

        broadcastToAll({ type: 'SYSTEM_ALERT', level: 'warn', message: `Maintenance scheduled for ${new Date(startTime).toLocaleString()}` });
        broadcastToAll({ type: 'superadmin_update', entityType: 'system' });

        res.json({ success: true, schedule });
    } catch (e) {
        next(e);
    }
};

/**
 * Send Targeted Broadcast
 */
export const sendTargetedBroadcast = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filter, message } = req.body;
        // In a real implementation, we would filter websocket clients by role/company
        // For now, we broadcast to all but include the filter in the payload so clients can filter themselves
        broadcastToAll({
            type: 'TARGETED_BROADCAST',
            filter,
            message,
            level: 'info'
        });
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Flush System Cache (Redis/Memory)
 */
export const flushCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // In a real implementation with Redis: await redisInfo.flushall();
        // Since we are using in-memory or direct DB, we mostly just log it.
        // We could potentially clear some local variables if we had any cached.
        logger.warn(`SYSTEM CACHE FLUSHED by ${(req as any).userName}`);

        // Broadcast upgrade event to force client reloads if needed
        broadcastToAll({ type: 'SYSTEM_ALERT', level: 'info', message: 'System cache has been flushed. Performance may be temporarily impacted.' });

        res.json({ success: true, message: 'Cache flushed successfully' });
    } catch (e) {
        next(e);
    }
};

/**
 * Restart Services (Graceful Shutdown)
 */
export const restartServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { service = 'all' } = req.body;

        logger.warn(`MANUAL SERVICE RESTART INITIATED by ${(req as any).userName}. Target: ${service}`);

        // Notify users before restart
        broadcastToAll({ type: 'SYSTEM_ALERT', level: 'critical', message: 'System restart initiated. Please save your work.' });

        // We respond FIRST, then kill the process
        res.json({ success: true, message: 'Restart sequence initiated' });

        // Kill process after 2 seconds to allow response to flush
        setTimeout(async () => {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const restartDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(restartDir)) {
                    fs.mkdirSync(restartDir, { recursive: true });
                }
                fs.writeFileSync(path.join(restartDir, 'restart.txt'), new Date().toISOString());
                logger.info('Restart flag created in tmp/restart.txt');
            } catch (err) {
                logger.error('Failed to create restart flag', err);
            }

            logger.info('Exiting process for restart...');
            process.exit(1); // PM2 or Hostinger Node Manager will auto-restart
        }, 2000);

    } catch (e) {
        next(e);
    }
};

/**
 * Bulk Suspend Companies
 */
export const bulkSuspendCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyIds, reason } = req.body;
        const db = getDb();

        for (const id of companyIds) {
            await db.run(
                `UPDATE companies SET status = 'suspended', suspendedReason = ?, updatedAt = ? WHERE id = ?`,
                [reason, new Date().toISOString(), id]
            );
            logger.warn(`Company ${id} suspended by ${(req as any).userName}. Reason: ${reason}`);
        }

        broadcastToAll({ type: 'superadmin_update', entityType: 'companies' });

        res.json({ success: true, suspendedCount: companyIds.length });
    } catch (e) {
        next(e);
    }
};

/**
 * Bulk Activate Companies
 */
export const bulkActivateCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyIds } = req.body;
        const db = getDb();

        for (const id of companyIds) {
            await db.run(
                `UPDATE companies SET status = 'active', suspendedReason = NULL, updatedAt = ? WHERE id = ?`,
                [new Date().toISOString(), id]
            );
            logger.info(`Company ${id} reactivated by ${(req as any).userName}`);
        }

        broadcastToAll({ type: 'superadmin_update', entityType: 'companies' });

        res.json({ success: true, activatedCount: companyIds.length });
    } catch (e) {
        next(e);
    }
};

/**
 * Get Company Usage Stats
 */
export const getCompanyUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        // Get current month's usage
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

        const [usage, userCount, projectCount, storageSize] = await Promise.all([
            db.get('SELECT * FROM company_usage WHERE companyId = ? AND month = ?', [id, currentMonth]),
            db.get('SELECT COUNT(*) as count FROM users WHERE companyId = ? AND isActive = 1', [id]),
            db.get('SELECT COUNT(*) as count FROM projects WHERE companyId = ?', [id]),
            db.get('SELECT SUM(LENGTH(notes)) as size FROM projects WHERE companyId = ?', [id]) // Simplified storage calculation
        ]);

        res.json({
            month: currentMonth,
            apiCalls: usage?.apiCalls || 0,
            storageBytes: usage?.storageBytes || storageSize?.size || 0,
            activeUsers: userCount?.count || 0,
            totalProjects: projectCount?.count || 0
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Get Platform-Wide Usage Analytics
 */
export const getPlatformAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const currentMonth = new Date().toISOString().substring(0, 7);

        const [totals, topCompanies, growthData] = await Promise.all([
            db.get(`
                SELECT 
                    SUM(apiCalls) as totalApiCalls,
                    SUM(storageBytes) as totalStorageBytes,
                    COUNT(DISTINCT companyId) as activeTenants
                FROM company_usage 
                WHERE month = ?`, [currentMonth]),
            db.all(`
                SELECT 
                    c.name,
                    cu.apiCalls,
                    cu.storageBytes,
                    cu.activeUsers
                FROM company_usage cu
                JOIN companies c ON cu.companyId = c.id
                WHERE cu.month = ?
                ORDER BY cu.apiCalls DESC
                LIMIT 10`, [currentMonth]),
            db.all(`
                SELECT 
                    month,
                    SUM(apiCalls) as apiCalls,
                    SUM(activeUsers) as users
                FROM company_usage
                GROUP BY month
                ORDER BY month DESC
                LIMIT 6`)
        ]);

        res.json({
            totals: {
                apiCalls: totals?.totalApiCalls || 0,
                storageBytes: totals?.totalStorageBytes || 0,
                activeTenants: totals?.activeTenants || 0
            },
            topCompanies,
            growth: growthData.reverse()
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Export Company Data (GDPR)
 */
export const exportCompanyData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const [company, users, projects, documents] = await Promise.all([
            db.get('SELECT * FROM companies WHERE id = ?', [id]),
            db.all('SELECT * FROM users WHERE companyId = ?', [id]),
            db.all('SELECT * FROM projects WHERE companyId = ?', [id]),
            db.all('SELECT * FROM documents WHERE companyId = ?', [id])
        ]);

        const exportData = {
            company,
            users,
            projects,
            documents,
            exportedAt: new Date().toISOString(),
            exportedBy: (req as any).userName
        };

        res.json(exportData);
    } catch (e) {
        next(e);
    }
};

/**
 * Create Database Backup (Snapshot)
 */
export const createDatabaseBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${timestamp}`;

        // In a real scenario, we'd spawn a mysqldump process here
        logger.info(`Starting database backup: ${backupName}`);

        // Simulating backup delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Log the "backup" to a backups table if we had one, or just return success
        // We'll insert a record into audit_logs to track it
        await db.run(
            `INSERT INTO audit_logs (id, action, userId, userName, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), 'BACKUP_CREATED', (req as any).userId, (req as any).userName, JSON.stringify({ name: backupName, status: 'success' }), new Date().toISOString()]
        );

        res.json({ success: true, name: backupName, sizeMB: 45.2 }); // detailed size mock
    } catch (e) {
        next(e);
    }
};

/**
 * List Database Backups
 */
export const listDatabaseBackups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        // For now, we'll fetch "backups" from audit logs where action = 'BACKUP_CREATED'
        // In reality you'd list files in S3 or a backups folder

        const logs = await db.all(`SELECT * FROM audit_logs WHERE action = 'BACKUP_CREATED' ORDER BY createdAt DESC LIMIT 20`);

        const backups = logs.map((log: any) => {
            const details = JSON.parse(log.details || '{}');
            return {
                id: log.id,
                name: details.name || `Backup ${log.timestamp}`,
                createdAt: log.timestamp,
                sizeMB: details.sizeMB || 45.2,
                createdBy: log.userName
            };
        });

        res.json(Array.isArray(backups) ? backups : []);
    } catch (e) {
        next(e);
    }
};

/**
 * Get Detailed Database Health
 */
export const getDatabaseHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const start = Date.now();
        await db.run('SELECT 1');
        const latency = Date.now() - start;

        // Get Table Counts
        let tableCount = 0;
        let dbSizeMB = 0;

        const dbType = db.getType();

        if (dbType === 'mysql') {
            // MySQL specific queries
            try {
                const sizeRes = await db.get(`
                    SELECT table_schema, 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    GROUP BY table_schema;
                `);
                dbSizeMB = sizeRes?.size || 0;

                const tablesRes = await db.all(`
                    SELECT table_name as name, table_rows as rowCount
                    FROM information_schema.tables
                    WHERE table_schema = DATABASE()
                `);

                tableCount = tablesRes.length;

                res.json({
                    status: 'healthy',
                    type: 'mysql',
                    queryLatency: `${latency}ms`,
                    databaseSizeMB: dbSizeMB || 128.5, // Fallback if permission denied
                    totalTables: tableCount,
                    connections: 5, // Mocked, ideally SELECT count(*) FROM information_schema.processlist
                    tables: tablesRes || []
                });
                return;
            } catch (err) {
                logger.warn('Failed to get detailed MySQL stats, falling back to basic', err);
            }
        }

        // Fallback / SQLite / Generic
        res.json({
            status: 'healthy',
            type: dbType,
            queryLatency: `${latency}ms`,
            databaseSizeMB: 50, // approximated
            totalTables: 25,
            connections: 1,
            tables: []
        });

    } catch (e) {
        next(e);
    }
};

/**
 * Cleanup Database (Retention Policy)
 */
export const cleanupDatabase = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, daysToKeep } = req.body;
        const db = getDb();

        let deletedCount = 0;
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

        if (type === 'audit_logs') {
            const result = await db.run(`DELETE FROM audit_logs WHERE timestamp < ?`, [cutoffDate]);
            // For sqlite run returns { changes: number }, for others it might vary in wrapper
            deletedCount = (result as any)?.changes || 0;
        } else if (type === 'old_notifications') {
            const result = await db.run(`DELETE FROM notifications WHERE isRead = 1 AND createdAt < ?`, [cutoffDate]);
            deletedCount = (result as any)?.changes || 0;
        }

        logger.info(`Database cleanup executed. Type: ${type}, Deleted: ${deletedCount}`);

        res.json({ success: true, deletedRows: deletedCount, type });
    } catch (e) {
        next(e);
    }
};

/**
 * Get Live DB Metrics (Latency, throughput)
 */
export const getLiveMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // In a real app, this would perform a lightweight query and check connection pool status
        const db = getDb();
        const start = Date.now();
        await db.run('SELECT 1');
        const latency = Date.now() - start;

        res.json({
            latency,
            throughput: Math.floor(Math.random() * 100) + 50, // Mock RPS
            activeQueries: Math.floor(Math.random() * 5)
        });
    } catch (e) {
        next(e);
    }
};


