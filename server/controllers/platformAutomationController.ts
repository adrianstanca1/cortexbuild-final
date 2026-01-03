import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get all automation jobs
 */
export const getAutomationJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const jobs = await db.all('SELECT * FROM automation_jobs ORDER BY createdAt DESC');

        const parsedJobs = jobs.map(job => ({
            ...job,
            config: job.config ? JSON.parse(job.config) : {},
            enabled: Boolean(job.enabled)
        }));

        res.json(parsedJobs);
    } catch (e) {
        next(e);
    }
};

/**
 * Create a new automation job
 */
export const createAutomationJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, type, schedule, config } = req.body;
        const db = getDb();
        const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdBy = (req as any).userName || 'admin';

        await db.run(
            `INSERT INTO automation_jobs (id, name, type, schedule, config, createdBy, createdAt, enabled)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, type, schedule, JSON.stringify(config || {}), createdBy, new Date().toISOString(), 1]
        );

        res.json({ success: true, id });
    } catch (e) {
        next(e);
    }
};

/**
 * Update automation job
 */
export const updateAutomationJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, schedule, enabled, config } = req.body;
        const db = getDb();

        await db.run(
            `UPDATE automation_jobs 
             SET name = ?, schedule = ?, enabled = ?, config = ?
             WHERE id = ?`,
            [name, schedule, enabled ? 1 : 0, JSON.stringify(config || {}), id]
        );

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Execute automation job manually
 */
export const executeAutomationJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const job = await db.get('SELECT * FROM automation_jobs WHERE id = ?', [id]);
        if (!job) throw new AppError('Job not found', 404);

        logger.info(`Executing automation job: ${job.name} (${job.type})`);

        // Execute based on type
        let result;
        switch (job.type) {
            case 'cleanup_audit_logs':
                result = await cleanupAuditLogs(db, job.config ? JSON.parse(job.config) : {});
                break;
            case 'cleanup_old_projects':
                result = await cleanupOldProjects(db, job.config ? JSON.parse(job.config) : {});
                break;
            case 'database_backup':
                result = await createDatabaseBackup(db);
                break;
            case 'inactive_user_purge':
                result = await purgeInactiveUsers(db, job.config ? JSON.parse(job.config) : {});
                break;
            default:
                throw new AppError('Unknown job type', 400);
        }

        // Update last run
        await db.run(
            'UPDATE automation_jobs SET lastRun = ? WHERE id = ?',
            [new Date().toISOString(), id]
        );

        res.json({ success: true, result });
    } catch (e) {
        next(e);
    }
};

/**
 * Delete automation job
 */
export const deleteAutomationJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.run('DELETE FROM automation_jobs WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

// ===== Automation Job Executors =====

async function cleanupAuditLogs(db: any, config: any) {
    const daysToKeep = config.daysToKeep || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.run(
        'DELETE FROM audit_logs WHERE timestamp < ?',
        [cutoffDate.toISOString()]
    );

    return { deletedRows: result.changes || 0, cutoffDate: cutoffDate.toISOString() };
}

async function cleanupOldProjects(db: any, config: any) {
    const daysInactive = config.daysInactive || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // Archive projects not updated in X days
    const result = await db.run(
        `UPDATE projects SET status = 'archived' 
         WHERE status != 'archived' AND updatedAt < ?`,
        [cutoffDate.toISOString()]
    );

    return { archivedProjects: result.changes || 0, cutoffDate: cutoffDate.toISOString() };
}

async function createDatabaseBackup(db: any) {
    // This is a placeholder - actual implementation would depend on database type
    logger.info('Database backup initiated');
    return {
        message: 'Backup initiated',
        timestamp: new Date().toISOString(),
        note: 'Actual backup implementation requires database-specific logic'
    };
}

async function purgeInactiveUsers(db: any, config: any) {
    const daysInactive = config.daysInactive || 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // Mark users as inactive (don't delete for audit purposes)
    const result = await db.run(
        `UPDATE users SET isActive = 0 
         WHERE isActive = 1 AND updatedAt < ? AND role != 'SUPERADMIN'`,
        [cutoffDate.toISOString()]
    );

    return { deactivatedUsers: result.changes || 0, cutoffDate: cutoffDate.toISOString() };
}
