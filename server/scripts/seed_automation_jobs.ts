import 'dotenv/config';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';

const defaultJobs = [
    {
        id: 'job-cleanup-audit-logs',
        name: 'Daily Audit Log Cleanup',
        type: 'cleanup_audit_logs',
        schedule: '0 2 * * *', // 2 AM daily
        enabled: true,
        config: JSON.stringify({ daysToKeep: 90 }),
        createdBy: 'system',
        createdAt: new Date().toISOString()
    },
    {
        id: 'job-archive-old-projects',
        name: 'Monthly Project Archival',
        type: 'cleanup_old_projects',
        schedule: '0 3 1 * *', // 3 AM on the 1st of each month
        enabled: true,
        config: JSON.stringify({ daysInactive: 365 }),
        createdBy: 'system',
        createdAt: new Date().toISOString()
    },
    {
        id: 'job-database-backup',
        name: 'Weekly Database Backup',
        type: 'database_backup',
        schedule: '0 1 * * 0', // 1 AM every Sunday
        enabled: true,
        config: JSON.stringify({}),
        createdBy: 'system',
        createdAt: new Date().toISOString()
    },
    {
        id: 'job-purge-inactive-users',
        name: 'Quarterly Inactive User Purge',
        type: 'inactive_user_purge',
        schedule: '0 4 1 */3 *', // 4 AM on the 1st day of every 3rd month
        enabled: false, // Disabled by default for safety
        config: JSON.stringify({ daysInactive: 180 }),
        createdBy: 'system',
        createdAt: new Date().toISOString()
    }
];

async function seedDefaultJobs() {
    // Initialize database first
    const { initializeDatabase } = await import('../database.js');
    await initializeDatabase();

    const db = getDb();

    logger.info('Seeding default automation jobs...');

    for (const job of defaultJobs) {
        try {
            // Check if job already exists
            const existing = await db.get('SELECT id FROM automation_jobs WHERE id = ?', [job.id]);

            if (existing) {
                logger.info(`Job ${job.name} already exists, skipping...`);
                continue;
            }

            await db.run(
                `INSERT INTO automation_jobs (id, name, type, schedule, enabled, config, createdBy, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [job.id, job.name, job.type, job.schedule, job.enabled ? 1 : 0, job.config, job.createdBy, job.createdAt]
            );

            logger.info(`✓ Created job: ${job.name}`);
        } catch (error) {
            logger.error(`Failed to create job ${job.name}:`, error);
        }
    }

    logger.info('Default automation jobs seeded successfully!');
    process.exit(0);
}

seedDefaultJobs().catch(error => {
    logger.error('Failed to seed automation jobs:', error);
    process.exit(1);
});
