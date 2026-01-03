
import { initializeDatabase, getDb } from '../database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function checkProjects() {
    console.log('--- Checking Project Data ---');
    try {
        await initializeDatabase();
        const db = getDb();
        
        const projects = await db.all('SELECT * FROM projects');
        console.log(`Total projects found: ${projects.length}`);
        
        if (projects.length > 0) {
            console.log('Sample Project:', projects[0]);
        } else {
            console.log('No projects found in the database.');
        }

        const tasks = await db.all('SELECT * FROM tasks');
        console.log(`Total tasks found: ${tasks.length}`);
        if (tasks.length > 0) {
            console.log('Sample Task:', tasks[0]);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkProjects().catch(console.error);
