
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required. Set the DATABASE_URL environment variable before running this script.');
  process.exit(1);
}

async function createSuperAdmin() {
    console.log('Connecting to database...');
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected.');

        const email = process.env.SUPERADMIN_EMAIL || 'adrian.stanca1@gmail.com';
        const password = process.env.SUPERADMIN_PASSWORD;
        if (!password) {
          console.error('SUPERADMIN_PASSWORD environment variable is required to set the superadmin password.');
          process.exit(1);
        }
        const role = 'SUPERADMIN';
        const name = 'Adrian Stanca';

        // 1. Check if user exists in auth.users
        const checkRes = await client.query(`SELECT id FROM auth.users WHERE email = $1`, [email]);

        let userId;

        if (checkRes.rows.length > 0) {
            console.log('User already exists in auth.users. Updating role...');
            userId = checkRes.rows[0].id;

            // Update password and metadata
            await client.query(`
        UPDATE auth.users 
        SET encrypted_password = crypt($2, gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('role', $3::text, 'name', $4::text, 'companyId', 'ALL'),
            updated_at = now(),
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = $1
      `, [userId, password, role, name]);

        } else {
            console.log('Creating new user in auth.users...');
            const insertRes = await client.query(`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          recovery_sent_at,
          last_sign_in_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf')),
          now(),
          now(),
          now(),
          '{"provider": "email", "providers": ["email"]}',
          jsonb_build_object('role', $3::text, 'name', $4::text, 'companyId', 'ALL'),
          now(),
          now(),
          '',
          '',
          '',
          ''
        ) RETURNING id
      `, [email, password, role, name]);

            userId = insertRes.rows[0].id;
        }

        console.log(`Auth User ID: ${userId}`);

        // 2. Insert/Update in public.users (local mirror)
        console.log('Syncing to public.users...');

        // Ensure company exists (ALL or similar if needed, but schema says companyId is text)
        // We might need a dummy company if foreign key is strict? schema says "ON DELETE SET NULL", so nullable.
        // However, keeping consistent with seeds might be good.
        // Let's just use NULL or 'ALL' if no FK constraint on specific value exists (FK usually requires value in other table).
        // The schema: FOREIGN KEY (companyId) REFERENCES companies(id)
        // So 'ALL' must exist in companies if we use it.

        // Inspect table schema
        const schemaRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
    `);
        console.log('Companies table columns:', schemaRes.rows.map(r => r.column_name));

        // Inspect users table schema
        const userSchemaRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log('Users table columns:', userSchemaRes.rows.map(r => r.column_name));

        // Check if 'ALL' company exists
        const companyCheck = await client.query(`SELECT id FROM companies WHERE id = 'ALL'`);
        if (companyCheck.rows.length === 0) {
            console.log("Creating 'ALL' company placeholder...");
            // distinct schema found: id, name, created_at, status, subscription_plan
            await client.query(`
         INSERT INTO companies (id, name, created_at, status, subscription_plan, max_users, max_projects)
         VALUES ('ALL', 'Global Admin', now(), 'active', 'ENTERPRISE', 9999, 9999)
         ON CONFLICT (id) DO NOTHING
       `);
        }

        await client.query(`
      INSERT INTO public.users (id, email, name, role, company_id, created_at, password)
      VALUES ($1, $2, $3, $4, 'ALL', now(), 'HASHED_IN_AUTH')
      ON CONFLICT (id) DO UPDATE 
      SET role = $4, name = $3, company_id = 'ALL'
    `, [userId, email, name, role]);

        console.log('✅ Superadmin created successfully.');

    } catch (err) {
        console.error('Error creating superadmin:', err);
    } finally {
        await client.end();
    }
}

createSuperAdmin();
