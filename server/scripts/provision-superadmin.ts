import { getDb, initializeDatabase } from '../database.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Provision SuperAdmin User
 * 
 * This script adds a SuperAdmin user to the database.
 * It's safe to run multiple times - it will skip if the user already exists.
 */

async function provisionSuperAdmin() {
    try {
        await initializeDatabase();
        const db = getDb();

        const email = 'adrian.stanca1@gmail.com';
        const password = 'Cumparavinde1@';
        const name = 'Adrian Stanca';

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

        if (existingUser) {
            logger.info(`✓ SuperAdmin user ${email} already exists (ID: ${existingUser.id})`);

            // Ensure they have SUPERADMIN role in user_metadata
            const existingMembership = await db.get(
                'SELECT * FROM memberships WHERE userId = ? AND role = ?',
                [existingUser.id, 'SUPERADMIN']
            );

            if (!existingMembership) {
                // Add SUPERADMIN membership to platform-admin company
                await db.run(
                    `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [uuidv4(), existingUser.id, 'platform-admin', 'SUPERADMIN', 'active', new Date().toISOString(), new Date().toISOString()]
                );
                logger.info(`✓ Added SUPERADMIN membership for ${email}`);
            } else {
                logger.info(`✓ SUPERADMIN membership already exists for ${email}`);
            }

            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Create platform-admin company if it doesn't exist
        const platformCompany = await db.get('SELECT id FROM companies WHERE id = ?', ['platform-admin']);
        if (!platformCompany) {
            await db.run(
                `INSERT INTO companies (id, name, slug, status, plan, subscriptionTier, maxProjects, maxUsers, createdAt, updatedAt, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['platform-admin', 'Platform Administration', 'platform-admin', 'ACTIVE', 'ENTERPRISE', 'ENTERPRISE', 9999, 9999, new Date().toISOString(), new Date().toISOString(), 1]
            );
            logger.info('✓ Created platform-admin company');
        }

        // Insert the user
        await db.run(
            `INSERT INTO users (id, email, password, name, role, companyId, status, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, email, hashedPassword, name, 'SUPERADMIN', 'platform-admin', 'active', 1, new Date().toISOString(), new Date().toISOString()]
        );

        logger.info(`✓ Created user: ${email} (ID: ${userId})`);

        // Add SUPERADMIN membership
        await db.run(
            `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, 'platform-admin', 'SUPERADMIN', 'active', new Date().toISOString(), new Date().toISOString()]
        );

        logger.info(`✓ Added SUPERADMIN membership`);

        logger.info('\n🎉 SuperAdmin provisioning complete!');
        logger.info(`   Email: ${email}`);
        logger.info(`   Password: ${password}`);
        logger.info(`   Role: SUPERADMIN\n`);

    } catch (error) {
        logger.error('❌ SuperAdmin provisioning failed:', error);
        throw error;
    }
}

// Run the script
provisionSuperAdmin()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Script failed:', error);
        process.exit(1);
    });
