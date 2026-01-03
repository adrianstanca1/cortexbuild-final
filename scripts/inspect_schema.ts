
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function inspectSchema() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected.');

        const tables = ['users', 'companies', 'projects', 'tasks'];

        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY column_name;
      `);
            res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

inspectSchema();
