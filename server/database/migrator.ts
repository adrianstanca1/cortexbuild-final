import { promises as fs } from 'fs';
import path from 'path';
import { getDb } from '../database.js';

interface Migration {
    id: number;
    name: string;
    executedAt: string;
}

interface MigrationFile {
    filename: string;
    version: number;
    name: string;
    sql: string;
}

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Migration Runner
 * Handles automated migration execution with tracking
 */
export class Migrator {
    private migrationsDir: string;

    constructor(migrationsDir?: string) {
        this.migrationsDir = migrationsDir || path.join(__dirname, '..', 'migrations');
    }

    /**
     * Initialize migrations tracking table
     */
    private async ensureMigrationsTable(): Promise<void> {
        const db = getDb();

        await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }

    /**
     * Get list of executed migrations
     */
    private async getExecutedMigrations(): Promise<Migration[]> {
        const db = getDb();

        try {
            const migrations = await db.all('SELECT * FROM migrations ORDER BY id ASC') as Migration[];
            return migrations || [];
        } catch (error) {
            // Table doesn't exist yet
            return [];
        }
    }

    /**
     * Read migration files from directory
     */
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        try {
            const files = await fs.readdir(this.migrationsDir);
            const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

            const migrations: MigrationFile[] = [];

            for (const filename of sqlFiles) {
                const filePath = path.join(this.migrationsDir, filename);
                const sql = await fs.readFile(filePath, 'utf-8');

                // Extract version from filename (e.g., 001_initial.sql -> 1)
                const match = filename.match(/^(\d+)_(.+)\.sql$/);
                if (match) {
                    migrations.push({
                        filename,
                        version: parseInt(match[1], 10),
                        name: match[2],
                        sql,
                    });
                }
            }

            return migrations;
        } catch (error) {
            console.error('Error reading migration files:', error);
            return [];
        }
    }

    /**
     * Execute a single migration
     */
    private async executeMigration(migration: MigrationFile): Promise<void> {
        const db = getDb();

        console.log(`Executing migration: ${migration.filename}`);

        // Split SQL by semicolons and execute each statement
        const statements = migration.sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await db.run(statement);
        }

        // Record migration as executed
        await db.run(
            'INSERT INTO migrations (id, name) VALUES (?, ?)',
            [migration.version, migration.name]
        );

        console.log(`✓ Migration ${migration.filename} completed`);
    }

    /**
     * Run pending migrations
     */
    async up(): Promise<void> {
        console.log('Starting database migrations...');

        await this.ensureMigrationsTable();

        const executed = await this.getExecutedMigrations();
        const executedVersions = new Set(executed.map(m => m.id));

        const allMigrations = await this.getMigrationFiles();
        const pending = allMigrations.filter(m => !executedVersions.has(m.version));

        if (pending.length === 0) {
            console.log('✓ No pending migrations');
            return;
        }

        console.log(`Found ${pending.length} pending migration(s)`);

        for (const migration of pending) {
            try {
                await this.executeMigration(migration);
            } catch (error) {
                console.error(`✗ Migration ${migration.filename} failed:`, error);
                throw error;
            }
        }

        console.log('✓ All migrations completed successfully');
    }

    /**
     * Rollback last migration (if supported)
     */
    async down(): Promise<void> {
        console.log('Rollback not implemented - migrations are forward-only');
        console.log('To rollback, restore from database backup');
    }

    /**
     * Get migration status
     */
    async status(): Promise<{ executed: Migration[]; pending: MigrationFile[] }> {
        await this.ensureMigrationsTable();

        const executed = await this.getExecutedMigrations();
        const executedVersions = new Set(executed.map(m => m.id));

        const allMigrations = await this.getMigrationFiles();
        const pending = allMigrations.filter(m => !executedVersions.has(m.version));

        return { executed, pending };
    }
}

/**
 * Run migrations on startup
 */
export async function runMigrations(): Promise<void> {
    const migrator = new Migrator();
    await migrator.up();
}
