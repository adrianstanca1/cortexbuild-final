
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Removed for security
const { Pool } = require('pg');

const pgUrl = "postgres://postgres.zwxyoeqsbntsogvgwily:Cumparavinde1.@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require";

async function harmonize() {
    console.log('🐘 Connecting to PostgreSQL (zwxyoeqsbntsogvgwily - DIRECT_URL) for schema harmonization...');
    const pool = new Pool({
        connectionString: pgUrl,
        ssl: {
            rejectUnauthorized: true
        }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected.');
        client.release();
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

harmonize();
