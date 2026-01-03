import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function debugTriggers() {
    console.log('🔍 Debugging Auth Triggers...');

    // Using Postgres connection
    const connectionString = "postgresql://postgres:Cumparavinde1@db.zpbuvuxpfemldsknerew.supabase.co:5432/postgres";

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        // 1. Get Triggers on auth.users
        const triggersRes = await client.query(`
            SELECT 
                trigger_name,
                event_manipulation,
                action_statement,
                action_orientation
            FROM information_schema.triggers
            WHERE event_object_table = 'users'
            AND event_object_schema = 'public'
        `);

        console.log('👉 Triggers on public.users:', triggersRes.rows);

        // 2. We suspect a function. Let's list functions in public schema that might be related
        // checking for 'handle_new_user' or similar
        const funcRes = await client.query(`
            SELECT proname, prosrc 
            FROM pg_proc 
            JOIN pg_namespace ns ON pg_proc.pronamespace = ns.oid 
            WHERE proname LIKE '%handle_new_user%' OR proname LIKE '%on_auth%'
        `);

        console.log('👉 Potential Trigger Functions:', funcRes.rows);

        client.release();
    } catch (err) {
        console.error('❌ Debug failed:', err);
    } finally {
        await pool.end();
    }
}

debugTriggers();
