
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetSchema() {
    const client = await pool.connect();
    try {
        console.log('Dropping conflicting tables...');
        // Drop tables in order of dependencies (child first)
        const tables = [
            'shared_links',
            'team_messages',
            'notifications',
            'task_assignments',
            'tasks',
            'projects',
            'companies',
            'users',
            'documents',
            'clients',
            'inventory',
            'equipment',
            'rfis',
            'punch_items',
            'daily_logs',
            'dayworks',
            'safety_incidents',
            'safety_hazards',
            'timesheets',
            'channels',
            'transactions',
            'purchase_orders',
            'invoices',
            'expense_claims',
            'defects',
            'project_risks',
            'audit_logs',
            'system_settings',
            'vendors',
            'cost_codes',
            'comments',
            'activity_feed',
            'notification_preferences',
            'integrations',
            'automations'
        ];

        for (const table of tables) {
            try {
                await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
                console.log(`Dropped ${table} (if it existed)`);
            } catch (err) {
                console.warn(`Error dropping ${table}:`, err.message);
            }
        }

        console.log('Schema reset complete.');
    } catch (err) {
        console.error('Reset failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

resetSchema();
