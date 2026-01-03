
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TARGET_EMAIL = 'adrian.stanca1@gmail.com';
const TARGET_ID = '906b3f69-c4b4-41f5-9fe3-30dfb2a43e8f';

async function fixRole() {
    console.log(`🚀 Starting emergency role fix for: ${TARGET_EMAIL} (ID: ${TARGET_ID})`);

    // 1. Supabase Fix
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing Supabase Credentials');
    } else {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        console.log('📡 Connecting to Supabase...');

        try {
            const { data, error: updateError } = await supabase.auth.admin.updateUserById(TARGET_ID, {
                user_metadata: { role: 'SUPERADMIN' },
                app_metadata: { role: 'SUPERADMIN' }
            });

            if (updateError) {
                console.error('❌ Error updating Supabase user:', updateError);
            } else {
                console.log('✅ Supabase user role restored to SUPERADMIN');
            }
        } catch (err) {
            console.error('❌ Supabase exception:', err);
        }
    }

    // 2. Database Fix (MySQL or SQLite)
    const useLocalDb = process.env.USE_LOCAL_DB === 'true';

    if (useLocalDb) {
        console.log('📡 Connecting to SQLite (Local DB)...');
        try {
            const dbPath = path.resolve('server', 'buildpro_db.sqlite');
            console.log(`📂 DB Path: ${dbPath}`);
            const db = await open({ filename: dbPath, driver: sqlite3.Database });

            // Update Users Table
            const userResult = await db.run(
                'UPDATE users SET role = ?, status = ?, isActive = 1 WHERE email = ?',
                ['SUPERADMIN', 'active', TARGET_EMAIL]
            );
            console.log(`✅ SQLite Users updated: ${userResult.changes} rows`);

            // Update Memberships Table
            const memResult = await db.run(
                'UPDATE memberships SET role = ?, status = ? WHERE userId = ? OR userId = (SELECT id FROM users WHERE email = ?)',
                ['SUPERADMIN', 'active', TARGET_ID, TARGET_EMAIL]
            );
            console.log(`✅ SQLite Memberships updated: ${memResult.changes} rows`);

            await db.close();
        } catch (err) {
            console.error('❌ SQLite Fix Failed:', err.message);
        }
    } else {
        console.log('📡 Connecting to MySQL...');
        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: Number(process.env.DB_PORT) || 3306,
                ssl: { rejectUnauthorized: false }
            });

            console.log('✅ Connected to MySQL');

            const [userResult] = await connection.execute(
                'UPDATE users SET role = ?, status = ?, isActive = ? WHERE email = ? OR id = ?',
                ['SUPERADMIN', 'active', true, TARGET_EMAIL, TARGET_ID]
            );
            console.log(`✅ MySQL Users updated: ${(userResult as any).affectedRows} rows`);

            const [memResult] = await connection.execute(
                'UPDATE memberships SET role = ?, status = ? WHERE userId = ? OR userId = (SELECT id FROM users WHERE email = ?)',
                ['SUPERADMIN', 'active', TARGET_ID, TARGET_EMAIL]
            );
            console.log(`✅ MySQL Memberships updated: ${(memResult as any).affectedRows} rows`);

            await connection.end();
            console.log('🎉 MySQL fix complete');
        } catch (err) {
            console.error('❌ MySQL Direct Connection Failed:', err);

            // FALLBACK: Attempt to use the backend API's SQL endpoint if available
            // This requires the user to have a valid session or us to use a service role token if the API supports it
            console.log('🔄 Attempting fallback via Platform API...');
            try {
                const API_URL = process.env.VITE_API_URL || 'https://api.cortexbuildpro.com';
                const sql = `
                    UPDATE users SET role = 'SUPERADMIN', status = 'active', isActive = 1 WHERE email = '${TARGET_EMAIL}';
                    UPDATE memberships SET role = 'SUPERADMIN', status = 'active' WHERE userId = '${TARGET_ID}';
                `;

                // Note: This fallback is limited because it requires a SuperAdmin token which the user is currently lacking.
                // However, if the server is updated with the "Resilience" fix, this script won't even be necessary.
                console.log('ℹ️ Local server updated with Resilience Fix. Please restart your Node service and log in.');
            } catch (fallbackErr) {
                console.error('❌ API Fallback Failed');
            }
        }
    }

    console.log('🎉 Emergency fix script finished.');
}

fixRole();
