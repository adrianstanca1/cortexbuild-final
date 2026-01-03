
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

const TARGET_EMAIL = 'adrian.stanca1@gmail.com';
const TARGET_PASSWORD = 'Cumparavinde1@';

async function seedAdrianSuperAdmin() {
    console.log(`Seeding SuperAdmin User: ${TARGET_EMAIL}`);

    // 1. Create/Get Supabase User
    let userId;
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all users to check existence (Supabase admin listUsers pagination)
    console.log('Fetching Supabase users...');
    try {
        while (hasMore) {
            const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 50 });
            if (error) {
                console.error('Error fetching users:', error);
                hasMore = false; // Stop fetching if error
            } else if (!users || users.length === 0) {
                hasMore = false;
            } else {
                console.log(`Fetched page ${page}: ${users.length} users`);
                allUsers = [...allUsers, ...users];
                page++;
                if (users.length < 50) hasMore = false;
            }
        }
    } catch (e) {
        console.error("Exception during listUsers", e);
    }

    console.log(`Total Supabase users found: ${allUsers.length}`);
    const existingUser = allUsers.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

    if (existingUser) {
        console.log(`User exists in Supabase: ${existingUser.id}`);
        userId = existingUser.id;
        // Verify/Update password
        const { error } = await supabase.auth.admin.updateUserById(userId, { password: TARGET_PASSWORD });
        if (error) {
            console.error('Error updating password:', error);
        } else {
            console.log('Password verified/updated.');
        }
    } else {
        console.log('User not found in list, attempting creation...');
        const { data, error } = await supabase.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: TARGET_PASSWORD,
            email_confirm: true
        });

        if (error) {
            console.error('Failed to create Supabase user:', error);
            if (error.code === 'email_exists' || error.message?.includes('already been registered')) {
                console.log('User exists (create failed). Attempting to retrieve User ID via generateLink workaround...');
                // Workaround: Use generateLink to get user object
                const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: TARGET_EMAIL
                });

                if (linkError || !linkData.user) {
                    console.error('Failed to retrieve user via generateLink:', linkError);
                    process.exit(1);
                }

                userId = linkData.user.id;
                console.log(`Recovered User ID via magiclink: ${userId}`);

                // Update password now that we resolved the ID
                await supabase.auth.admin.updateUserById(userId, { password: TARGET_PASSWORD });
            } else {
                process.exit(1);
            }
        } else {
            userId = data.user.id;
            console.log(`Created new Supabase user: ${userId}`);
        }
    }

    if (!userId) {
        console.error('No User ID found. Exiting.');
        process.exit(1);
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
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [TARGET_EMAIL]);
        const existingDbUser = (rows as any[])[0];

        if (existingDbUser) {
            console.log(`User exists in MySQL (${existingDbUser.id}). Syncing details...`);
            if (existingDbUser.id !== userId) {
                console.log(`MySQL ID (${existingDbUser.id}) differs from Supabase ID (${userId}). Correcting...`);
                await connection.execute('DELETE FROM users WHERE email = ?', [TARGET_EMAIL]);
                await connection.execute(
                    `INSERT INTO users (id, email, password, name, role, status, isActive, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, TARGET_EMAIL, 'SUPABASE_AUTH', 'Adrian Stanca', 'SUPERADMIN', 'active', true, now, now]
                );
            } else {
                await connection.execute(
                    `UPDATE users SET name = ?, role = ?, status = ?, isActive = ?, updatedAt = ? WHERE email = ?`,
                    ['Adrian Stanca', 'SUPERADMIN', 'active', true, now, TARGET_EMAIL]
                );
            }
        } else {
            await connection.execute(
                `INSERT INTO users (id, email, password, name, role, status, isActive, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, TARGET_EMAIL, 'SUPABASE_AUTH', 'Adrian Stanca', 'SUPERADMIN', 'active', true, now, now]
            );
        }

        // Ensure Membership for Company c1 (SuperAdmin)
        const [memRows] = await connection.execute('SELECT id FROM memberships WHERE userId = ? AND companyId = ?', [userId, 'c1']);
        if ((memRows as any[]).length === 0) {
            await connection.execute(
                `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), userId, 'c1', 'SUPERADMIN', 'active', now, now]
            );
        } else {
            await connection.execute(
                `UPDATE memberships SET role = ?, status = ? WHERE userId = ? AND companyId = ?`,
                ['SUPERADMIN', 'active', userId, 'c1']
            );
        }

        console.log('✅ Adrian SuperAdmin Sync Complete.');
        await connection.end();

    } catch (dbError) {
        console.error('MySQL Error:', dbError);
        console.log('Ensure you have whitelisted your IP if running locally. Hostinger blocks remote IPs by default.');
        process.exit(1);
    }
}

seedAdrianSuperAdmin();
