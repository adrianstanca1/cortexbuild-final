
import 'dotenv/config';
import { ensureDbInitialized } from '../database.js';
import { seedDatabase } from '../seed.js';

async function main() {
    console.log('Seeding Remote DB...');
    try {
        await ensureDbInitialized();
        await seedDatabase();
        console.log('✅ Remote DB Seeded.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Seeding Failed:', e);
        process.exit(1);
    }
}
main();
