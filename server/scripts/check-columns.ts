import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function checkColumns() {
    console.log('🔍 Checking users table columns...');

    const connectionString = "postgresql://postgres:Cumparavinde1@db.zpbuvuxpfemldsknerew.supabase.co:5432/postgres";

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        const res = await client.query(`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
        `);

        console.table(res.rows);

        client.release();
    } catch (err) {
        console.error('❌ Check failed:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
