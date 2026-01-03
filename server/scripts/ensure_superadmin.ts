
import { getDb, initializeDatabase } from '../database.js';

async function main() {
    await initializeDatabase();
    const db = getDb();

    const targetName = 'adrian';
    const fallbackEmail = 'demo@buildpro.app';

    console.log(`Listing all users...`);
    const allUsers = await db.all('SELECT id, email, name, role FROM users');
    console.log("Existing Users:", JSON.stringify(allUsers, null, 2));

    let user = allUsers.find(u => u.email.includes(targetName) || u.name.toLowerCase().includes(targetName));

    if (!user) {
        console.log(`User matching '${targetName}' not found. Checking demo user...`);
        user = allUsers.find(u => u.email === fallbackEmail);
    }

    if (!user) {
        console.error("No suitable user found to promote.");
        process.exit(1);
    }

    console.log(`Promoting user ${user.name} (${user.email}) to SUPERADMIN...`);

    // Update Users table
    await db.run('UPDATE users SET role = ? WHERE id = ?', ['SUPERADMIN', user.id]);

    console.log("Success! Role updated.");
}

main().catch(console.error);
