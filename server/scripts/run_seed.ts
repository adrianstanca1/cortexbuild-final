
import 'dotenv/config';
import { initializeDatabase } from '../database.js';
import { seedDatabase } from '../seed.js';
import { logger } from '../utils/logger.js';

async function main() {
    try {
        logger.info('Starting Manual Seed...');
        await initializeDatabase();
        await seedDatabase();
        logger.info('Manual Seed Complete.');
        process.exit(0);
    } catch (error) {
        logger.error('Seed Failed:', error);
        console.error(error);
        process.exit(1);
    }
}

main();
