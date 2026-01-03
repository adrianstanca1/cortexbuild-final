import { getDb } from '../database.js';

/**
 * Transaction helper for multi-step database operations
 * Ensures atomicity - all operations succeed or all rollback
 */

export interface TransactionCallback<T> {
    (db: any): Promise<T>;
}

/**
 * Execute operations within a transaction
 * Automatically commits on success, rolls back on error
 */
export async function withTransaction<T>(
    callback: TransactionCallback<T>
): Promise<T> {
    const db = getDb();

    try {
        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        // Execute callback with database connection
        const result = await callback(db);

        // Commit if successful
        await db.run('COMMIT');

        return result;
    } catch (error) {
        // Rollback on error
        try {
            await db.run('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error during rollback:', rollbackError);
        }

        // Re-throw original error
        throw error;
    }
}

/**
 * Example usage:
 * 
 * const result = await withTransaction(async (db) => {
 *   await db.run('INSERT INTO users ...', [params]);
 *   await db.run('INSERT INTO memberships ...', [params]);
 *   return { success: true };
 * });
 */
