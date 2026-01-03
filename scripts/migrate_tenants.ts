
import 'dotenv/config';
import { getDb, initializeDatabase } from '../server/database.js';
import { TenantDatabaseFactory } from '../server/services/tenantDatabaseFactory.js';
import { logger } from '../server/utils/logger.js';
import { resolve } from 'path';

/**
 * Migration Script: Migrate data from Platform DB to Tenant DBs
 * 
 * Usage: npx tsx scripts/migrate_tenants.ts
 */

const TABLES_TO_MIGRATE = [
    'projects',
    'tasks',
    'documents',
    'rfis',
    'daily_logs',
    'safety_incidents',
    'safety_hazards',
    'team',
    'clients',
    'inventory',
    'equipment',
    'timesheets',
    'channels',
    'team_messages',
    'punch_items',
    'dayworks',
    'transactions',
    'purchase_orders',
    'invoices',
    'expense_claims',
    'defects',
    'project_risks',
    'cost_codes',
    'vendors',
    'support_tickets',
    'audit_logs'
];

async function migrate() {
    try {
        logger.info('Starting Tenant Data Migration...');

        // 1. Initialize Platform DB
        await initializeDatabase();
        const platformDb = getDb();

        // 2. Get all companies
        const companies = await platformDb.all('SELECT * FROM companies');
        logger.info(`Found ${companies.length} companies to migrate.`);

        for (const company of companies) {
            const tenantId = company.id;
            logger.info(`--- Migrating Tenant: ${company.name} (${tenantId}) ---`);

            // 3. Get/Provision Tenant DB
            let tenantDb;
            try {
                // Ensure tenant DB exists
                tenantDb = await TenantDatabaseFactory.getInstance().getTenantDatabase(tenantId);
            } catch (e) {
                logger.error(`Failed to get DB for tenant ${tenantId}. Skipping.`, e);
                continue;
            }

            // 4. Migrate each table
            for (const table of TABLES_TO_MIGRATE) {
                try {
                    let rows: any[] = [];

                    if (table === 'project_risks') {
                        rows = await platformDb.all(`SELECT r.* FROM project_risks r JOIN projects p ON r.projectId = p.id WHERE p.companyId = ?`, [tenantId]);
                    } else if (table === 'team_messages') {
                        rows = await platformDb.all(`SELECT m.* FROM team_messages m JOIN channels c ON m.channelId = c.id WHERE c.companyId = ?`, [tenantId]);
                    } else {
                        // Check if table exists in Platform DB
                        try {
                            rows = await platformDb.all(`SELECT * FROM ${table} WHERE companyId = ?`, [tenantId]);
                        } catch (e: any) {
                            if (e.message.includes('column "companyid" does not exist')) {
                                logger.warn(`Skipping ${table}: No companyId column and no custom logic.`);
                                continue;
                            }
                            throw e;
                        }
                    }

                    if (rows.length > 0) {
                        logger.info(`Migrating ${rows.length} rows for ${table}...`);
                        for (const row of rows) {
                            const columns = Object.keys(row);
                            const placeholders = columns.map(() => '?').join(', ');
                            const values = Object.values(row);

                            const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
                            await tenantDb.run(sql, values);
                        }
                    }

                } catch (err: any) {
                    if (err.message.includes('no such table')) {
                        logger.warn(`Table issue for ${table}: ${err.message}`);
                    } else {
                        logger.error(`Failed to migrate ${table} for tenant ${tenantId}:`, err);
                    }
                }
            }

            // Special handling for ticket_messages (linked to support_tickets which has companyId)
            // Can't easily use loop structure above because it iterates tables.
            // Just run explicit block for ticket_messages
            try {
                const ticketMessages = await platformDb.all(
                    `SELECT m.* FROM ticket_messages m JOIN support_tickets t ON m.ticketId = t.id WHERE t.companyId = ?`,
                    [tenantId]
                );

                if (ticketMessages.length > 0) {
                    logger.info(`Migrating ${ticketMessages.length} ticket_messages...`);
                    for (const row of ticketMessages) {
                        const columns = Object.keys(row);
                        const placeholders = columns.map(() => '?').join(', ');
                        const values = Object.values(row);
                        const sql = `INSERT OR REPLACE INTO ticket_messages (${columns.join(', ')}) VALUES (${placeholders})`;
                        await tenantDb.run(sql, values);
                    }
                }
            } catch (err: any) {
                logger.warn(`Failed to migrate ticket_messages for tenant ${tenantId}: ${err.message}`);
            }

            logger.info(`--- Completed Tenant: ${tenantId} ---`);
        }

        logger.info('Migration Complete.');

    } catch (error) {
        logger.error('Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
