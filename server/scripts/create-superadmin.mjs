/**
 * Create/Update SuperAdmin Account
 * Email: adrian.stanca1@gmail.com
 * Creates user if needed, adds SUPERADMIN role
 */

import mysql from 'mysql2/promise';
import {
    config
} from 'dotenv';

// Load production environment
config({
    path: '.env.production'
});

const SUPERADMIN_EMAIL = 'adrian.stanca1@gmail.com';
const SUPERADMIN_NAME = 'Adrian Stanca';

async function createSuperAdmin() {
    console.log('🔧 Creating/Updating SuperAdmin Account...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Step 1: Check if user exists
        console.log('📊 Checking for existing user...');
        const [existingUsers] = await connection.execute(`
      SELECT id, email, name, status FROM users WHERE email = ?
    `, [SUPERADMIN_EMAIL]);

        let userId;

        if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
            console.log('✅ User found:', existingUsers[0]);

            // Ensure user is active
            await connection.execute(`
        UPDATE users SET status = 'active' WHERE id = ?
      `, [userId]);
            console.log('✅ User status set to active');

        } else {
            // Create new user with a placeholder password
            // User will need to use password reset to set their password
            console.log('➕ Creating new user...');
            userId = crypto.randomUUID();

            // Note: Password should be set via Supabase Auth or password reset flow
            // Using INVITATION_PENDING to indicate account needs activation
            await connection.execute(`
        INSERT INTO users (id, email, name, password, status, createdAt, updatedAt)
        VALUES (?, ?, ?, 'INVITATION_PENDING', 'pending', NOW(), NOW())
      `, [userId, SUPERADMIN_EMAIL, SUPERADMIN_NAME]);

            console.log('✅ User created (needs password via Supabase):', {
                id: userId,
                email: SUPERADMIN_EMAIL,
                name: SUPERADMIN_NAME
            });
        }

        // Step 2: Get a company for the membership
        const [companies] = await connection.execute(`
      SELECT id, name FROM companies ORDER BY createdAt ASC LIMIT 1
    `);

        if (companies.length === 0) {
            throw new Error('No companies found. Please create a company first.');
        }

        const company = companies[0];
        console.log('✅ Using company:', company);

        // Step 3: Check if SUPERADMIN membership exists
        const [existingMembership] = await connection.execute(`
      SELECT id, role FROM memberships
      WHERE userId = ? AND role = 'SUPERADMIN'
    `, [userId]);

        if (existingMembership.length > 0) {
            console.log('✅ SUPERADMIN membership already exists');
        } else {
            // Create SUPERADMIN membership
            const membershipId = crypto.randomUUID();
            console.log('\n➕ Adding SUPERADMIN membership...');

            await connection.execute(`
        INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
        VALUES (?, ?, ?, 'SUPERADMIN', 'active', NOW(), NOW())
      `, [membershipId, userId, company.id]);

            console.log('✅ SUPERADMIN membership created');
        }

        // Step 4: Update any old role formats
        await connection.execute(`
      UPDATE memberships
      SET role = 'SUPERADMIN'
      WHERE userId = ? AND role IN ('SUPER_ADMIN', 'SuperAdmin')
    `, [userId]);

        // Step 5: Verify final state
        console.log('\n✅ Final Verification:');
        const [verification] = await connection.execute(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.status as user_status,
        m.id as membership_id,
        m.role,
        m.status as membership_status,
        c.name as company_name
      FROM users u
      JOIN memberships m ON u.id = m.userId
      LEFT JOIN companies c ON m.companyId = c.id
      WHERE u.email = ? AND m.role = 'SUPERADMIN'
    `, [SUPERADMIN_EMAIL]);

        console.table(verification);

        const userNeedsActivation = verification[0].user_status === 'pending';

        console.log('\n🎉 SUCCESS! SuperAdmin Account Ready:');
        console.log(`   Email: ${SUPERADMIN_EMAIL}`);
        console.log(`   Role: SUPERADMIN`);

        if (userNeedsActivation) {
            console.log('\n⚠️  ACCOUNT NEEDS ACTIVATION:');
            console.log('   This user needs to be registered via Supabase Auth first.');
            console.log('   Option 1: Use password reset flow');
            console.log('   Option 2: Login with existing Supabase credentials');
        } else {
            console.log('\n⚠️  NEXT STEPS:');
            console.log('   1. Login at: https://cortexbuildpro.com');
            console.log(`   2. Use email: ${SUPERADMIN_EMAIL}`);
            console.log('   3. Use your Supabase password');
            console.log('   4. Navigate to Platform → Companies');
            console.log('   5. Try creating a company - 403 error should be fixed!');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the script
createSuperAdmin()
    .then(() => {
        console.log('\n✅ Script completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });