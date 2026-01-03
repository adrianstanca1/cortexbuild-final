import { initializeDatabase, getDb } from '../database.js';
import { createCompanyBucket } from '../services/storageService.js';
import { logger } from '../utils/logger.js';

/**
 * Migration script to provision storage buckets for existing companies
 */
async function migrateExistingCompanies() {
    try {
        logger.info('=== Storage Bucket Migration ===\n');
        logger.info('Provisioning storage buckets for existing companies...\n');

        // Initialize database
        await initializeDatabase();
        const db = getDb();

        // Get all companies
        const companies = await db.all('SELECT id, name FROM companies');

        if (companies.length === 0) {
            logger.info('No companies found. Migration complete.');
            process.exit(0);
        }

        logger.info(`Found ${companies.length} companies to process\n`);

        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const company of companies) {
            try {
                // Check if storage bucket already exists
                const existing = await db.get(
                    'SELECT * FROM company_storage WHERE companyId = ?',
                    [company.id]
                );

                if (existing) {
                    logger.info(`⊘ ${company.name} (${company.id}) - already has storage bucket`);
                    skippedCount++;
                    continue;
                }

                // Create storage bucket with default 10GB quota
                await createCompanyBucket(company.id, 10);
                logger.info(`✓ ${company.name} (${company.id}) - storage bucket created (10GB)`);
                successCount++;

            } catch (error) {
                logger.error(`✗ ${company.name} (${company.id}) - failed:`, error);
                errorCount++;
            }
        }

        logger.info('\n=== Migration Summary ===');
        logger.info(`Total companies: ${companies.length}`);
        logger.info(`✓ Successfully created: ${successCount}`);
        logger.info(`⊘ Already existed: ${skippedCount}`);
        logger.info(`✗ Errors: ${errorCount}`);

        if (errorCount > 0) {
            logger.warn('\nSome companies failed. Please review errors above.');
            process.exit(1);
        } else {
            logger.info('\n✓ Migration completed successfully!');
            process.exit(0);
        }

    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateExistingCompanies();
