
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_EMAIL = 'demo@buildpro.app';
const DEMO_PASSWORD = 'password';

async function seedProdUser() {
    console.log(`Seeding Production User: ${DEMO_EMAIL}`);

    // 1. Create/Get Supabase User
    let userId;
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 });
        if (error || !users || users.length === 0) {
            hasMore = false;
        } else {
            allUsers = [...allUsers, ...users];
            page++;
            // If less than requested, we are done
            if (users.length < 1000) hasMore = false;
        }
    }

    const existingUser = allUsers.find(u => u.email === DEMO_EMAIL);

    if (existingUser) {
        console.log(`User exists in Supabase: ${existingUser.id}`);
        userId = existingUser.id;
        // Optional: Update password
        await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
        console.log('Password reset to: password');
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            email_confirm: true
        });
        if (error) {
            // Check if it exists anyway (race condition or weird state)
            if (error.code === 'email_exists') {
                console.log('User exists (reported by create), but not found in list. Trying one more fetch?');
                // This shouldn't happen with full scan, but fail safe:
                process.exit(1);
            }
            console.error('Failed to create Supabase user:', error);
            process.exit(1);
        }
        userId = data.user.id;
        console.log(`Created new Supabase user: ${userId}`);
    }

    // 2. Sync to MySQL
    console.log('Syncing to MySQL...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT) || 3306
        });

        // Upsert User
        const now = new Date().toISOString();
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [DEMO_EMAIL]);
        const existingDbUser = (rows as any[])[0];

        if (existingDbUser) {
            console.log(`Updating MySQL user ${existingDbUser.id} to match Supabase ID ${userId}`);
            // If IDs differ, we might need to delete and re-insert or update FKs. 
            // For simplicity, we assume we can just update the ID if no strict FK constraints verify cascade or we update all.
            // Actually, updating ID is risky. Better to Delete old and Insert new.
            await connection.execute('DELETE FROM users WHERE email = ?', [DEMO_EMAIL]);
        }

        await connection.execute(
            `INSERT INTO users (id, email, name, role, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, DEMO_EMAIL, 'Demo User', 'SUPERADMIN', true, now, now]
        );

        // Ensure Membership for Company c1 (SuperAdmin)
        await connection.execute('DELETE FROM memberships WHERE userId = ?', [userId]);
        await connection.execute(
            `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, 'c1', 'SUPERADMIN', 'active', now, now]
        );

        console.log('✅ MySQL Sync Complete.');
        await connection.end();

    } catch (dbError) {
        console.error('MySQL Error:', dbError);
        process.exit(1);
    }
}

seedProdUser();
