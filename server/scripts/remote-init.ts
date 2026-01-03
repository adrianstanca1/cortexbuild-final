
import 'dotenv/config';
import { ensureDbInitialized } from '../database.js';

async function main() {
    console.log('Initializing Remote DB Schema...');
    try {
        await ensureDbInitialized();
        console.log('✅ Remote DB Initialized.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Initialization Failed:', e);
        process.exit(1);
    }
}
main();
