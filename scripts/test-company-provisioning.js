#!/usr/bin/env node

/**
 * Test Company Provisioning with Module Selection
 * Usage: node scripts/test-company-provisioning.js
 */

import {
    companyProvisioningService
} from '../server/services/companyProvisioningService.js';
import {
    CompanyModule
} from '../server/types/modules.js';

async function testProvisioning() {
    console.log('🧪 Testing Company Provisioning with Modules...\n');

    try {
        // Test 1: Free Plan with Default Modules
        console.log('Test 1: Creating Free Plan company with default modules');
        const freeCompany = await companyProvisioningService.initiateProvisioning({
            name: 'Test Free Company',
            ownerEmail: 'owner@testfree.com',
            ownerName: 'Free Owner',
            plan: 'Free Beta'
        });
        console.log('✅ Free company created:', freeCompany.companyId);
        console.log('   Status:', freeCompany.status);
        console.log('   Invitation:', freeCompany.invitation ? .id);
        console.log('');

        // Test 2: Professional Plan with Custom Modules
        console.log('Test 2: Creating Professional Plan with custom modules');
        const proCompany = await companyProvisioningService.initiateProvisioning({
            name: 'Test Pro Company',
            ownerEmail: 'owner@testpro.com',
            ownerName: 'Pro Owner',
            plan: 'Professional',
            selectedModules: [
                CompanyModule.DASHBOARD,
                CompanyModule.USER_MANAGEMENT,
                CompanyModule.PROJECT_MANAGEMENT,
                CompanyModule.TASK_TRACKING,
                CompanyModule.FINANCIALS,
                CompanyModule.ANALYTICS,
                CompanyModule.CLIENT_PORTAL,
            ]
        });
        console.log('✅ Professional company created:', proCompany.companyId);
        console.log('');

        // Test 3: Enterprise Plan with All Modules
        console.log('Test 3: Creating Enterprise Plan with all modules');
        const enterpriseCompany = await companyProvisioningService.initiateProvisioning({
            name: 'Test Enterprise Company',
            ownerEmail: 'owner@testenterprise.com',
            ownerName: 'Enterprise Owner',
            plan: 'Enterprise',
            selectedModules: Object.values(CompanyModule)
        });
        console.log('✅ Enterprise company created:', enterpriseCompany.companyId);
        console.log('');

        // Test 4: Invalid Module Selection (should fail)
        console.log('Test 4: Attempting to create Free Plan with Enterprise-only modules (should fail)');
        try {
            await companyProvisioningService.initiateProvisioning({
                name: 'Test Invalid Company',
                ownerEmail: 'owner@testinvalid.com',
                ownerName: 'Invalid Owner',
                plan: 'Free Beta',
                selectedModules: [
                    CompanyModule.DASHBOARD,
                    CompanyModule.AI_TOOLS, // Enterprise only
                    CompanyModule.API_ACCESS, // Enterprise only
                ]
            });
            console.log('❌ Test failed - should have rejected invalid modules');
        } catch (error) {
            console.log('✅ Correctly rejected invalid module selection');
            console.log('   Error:', error.message);
        }
        console.log('');

        console.log('🎉 All provisioning tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run tests
testProvisioning()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));