#!/usr/bin/env ts-node
/**
 * Migration CLI tool
 * Usage: npm run migrate [up|down|status]
 */

import { Migrator } from '../database/migrator.js';
import { initializeDatabase } from '../database.js';

async function main() {
  const command = process.argv[2] || 'up';

  // Initialize database connection
  await initializeDatabase();

  const migrator = new Migrator();

  try {
    switch (command) {
      case 'up': {
        await migrator.up();
        break;
      }

      case 'down': {
        await migrator.down();
        break;
      }

      case 'status': {
        const status = await migrator.status();
        console.log('\nMigration Status:');
        console.log('================');
        console.log(`Executed: ${status.executed.length}`);
        console.log(`Pending: ${status.pending.length}`);

        if (status.executed.length > 0) {
          console.log('\nExecuted migrations:');
          status.executed.forEach(m => {
            console.log(`  ✓ ${m.id}_${m.name} (${m.executedAt})`);
          });
        }

        if (status.pending.length > 0) {
          console.log('\nPending migrations:');
          status.pending.forEach(m => {
            console.log(`  ○ ${m.filename}`);
          });
        }
        break;
      }

      default:
        console.log('Usage: npm run migrate [up|down|status]');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
