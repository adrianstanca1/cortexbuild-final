import { IDatabase, getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const path = require('path');

/**
 * TenantDatabaseFactory
 * Manages the creation and retrieval of tenant-specific database connections.
 * Follows the "Two-Layer Data Architecture" pattern.
 */
export class TenantDatabaseFactory {
    private static instance: TenantDatabaseFactory;
    private connectionPools: Map<string, IDatabase> = new Map();

    private constructor() { }

    public static getInstance(): TenantDatabaseFactory {
        if (!TenantDatabaseFactory.instance) {
            TenantDatabaseFactory.instance = new TenantDatabaseFactory();
        }
        return TenantDatabaseFactory.instance;
    }

    /**
     * Get a connection to a specific tenant's database.
     * @param tenantId The unique identifier for the tenant (not companyId, but the logical tenantId from registry)
     */
    public async getTenantDatabase(tenantId: string): Promise<IDatabase> {
        if (this.connectionPools.has(tenantId)) {
            return this.connectionPools.get(tenantId)!;
        }

        // 1. Resolve connection details from Platform DB (Registry)
        const platformDb = getDb();

        let registryEntry;
        try {
            registryEntry = await platformDb.get(
                'SELECT * FROM tenant_registry WHERE tenantId = ?',
                [tenantId]
            );
        } catch (e) {
            // Table doesn't exist or other error - assume Legacy/Shared Mode
        }

        if (!registryEntry) {
            return platformDb;
        }

        let tenantDb: IDatabase;

        if (process.env.DATABASE_TYPE === 'postgres' || process.env.DATABASE_TYPE === 'mysql') {
            if (registryEntry.db_connection_string) {
                if (process.env.DATABASE_TYPE === 'postgres') {
                    tenantDb = new PostgresTenantAdapter(registryEntry.db_connection_string);
                } else {
                    tenantDb = platformDb;
                }
            } else {
                tenantDb = platformDb;
            }
        } else {
            const tenantsDir = path.resolve(process.cwd(), 'tenants');

            let dbPath: string;
            if (registryEntry.db_connection_string) {
                dbPath = path.resolve(process.cwd(), registryEntry.db_connection_string);
            } else {
                const safeTenantId = path.basename(tenantId).replace(/[^a-zA-Z0-9_-]/g, '');
                dbPath = path.join(tenantsDir, `${safeTenantId}.sqlite`);
            }
            const fs = require('fs');
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const sqlite3 = require('sqlite3');
            const { open } = require('sqlite');
            const db = await open({ filename: dbPath, driver: sqlite3.Database });
            await db.exec('PRAGMA foreign_keys = ON;');
            tenantDb = new SqliteTenantAdapter(db);
        }

        this.connectionPools.set(tenantId, tenantDb);
        return tenantDb;
    }

    public evictConnection(tenantId: string) {
        this.connectionPools.delete(tenantId);
    }
}

class SqliteTenantAdapter implements IDatabase {
    constructor(private db: any) { }
    async all<T = any>(sql: string, params?: any[]) { return this.db.all(sql, params); }
    async get<T = any>(sql: string, params?: any[]) { return this.db.get(sql, params); }
    async run(sql: string, params?: any[]) { return this.db.run(sql, params); }
    async exec(sql: string) { return this.db.exec(sql); }
    getType(): 'sqlite' { return 'sqlite'; }
    async close() { if (this.db) await this.db.close(); }
    async transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T> {
        await this.db.run('BEGIN TRANSACTION');
        try {
            const result = await fn(this);
            await this.db.run('COMMIT');
            return result;
        } catch (e) {
            await this.db.run('ROLLBACK');
            throw e;
        }
    }
}

class PostgresTenantAdapter implements IDatabase {
    private pool: any;
    constructor(connectionString: string) {
        this.pool = new Pool({ connectionString });
    }
    private normalizeSql(sql: string): string {
        let i = 1;
        return sql.replace(/\?/g, () => `$${i++}`);
    }
    async all<T = any>(sql: string, params?: any[]) {
        const res = await this.pool.query(this.normalizeSql(sql), params);
        return res.rows;
    }
    async get<T = any>(sql: string, params?: any[]) {
        const res = await this.pool.query(this.normalizeSql(sql), params);
        return res.rows[0];
    }
    async run(sql: string, params?: any[]) {
        const res = await this.pool.query(this.normalizeSql(sql), params);
        return { changes: res.rowCount };
    }
    async exec(sql: string) {
        await this.pool.query(sql);
    }
    getType(): 'postgres' { return 'postgres'; }
    async close() { if (this.pool) await this.pool.end(); }
    async transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const adapter = Object.create(this);
            adapter.pool = { query: (q: string, p: any) => client.query(q, p) };
            const result = await fn(adapter);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

export const tenantDatabaseFactory = TenantDatabaseFactory.getInstance();
