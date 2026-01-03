import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BuildProDB extends DBSchema {
    requests: {
        key: string;
        value: {
            id: string;
            url: string;
            method: string;
            body: any;
            timestamp: number;
            type: 'daily-log' | 'rfi';
        };
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'buildpro-offline-db';
const DB_VERSION = 1;

export class OfflineStorage {
    private dbPromise: Promise<IDBPDatabase<BuildProDB>>;

    constructor() {
        this.dbPromise = openDB<BuildProDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const store = db.createObjectStore('requests', { keyPath: 'id' });
                store.createIndex('by-date', 'timestamp');
            },
        });
    }

    async addRequest(request: Omit<BuildProDB['requests']['value'], 'id' | 'timestamp'>) {
        const db = await this.dbPromise;
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        await db.add('requests', { ...request, id, timestamp });
        return id;
    }

    async getRequests() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('requests', 'by-date');
    }

    async removeRequest(id: string) {
        const db = await this.dbPromise;
        await db.delete('requests', id);
    }

    async clearRequests() {
        const db = await this.dbPromise;
        await db.clear('requests');
    }
}

export const offlineStorage = new OfflineStorage();
