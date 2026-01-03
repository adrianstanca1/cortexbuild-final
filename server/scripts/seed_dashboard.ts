
import { getDb, initializeDatabase } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    await initializeDatabase();
    const db = getDb();
    const now = new Date().toISOString();

    console.log("Seeding companies...");
    // Seed Companies
    await db.run(`INSERT INTO companies (id, name, slug, status, plan, mrr, users, projects, createdAt, updatedAt) VALUES 
        ('c1', 'Acme Construction', 'acme-co', 'ACTIVE', 'ENTERPRISE', 2500, 15, 4, ?, ?) ON CONFLICT(id) DO NOTHING`, [now, now]);
    await db.run(`INSERT INTO companies (id, name, slug, status, plan, mrr, users, projects, createdAt, updatedAt) VALUES 
        ('c2', 'Global Builders', 'global-build', 'ACTIVE', 'PRO', 500, 5, 2, ?, ?) ON CONFLICT(id) DO NOTHING`, [now, now]);
    await db.run(`INSERT INTO companies (id, name, slug, status, plan, mrr, users, projects, createdAt, updatedAt) VALUES 
        ('c3', 'Urban Design', 'urban-design', 'TRIAL', 'STARTER', 0, 2, 1, ?, ?) ON CONFLICT(id) DO NOTHING`, [now, now]);

    // Seed System Events (Alerts)
    console.log("Seeding system events...");
    await db.run(`INSERT INTO system_events (id, type, level, message, source, isRead, createdAt) VALUES 
        (?, 'SECURITY', 'warn', 'Multiple failed login attempts from IP 45.2.1.2', 'AUTH_SERVICE', 0, ?)`, [uuidv4(), now]);
    await db.run(`INSERT INTO system_events (id, type, level, message, source, isRead, createdAt) VALUES 
        (?, 'PERFORMANCE', 'info', 'Database latency normalized', 'MONITORING', 0, ?)`, [uuidv4(), new Date(Date.now() - 3600000).toISOString()]);
    await db.run(`INSERT INTO system_events (id, type, level, message, source, isRead, createdAt) VALUES 
        (?, 'SYSTEM', 'info', 'Backup completed successfully', 'BACKUP_SERVICE', 1, ?)`, [uuidv4(), new Date(Date.now() - 7200000).toISOString()]);

    // Seed Audit Logs
    console.log("Seeding audit logs...");
    await db.run(`INSERT INTO audit_logs (id, companyId, userId, action, resource, timestamp) VALUES 
        (?, 'c1', 'u1', 'LOGIN', 'AUTH', ?)`, [uuidv4(), now]);
    await db.run(`INSERT INTO audit_logs (id, companyId, userId, action, resource, timestamp) VALUES 
        (?, 'c1', 'u1', 'CREATE_PROJECT', 'PROJECTS', ?)`, [uuidv4(), new Date(Date.now() - 100000).toISOString()]);

    console.log("Dashboard data seeded!");
}

main().catch(console.error);
