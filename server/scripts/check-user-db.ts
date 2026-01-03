
import { getDb, ensureDbInitialized } from '../database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function checkDb() {
    await ensureDbInitialized();
    const db = getDb();
    
    const email = 'adrian.stanca1@gmail.com';
    console.log(`Checking database for user: ${email}...`);

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
        console.error('User not found in users table');
    } else {
        console.log('User Record:', user);
    }

    const memberships = await db.all('SELECT * FROM memberships WHERE userId = ?', [user?.id]);
    console.log('Membership Records:', memberships);
    
    const companies = await db.all('SELECT id, name FROM companies');
    console.log('Companies:', companies);
}

checkDb().catch(console.error);
