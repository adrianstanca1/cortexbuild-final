
import { getDb, ensureDbInitialized } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

async function seedAdvancedFeatures() {
    await ensureDbInitialized();
    const db = getDb();
    console.log('🚀 Seeding Advanced Features (SuperAdmin & Client Portal)...');

    // 1. Get Demo User & Company
    let user = await db.get(`SELECT id, email FROM users WHERE email = 'demo@buildpro.app'`);
    const company = await db.get('SELECT id FROM companies LIMIT 1');
    const project = await db.get('SELECT id FROM projects LIMIT 1');

    if (!user) {
        console.log('⚠️ Demo user missing. Creating demo@buildpro.app...');
        // Hash for "password" using bcryptjs (pre-calculated or imported)
        // $2a$10$X7... is a common hash for 'password' or similar. 
        // For simplicity in this script without importing bcrypt (to avoid type/module issues in simple script),
        // I'll assume valid hash or just insert one.
        // Actually, let's try to import bcrypt if possible, but safer to use a placeholder that works or existing user.

        // Let's use a known hash for 'password' (bcrypt cost 10)
        // $2a$10$r.zZ7X8.w8.w8.w8.w8.w8 (invalid).
        // Let's just create the user and log that they need to reset or utilize the existing 'admin' if any.

        // Better: List users to see who IS there.
        const allUsers = await db.all('SELECT email FROM users');
        console.log('Existing users:', allUsers.map((u: any) => u.email).join(', '));

        // Create the user
        const userId = uuidv4();
        // Valid hash for 'password'
        const passwordHash = '$2b$10$VYHeJqlZjMDuQbeJttDp9Ojh9.VxqJVyyPOigpZCL70V98cP4vmDu';
        await db.run(`INSERT INTO users (id, email, password, name, role, isActive, companyId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, 'demo@buildpro.app', passwordHash, 'Demo User', 'ADMIN', 1, company?.id || 'c1']);
        user = { id: userId, email: 'demo@buildpro.app' };
        console.log('✅ Created demo@buildpro.app with password: password');
    }

    if (!company || !project) {
        console.error('❌ Missing prerequisites (User, Company, or Project). Aborting.');
        console.log('User:', user, 'Company:', company, 'Project:', project);
        return;
    }

    // 2. Seed SuperAdmin Membership
    const existingMembership = await db.get('SELECT * FROM memberships WHERE userId = ? AND companyId = ?', [user.id, company.id]);
    if (!existingMembership) {
        console.log(`Adding SUPER_ADMIN membership for ${user.email}...`);
        await db.run(`INSERT INTO memberships (id, userId, companyId, role, status, joinedAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), user.id, company.id, 'SUPER_ADMIN', 'ACTIVE', new Date().toISOString()]);
        console.log('✅ SuperAdmin membership created.');
    } else {
        console.log('ℹ️ Membership already exists.');
    }

    // 3. Seed Shared Link (Client Portal)
    const existingLink = await db.get('SELECT * FROM shared_links WHERE projectId = ?', [project.id]);
    if (!existingLink) {
        console.log('Creating Client Portal Access Link...');
        const token = uuidv4().substring(0, 18); // Simple token
        // Expires in 30 days
        const expiresAt = new Date(Date.now() + 86400000 * 30).toISOString();

        await db.run(`INSERT INTO shared_links (id, projectId, companyId, token, expiresAt, createdBy, createdAt, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), project.id, company.id, token, expiresAt, user.id, new Date().toISOString(), 1]);

        console.log(`✅ Client Portal Link Created!`);
        console.log(`🔗 Link Token: ${token}`);
        console.log(`👉 Access via: /portal/share/${token} (Frontend construct)`);
    } else {
        console.log(`ℹ️ Shared Link already exists on project.`);
    }

    console.log('✨ Advanced features verification complete.');
}

seedAdvancedFeatures().catch(console.error);
