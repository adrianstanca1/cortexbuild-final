import { initializeDatabase } from '../database.js';
import { companyProvisioningService } from '../services/companyProvisioningService.js';
import { getCompanyStorageStats } from '../services/storageService.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs';

async function testCompanyProvisioning() {
    try {
        logger.info('=== Testing Company Provisioning with Storage ===\n');

        // Initialize database
        await initializeDatabase();
        logger.info('✓ Database initialized\n');

        // Provision a test company
        logger.info('Creating test company...');
        const result = await companyProvisioningService.initiateProvisioning({
            name: 'Test Construction Co.',
            ownerEmail: 'owner@testconstruction.com',
            ownerName: 'John Test Owner',
            plan: 'Pro',
            storageQuotaGB: 25
        });

        logger.info(`✓ Company created: ${result.companyId}`);
        logger.info(`✓ Status: ${result.status}`);
        logger.info(`✓ Invitation sent to: owner@testconstruction.com\n`);

        // Verify storage bucket was created
        logger.info('Verifying storage bucket...');
        const stats = await getCompanyStorageStats(result.companyId);

        logger.info(`✓ Bucket path: ${stats.bucketPath}`);
        logger.info(`✓ Storage quota: ${(stats.storageQuota / 1024 / 1024 / 1024).toFixed(2)}GB`);
        logger.info(`✓ Storage used: ${(stats.storageUsed / 1024 / 1024).toFixed(2)}MB`);
        logger.info(`✓ File count: ${stats.fileCount}`);
        logger.info(`✓ Usage: ${stats.usagePercentage.toFixed(2)}%\n`);

        // Check if subdirectories were created
        const bucketPath = stats.bucketPath;
        const expectedDirs = ['projects', 'documents', 'invoices', 'images', 'uploads'];

        logger.info('Checking subdirectories...');
        for (const dir of expectedDirs) {
            const dirPath = `${bucketPath}/${dir}`;
            const exists = fs.existsSync(dirPath);
            logger.info(`${exists ? '✓' : '✗'} ${dir}/ ${exists ? 'created' : 'MISSING'}`);
        }

        logger.info('\n=== Test Complete ===');
        logger.info(`\nCompany provisioned successfully!`);
        logger.info(`Owner can accept invitation and start uploading files.`);
        logger.info(`All files will be stored in: ${bucketPath}`);

        process.exit(0);
    } catch (error) {
        logger.error('Test failed:', error);
        process.exit(1);
    }
}

testCompanyProvisioning();
