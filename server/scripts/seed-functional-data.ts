
import { getDb, ensureDbInitialized } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

async function seedFunctionalData() {
    await ensureDbInitialized();
    const db = getDb();
    console.log('🌱 Seeding functional data...');

    // Get existing company and project
    const company = await db.get('SELECT id FROM companies LIMIT 1');
    const project = await db.get('SELECT id FROM projects LIMIT 1');

    if (!company || !project) {
        console.error('❌ No company or project found. Cannot seed functional data.');
        return;
    }

    const companyId = company.id;
    const projectId = project.id;
    console.log(`Using Company: ${companyId}, Project: ${projectId}`);

    // 1. Vendors
    console.log('Creating Vendors...');
    const vendorId = uuidv4();
    await db.run(`INSERT INTO vendors (id, companyId, name, category, status, email, rating) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vendorId, companyId, 'Acme Concrete Supply', 'Materials', 'Active', 'orders@acme.com', 4.8]);

    // 2. Cost Codes
    console.log('Creating Cost Codes...');
    const costCodeId = uuidv4();
    await db.run(`INSERT INTO cost_codes (id, companyId, projectId, code, description, budget, spent) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [costCodeId, companyId, projectId, '03-300', 'Cast-in-Place Concrete', 50000, 12500]);

    // 3. Invoices
    console.log('Creating Invoices...');
    await db.run(`INSERT INTO invoices (id, companyId, projectId, number, vendorId, amount, date, dueDate, status, costCodeId, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), companyId, projectId, 'INV-2024-001', vendorId, 4500.00, new Date().toISOString(), new Date(Date.now() + 86400000 * 30).toISOString(), 'Pending', costCodeId, JSON.stringify([{ desc: 'Concrete Pour', qty: 10, rate: 450 }])]);

    // 4. Safety Incidents
    console.log('Creating Safety Incidents...');
    await db.run(`INSERT INTO safety_incidents (id, companyId, projectId, type, title, severity, date, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), companyId, projectId, 'Near Miss', 'Ladder Slippage', 'Low', new Date().toISOString(), 'Open', 'Ladder slipped on wet surface. No injuries.']);

    // 5. RFIs
    console.log('Creating RFIs...');
    await db.run(`INSERT INTO rfis (id, companyId, projectId, number, subject, status, priority, description, assignedTo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), companyId, projectId, 'RFI-001', 'Clarification on Beam Specs', 'Open', 'High', 'Please confirm the steel grade for beam B-102.', 'Architect', new Date().toISOString()]);

    // 6. Daily Logs
    console.log('Creating Daily Logs...');
    await db.run(`INSERT INTO daily_logs (id, companyId, projectId, date, weather, temperature, workforce, activities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), companyId, projectId, new Date().toISOString(), 'Sunny', '22C', 15, 'Foundation pouring continued.', 'Submitted']);

    console.log('✅ Functional data seeded successfully!');
}

seedFunctionalData().catch(console.error);
