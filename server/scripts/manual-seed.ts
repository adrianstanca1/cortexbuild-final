import { initializeDatabase } from '../database.js';
import { seedDatabase } from '../seed.js';
import { logger } from '../utils/logger.js';

(async () => {
    try {
        logger.info('Starting manual database seed...');
        await initializeDatabase();
        await seedDatabase();
        logger.info('✅ Manual seed complete.');
        process.exit(0);
    } catch (e) {
        logger.error('❌ Manual seed failed:', e);
        process.exit(1);
    }
})();
