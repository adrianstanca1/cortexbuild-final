import { initializeDatabase } from '../database.js';
import { seedDatabase } from '../seed.js';
import 'dotenv/config';

async function runSeed() {
    console.log('🌱 Starting seed on Supabase...');
    // Force production mode to use Postgres Adapter
    process.env.NODE_ENV = 'production';
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Removed for security

    try {
        await initializeDatabase();
        await seedDatabase();
        console.log('✅ Seeding finished successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    }
}

runSeed();
