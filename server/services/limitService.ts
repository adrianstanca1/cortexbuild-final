import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';

/**
 * LimitService - Manages resource quotas and usage tracking for companies
 * Handles limit checking, enforcement, and usage alerts
 */
export class LimitService {
    /**
     * Get all limits for a company
     */
    async getCompanyLimits(companyId: string) {
        const db = getDb();

        const limits = await db.all(
            `SELECT * FROM companylimits
       WHERE companyId = ?
       ORDER BY limitType`,
            [companyId]
        );

        return limits;
    }

    /**
     * Set a limit for a company
     */
    async setLimit(
        companyId: string,
        limitType: string,
        limitValue: number,
        softLimitThreshold: number = 0.80
    ) {
        const db = getDb();

        if (limitValue < 0) {
            throw new Error('Limit value must be non-negative');
        }

        if (softLimitThreshold < 0 || softLimitThreshold > 1) {
            throw new Error('Soft limit threshold must be between 0 and 1');
        }

        const now = new Date().toISOString();
        const isMysql = process.env.DATABASE_TYPE === 'mysql';
        const query = isMysql
            ? `INSERT INTO companylimits (companyId, limitType, limitValue, softLimitThreshold, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE limitValue = VALUES(limitValue), softLimitThreshold = VALUES(softLimitThreshold), updatedAt = VALUES(updatedAt)`
            : `INSERT INTO companylimits (companyId, limitType, limitValue, softLimitThreshold, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT (companyId, limitType)
               DO UPDATE SET limitValue = ?, softLimitThreshold = ?, updatedAt = ?`;

        let params;
        if (isMysql) {
            params = [companyId, limitType, limitValue, softLimitThreshold, now, now];
        } else {
            params = [companyId, limitType, limitValue, softLimitThreshold, now, now, limitValue, softLimitThreshold, now];
        }

        await db.run(query, params);

        logger.info(`Limit '${limitType}' set to ${limitValue} for company ${companyId}`);
    }

    /**
     * Check if a company is within its limit for a specific resource
     */
    async checkLimit(
        companyId: string,
        limitType: string
    ): Promise<{ allowed: boolean; usage: number; limit: number; remaining: number }> {
        const db = getDb();

        const limitRecord = await db.get(
            `SELECT * FROM companylimits
       WHERE companyId = ? AND limitType = ?`,
            [companyId, limitType]
        );

        if (!limitRecord) {
            // No limit set means unlimited
            return { allowed: true, usage: 0, limit: -1, remaining: -1 };
        }

        const usage = limitRecord.currentUsage || 0;
        const limit = limitRecord.limitValue;
        const allowed = usage < limit;
        const remaining = Math.max(0, limit - usage);

        return { allowed, usage, limit, remaining };
    }

    /**
     * Increment usage for a resource
     */
    async incrementUsage(companyId: string, limitType: string, amount: number = 1) {
        const db = getDb();

        // Check if limit exists, create if not
        const existing = await db.get(
            `SELECT * FROM companylimits WHERE companyId = ? AND limitType = ?`,
            [companyId, limitType]
        );

        const now = new Date().toISOString();
        if (!existing) {
            // Create with no limit (unlimited)
            await db.run(
                `INSERT INTO companylimits (companyId, limitType, limitValue, currentUsage, createdAt, updatedAt)
         VALUES (?, ?, 999999, ?, ?, ?)`,
                [companyId, limitType, amount, now, now]
            );
        } else {
            await db.run(
                `UPDATE companylimits
         SET currentUsage = currentUsage + ?, updatedAt = ?
         WHERE companyId = ? AND limitType = ?`,
                [amount, now, companyId, limitType]
            );
        }

        // Check if we've exceeded the limit
        const check = await this.checkLimit(companyId, limitType);
        if (!check.allowed) {
            logger.warn(`Company ${companyId} has exceeded limit for ${limitType}: ${check.usage}/${check.limit}`);
        }
    }

    /**
     * Decrement usage for a resource
     */
    async decrementUsage(companyId: string, limitType: string, amount: number = 1) {
        const db = getDb();

        const now = new Date().toISOString();
        // GREATEST(0, currentUsage - ?) is not standard across all DBs, use CASE
        await db.run(
            `UPDATE companylimits
       SET currentUsage = CASE WHEN currentUsage - ? < 0 THEN 0 ELSE currentUsage - ? END, updatedAt = ?
       WHERE companyId = ? AND limitType = ?`,
            [amount, amount, now, companyId, limitType]
        );
    }

    /**
     * Get usage alerts for companies approaching limits
     */
    async getUsageAlerts(companyId: string) {
        const db = getDb();

        const alerts = await db.all(
            `SELECT *,
              CAST(currentUsage AS FLOAT) / NULLIF(limitValue, 0) as usage_percentage
       FROM companylimits
       WHERE companyId = ?
         AND CAST(currentUsage AS FLOAT) / NULLIF(limitValue, 0) >= softLimitThreshold
       ORDER BY usage_percentage DESC`,
            [companyId]
        );

        return alerts.map(alert => ({
            limitType: alert.limitType,
            usage: alert.currentUsage,
            limit: alert.limitValue,
            usagePercentage: alert.usage_percentage,
            threshold: alert.softLimitThreshold,
            severity: alert.usage_percentage >= 1 ? 'critical' : alert.usage_percentage >= 0.95 ? 'high' : 'medium'
        }));
    }

    /**
     * Bootstrap default limits for a new company based on their plan
     */
    async bootstrapDefaultLimits(companyId: string, plan: string) {
        const PLAN_LIMITS: Record<string, Record<string, number>> = {
            'Free': {
                'user_seats': 5,
                'projects': 3,
                'storage_gb': 1,
                'api_calls_per_day': 1000
            },
            'Starter': {
                'user_seats': 15,
                'projects': 10,
                'storage_gb': 10,
                'api_calls_per_day': 10000
            },
            'Professional': {
                'user_seats': 50,
                'projects': 50,
                'storage_gb': 100,
                'api_calls_per_day': 100000
            },
            'Enterprise': {
                'user_seats': 999999,
                'projects': 999999,
                'storage_gb': 1000,
                'api_calls_per_day': 1000000
            }
        };

        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['Free'];

        for (const [limitType, limitValue] of Object.entries(limits)) {
            await this.setLimit(companyId, limitType, limitValue);
        }

        logger.info(`Default limits bootstrapped for company ${companyId} with plan ${plan}`);
    }

    /**
     * Enforce a limit - throws error if exceeded
     */
    async enforceLimit(companyId: string, limitType: string, requestedAmount: number = 1) {
        const check = await this.checkLimit(companyId, limitType);

        if (check.limit !== -1 && (check.usage + requestedAmount) > check.limit) {
            throw new Error(
                `Resource limit exceeded for ${limitType}: ${check.usage + requestedAmount}/${check.limit}. ` +
                `Please upgrade your plan or contact support.`
            );
        }
    }
}

export const limitService = new LimitService();
