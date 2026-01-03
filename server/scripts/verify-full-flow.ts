
import { v4 as uuidv4 } from 'uuid';
import { getDb, initializeDatabase } from '../database.js';
import { companyProvisioningService } from '../services/companyProvisioningService.js';
// import { tenantDatabaseFactory } from '../services/tenantDatabaseFactory.js';
// import { projectService } from '../services/projectService.js';

async function verifyFullFlow() {
    console.log('--- Starting Full Flow Verification ---');

    // 1. Initialize Platform DB
    await initializeDatabase();
    const platformDb = getDb();
    console.log('✅ Platform DB Initialized');

    // 2. Provision New Company
    const uniqueId = uuidv4().substring(0, 8);
    const companyData = {
        name: `Isolation Test Corp ${uniqueId}`,
        ownerEmail: `ceo-${uniqueId}@test.com`,
        ownerName: 'Chief Tester',
        plan: 'Enterprise',
        storageQuotaGB: 5
    };

    console.log(`\n--- Provisioning Company: ${companyData.name} ---`);
    const provisioningResult = await companyProvisioningService.initiateProvisioning(companyData);
    const { companyId, invitation } = provisioningResult;

    console.log(`✅ Company Provisioned:`);
    console.log(`   - Company ID: ${companyId}`);

    console.log("\n⚠️  NOTE: The rest of this verification script is disabled.");
    console.log("   Legacy verification relied on synchronous tenantId return.");
    console.log("   New robust provisioning flows are asynchronous.");
    console.log("   Please use scripts/verify-provisioning.ts to verify the full async flow.");

    /*
    // Legacy Code below - needs refactoring to poll for Job completion
    
    // 3. Verify Invitation
    if (invitation && invitation.token) {
        console.log(`✅ Invitation Generated:`);
        console.log(`   - Token: ${invitation.token.substring(0, 10)}...`);
        console.log(`   - Email: ${invitation.email}`);
    } else {
        console.error('❌ Invitation generation failed');
    }

    // ... (rest of the file commented out)
    */

    console.log('\n--- Full Flow Verification Complete (Early Exit) ---');
}

verifyFullFlow().catch(console.error);
