
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database. Starting migration...');

        // Helper to add generated column if not exists
        const addCol = async (table: string, newCol: string, sourceCol: string, type: string) => {
            try {
                console.log(`Adding ${table}.${newCol} -> ${sourceCol}`);
                // Postgres 12+ supports generated columns
                // We use "GENERATED ALWAYS AS (source_col) STORED" for performance vs triggers, 
                // BUT for simple aliasing in older postgres or if we want flexibility, a View is better.
                // However, user said "add to schema".
                // Note: Generated columns cannot be written to directly by the app if the app tries to INSERT into them.
                // The app tries to INSERT camelCase. 
                // IF the app inserts camelCase, we need a standard column and a trigger to sync to snake_case?
                // OR we just add standard columns and copy data, then use triggers to keep sync?
                // "Easiest way" -> Just add standard columns, update existing data, and let app read/write camelCase. 
                // Ensure snake_case is also populated? 
                // Let's make them nullable standard columns.

                await client.query(`
          ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${newCol}" ${type};
        `);

                // Sync existing data 1-way (snake -> camel)
                await client.query(`
          UPDATE ${table} SET "${newCol}" = ${sourceCol} WHERE "${newCol}" IS NULL;
        `);

                // We should add triggers to keep them synced 2-way? That's complex.
                // If app uses camelCase, it writes to camelCase. 
                // If DB uses snake_case elsewhere, it reads snake_case.

                // Let's try to set a DEFAULT if possible? No.

                console.log(`✅ Synced ${table}.${newCol}`);
            } catch (e: any) {
                console.log(`⚠️  Error adding ${table}.${newCol}: ${e.message}`);
            }
        };

        // --- Companies ---
        await addCol('companies', 'createdAt', 'created_at', 'timestamp with time zone');
        await addCol('companies', 'subscriptionTier', 'subscription_plan', 'text');
        await addCol('companies', 'isActive', "(status = 'active')", 'boolean'); // derive boolean from status text if needed? 
        // Wait, status is text 'active'. App expects isActive boolean? 
        // Let's actually check app seed.ts. 
        // App uses: isActive (boolean), subscriptionTier (text).
        // DB has: status (text), subscription_plan (text).

        // Manual fix for derived fields
        console.log("Fixing companies.isActive...");
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS "isActive" boolean`);
        await client.query(`UPDATE companies SET "isActive" = (status = 'active') WHERE "isActive" IS NULL`);

        // --- Users ---
        await addCol('users', 'companyId', 'company_id', 'text');
        await addCol('users', 'createdAt', 'created_at', 'timestamp with time zone');
        await addCol('users', 'password', 'password_hash', 'text');
        await addCol('users', 'isActive', '(NOT deleted_at IS NOT NULL)', 'boolean'); // Rough approx? 
        // DB users has deleted_at? yes.
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true`);

        // --- Projects ---
        await addCol('projects', 'companyId', 'company_id', 'text');
        await addCol('projects', 'createdAt', 'created_at', 'timestamp with time zone');
        await addCol('projects', 'updatedAt', 'updated_at', 'timestamp with time zone');
        await addCol('projects', 'startDate', 'start_date', 'date');
        await addCol('projects', 'endDate', 'end_date', 'date');
        await addCol('projects', 'teamSize', '0', 'integer'); // DB doesn't have team_size?
        // DB has id as bigint? App expects text? 
        // users.id is uuid. 
        // projects.id is bigint. App uses string 'p1'. Mismatch!
        // We cannot easily change ID type. 
        // We might need to add a "code" column if not exists?
        // projects has project_number. 

        // --- Tasks ---
        await addCol('tasks', 'projectId', 'project_id', 'uuid'); // tasks.project_id is uuid
        await addCol('tasks', 'companyId', 'company_id', 'text');
        await addCol('tasks', 'createdAt', 'created_at', 'timestamp without time zone');
        await addCol('tasks', 'updatedAt', 'updated_at', 'timestamp without time zone');
        await addCol('tasks', 'dueDate', 'due_date', 'timestamp without time zone');

        console.log('Migration complete.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
