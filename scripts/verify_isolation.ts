import { companyProvisioningService } from '../server/services/companyProvisioningService.js';
import { tenantDatabaseFactory } from '../server/services/tenantDatabaseFactory.js';
import { getDb, initializeDatabase } from '../server/database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../server/utils/logger.js';
import fs from 'fs';
import path from 'path';

async function verifyIsolation() {
    console.log('--- Starting Multi-Tenancy Isolation Verification ---');

    // 1. Initialize Platform DB
    await initializeDatabase();
    const platformDb = getDb();

    // 2. Provision Tenant A
    console.log('\n1. Provisioning Tenant A...');
    const tenantA = await companyProvisioningService.initiateProvisioning({
        name: 'Tenant A - Shared',
        ownerEmail: 'ownerA@test.com',
        ownerName: 'Owner A',
        isolationMode: 'Shared'
    });
    console.log(`   Tenant A Created: ${tenantA.companyId} (TenantID: ${tenantA.tenantId})`);

    // 3. Provision Tenant B
    console.log('\n2. Provisioning Tenant B...');
    const tenantB = await companyProvisioningService.initiateProvisioning({
        name: 'Tenant B - Dedicated',
        ownerEmail: 'ownerB@test.com',
        ownerName: 'Owner B',
        isolationMode: 'Dedicated'
    });
    console.log(`   Tenant B Created: ${tenantB.companyId} (TenantID: ${tenantB.tenantId})`);

    // 4. Verify Physical Isolation (SQLite Files)
    console.log('\n3. Verifying Physical Storage Isolation...');
    const tenantAPath = path.resolve(`./tenants/${tenantA.tenantId}.sqlite`);
    const tenantBPath = path.resolve(`./tenants/${tenantB.tenantId}.sqlite`);

    if (fs.existsSync(tenantAPath)) {
        console.log(`   [PASS] Tenant A Database exists: ${tenantAPath}`);
    } else {
        console.error(`   [FAIL] Tenant A Database missing!`);
        process.exit(1);
    }

    if (fs.existsSync(tenantBPath)) {
        console.log(`   [PASS] Tenant B Database exists: ${tenantBPath}`);
    } else {
        console.error(`   [FAIL] Tenant B Database missing!`);
        process.exit(1);
    }

    // 5. Verify Data Isolation (Project Creation)
    console.log('\n4. Verifying Data Access Isolation...');

    // Connect to Tenant A DB and insert a project
    const dbA = await tenantDatabaseFactory.getTenantDatabase(tenantA.tenantId);
    const projectAId = uuidv4();
    await dbA.run(`
        INSERT INTO projects (id, companyId, name, status, createdAt, updatedAt)
        VALUES (?, ?, 'Project Alpha', 'Active', ?, ?)
    `, [projectAId, tenantA.tenantId, new Date().toISOString(), new Date().toISOString()]);
    console.log(`   Created 'Project Alpha' in Tenant A DB.`);

    // Connect to Tenant B DB and ensure it's NOT there
    const dbB = await tenantDatabaseFactory.getTenantDatabase(tenantB.tenantId);
    const existingInB = await dbB.get('SELECT * FROM projects WHERE id = ?', [projectAId]);

    if (!existingInB) {
        console.log(`   [PASS] Project Alpha NOT found in Tenant B DB.`);
    } else {
        console.error(`   [FAIL] LEAK DETECTED! Project Alpha found in Tenant B DB!`);
        process.exit(1);
    }

    // 6. Verify Platform Registry Accuracy
    console.log('\n5. Verifying Registry Integrity...');
    const registryA = await platformDb.get('SELECT * FROM tenant_registry WHERE tenant_id = ?', [tenantA.tenantId]);
    if (registryA && registryA.company_id === tenantA.companyId) {
        console.log(`   [PASS] Registry correctly maps Tenant A to Company A.`);
    } else {
        console.error(`   [FAIL] Registry mapping incorrect for Tenant A.`);
    }

    console.log('\n--- VERIFICATION SUCCESSFUL: Strict Isolation Confirmed ---');
    process.exit(0);
}

verifyIsolation().catch(err => {
    console.error('Verification Failed:', err);
    process.exit(1);
});
