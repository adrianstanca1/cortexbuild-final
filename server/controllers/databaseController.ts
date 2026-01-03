import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get database health metrics
 */
export const getDatabaseHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Get table sizes
        const tables = await db.all(`
            SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        const tableSizes = await Promise.all(
            tables.map(async (table) => {
                const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                return {
                    name: table.name,
                    rowCount: count.count
                };
            })
        );

        // Get database file size (SQLite specific)
        let dbSize = 0;
        try {
            const dbPath = process.env.DATABASE_TYPE === 'sqlite' ? './cortexbuild.db' : null;
            if (dbPath && fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                dbSize = stats.size;
            }
        } catch (e) {
            logger.warn('Could not get database file size:', e);
        }

        // Test query performance
        const start = Date.now();
        await db.get('SELECT 1');
        const queryLatency = Date.now() - start;

        res.json({
            status: 'healthy',
            tables: tableSizes,
            totalTables: tables.length,
            databaseSize: dbSize,
            databaseSizeMB: (dbSize / 1024 / 1024).toFixed(2),
            queryLatency: `${queryLatency}ms`,
            type: process.env.DATABASE_TYPE || 'sqlite',
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Create database backup
 */
export const createDatabaseBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${timestamp}.db`;

        // SQLite-specific backup
        if (process.env.DATABASE_TYPE === 'sqlite' || !process.env.DATABASE_TYPE) {
            const sourcePath = './cortexbuild.db';
            const backupDir = './backups';
            const backupPath = path.join(backupDir, backupName);

            // Create backups directory if it doesn't exist
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Copy database file
            fs.copyFileSync(sourcePath, backupPath);

            const stats = fs.statSync(backupPath);

            logger.info(`Database backup created: ${backupPath}`);

            res.json({
                success: true,
                backup: {
                    name: backupName,
                    path: backupPath,
                    size: stats.size,
                    sizeMB: (stats.size / 1024 / 1024).toFixed(2),
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            // For MySQL/Postgres, would use mysqldump or pg_dump
            res.json({
                success: true,
                message: 'Backup initiated for non-SQLite database',
                note: 'MySQL/Postgres backups require external tools'
            });
        }
    } catch (e) {
        next(e);
    }
};

/**
 * List available backups
 */
export const listBackups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const backupDir = './backups';

        if (!fs.existsSync(backupDir)) {
            return res.json({ backups: [] });
        }

        const files = fs.readdirSync(backupDir);
        const backups = files
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const stats = fs.statSync(path.join(backupDir, f));
                return {
                    name: f,
                    size: stats.size,
                    sizeMB: (stats.size / 1024 / 1024).toFixed(2),
                    createdAt: stats.birthtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ backups });
    } catch (e) {
        next(e);
    }
};

/**
 * Cleanup old data
 */
export const cleanupDatabase = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, daysToKeep = 90 } = req.body;
        const db = getDb();

        // Validate daysToKeep to prevent issues
        const safeDays = Math.min(Math.max(1, parseInt(String(daysToKeep)) || 90), 3650); // Max 10 years

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - safeDays);

        let result;

        switch (type) {
            case 'audit_logs':
                result = await db.run(
                    'DELETE FROM audit_logs WHERE timestamp < ?',
                    [cutoffDate.toISOString()]
                );
                break;
            case 'system_events':
                result = await db.run(
                    'DELETE FROM system_events WHERE createdAt < ? AND isRead = 1',
                    [cutoffDate.toISOString()]
                );
                break;
            case 'old_notifications':
                result = await db.run(
                    'DELETE FROM notifications WHERE createdAt < ?',
                    [cutoffDate.toISOString()]
                );
                break;
            default:
                return res.status(400).json({ error: 'Invalid cleanup type' });
        }

        logger.info(`Database cleanup: ${type}, deleted ${result.changes} rows`);

        res.json({
            success: true,
            type,
            deletedRows: result.changes || 0,
            cutoffDate: cutoffDate.toISOString()
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Get live system metrics
 */
export const getLiveMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Get active connections (simulated - would need WebSocket tracking)
        const activeConnections = 0; // Placeholder

        // Get recent error count
        const recentErrors = await db.get(`
            SELECT COUNT(*) as count 
            FROM audit_logs 
            WHERE action LIKE '%error%' 
            AND timestamp > datetime('now', '-1 hour')
        `);

        // System resource usage
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

        res.json({
            activeConnections,
            recentErrors: recentErrors?.count || 0,
            cpu: {
                usage: cpuUsage.toFixed(2),
                cores: os.cpus().length
            },
            memory: {
                usage: memoryUsage.toFixed(2),
                total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB'
            },
            uptime: os.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        next(e);
    }
};
