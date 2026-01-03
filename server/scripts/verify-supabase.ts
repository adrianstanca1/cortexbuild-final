import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
import 'dotenv/config';

async function verifySupabase() {
    const connectionString = "postgresql://postgres:Cumparavinde1@db.zpbuvuxpfemldsknerew.supabase.co:5432/postgres";

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        }
    });

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Removed for security

    try {
        const client = await pool.connect();
        console.log('✅ Connection successful!');

        const userRes = await client.query("SELECT email FROM users WHERE email = 'demo@buildpro.app'");
        if (userRes.rows.length > 0) {
            console.log('✅ Demo user exists!');
        } else {
            console.log('❌ Demo user is MISSING!');
        }

        const projectRes = await client.query("SELECT count(*) FROM projects");
        console.log(`📊 Project count: ${projectRes.rows[0].count}`);

        const sessionRes = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'impersonation_sessions')");
        console.log(`🛡️  Impersonation sessions table: ${sessionRes.rows[0].exists ? 'EXISTS' : 'MISSING'}`);

        const realtimeRes = await client.query("SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
        const isRealtimeEnabled = parseInt(realtimeRes.rows[0].count) > 0;
        console.log(`⚡ Supabase Realtime: ${isRealtimeEnabled ? 'ENABLED' : 'DISABLED (Check Replication settings)'}`);

        client.release();
    } catch (err) {
        console.error('❌ Database verification failed:', err);
    } finally {
        await pool.end();
    }
}

verifySupabase();
