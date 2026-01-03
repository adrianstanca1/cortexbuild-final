import { v4 as uuidv4 } from 'uuid';
import { IDatabase, getDb } from '../database.js'; // Import getDb only for default fallback if needed, but prefer injection
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import type { AuditLog, AuditEventDto, AuditFilters } from '../types/rbac.js';

/**
 * AuditService
 * Handles audit logging for compliance and security
 */
export class AuditService {
    /**
     * Log an audit event
     */
    async log(db: IDatabase, event: AuditEventDto): Promise<void> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const changes = event.metadata ? JSON.stringify(event.metadata) : null;

        try {
            await db.run(
                `INSERT INTO audit_logs (id, userId, userName, companyId, action, resource, resourceId, changes, status, createdAt, ipAddress, userAgent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    event.userId || 'anonymous',
                    event.userName || 'Guest',
                    event.companyId || 'system',
                    event.action,
                    event.resource || 'unknown',
                    event.resourceId || 'none',
                    changes,
                    'success',
                    now,
                    event.ipAddress || null,
                    event.userAgent || null
                ]
            );

            logger.debug(`Audit log created: ${event.action} by ${event.userId}`);
        } catch (error) {
            logger.error(`Failed to create audit log: ${error}`);
        }
    }

    /**
     * Enhanced helper to log audit events directly from an Express Request
     */
    async logRequest(req: any, action: string, resource: string, resourceId: string, metadata: any = null): Promise<void> {
        const db = req.tenantDb || getDb();
        const context = req.context || {};

        await this.log(db, {
            userId: context.userId || req.userId || 'anonymous',
            userName: context.userName || req.userName || 'Guest',
            companyId: context.tenantId || req.tenantId || 'system',
            action,
            resource,
            resourceId,
            metadata,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    }

    /**
     * Log a user-facing activity for the timeline feed
     */
    async logActivity(db: IDatabase, activity: {
        companyId: string;
        projectId: string | null;
        userId: string;
        userName: string;
        action: string;
        entityType: string;
        entityId: string;
        metadata?: any;
    }): Promise<void> {
        const id = uuidv4();
        const now = new Date().toISOString();
        const metaStr = activity.metadata ? JSON.stringify(activity.metadata) : null;

        try {
            await db.run(`
                INSERT INTO activity_feed (
                    id, companyId, projectId, userId, userName,
                    action, entityType, entityId, metadata, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                activity.companyId,
                activity.projectId,
                activity.userId,
                activity.userName,
                activity.action,
                activity.entityType,
                activity.entityId,
                metaStr,
                now
            ]);

            // Broadcast real-time activity
            try {
                const { broadcastToCompany } = await import('../socket.js');
                broadcastToCompany(activity.companyId, {
                    type: 'activity_new',
                    data: {
                        id,
                        ...activity,
                        createdAt: now
                    }
                });
            } catch (e) {
                logger.warn('Failed to broadcast activity:', e);
            }

            logger.debug(`Activity logged: ${activity.action} on ${activity.entityType}`);
        } catch (error) {
            logger.error(`Failed to log activity: ${error}`);
        }
    }

    /**
     * Helper to log activity directly from an Express Request
     */
    async logActivityRequest(req: any, projectId: string | null, action: string, entityType: string, entityId: string, metadata: any = null): Promise<void> {
        const db = req.tenantDb || getDb();
        const context = req.context || {};

        await this.logActivity(db, {
            companyId: context.tenantId || req.tenantId || 'system',
            projectId,
            userId: context.userId || req.userId || 'anonymous',
            userName: context.userName || req.userName || 'Guest',
            action,
            entityType,
            entityId,
            metadata
        });
    }

    /**
     * Get audit logs with filtering
     */
    async getAuditLogs(db: IDatabase, filters: AuditFilters): Promise<AuditLog[]> {
        const conditions: string[] = [];
        const params: any[] = [];

        if (filters.userId) {
            conditions.push('userId = ?');
            params.push(filters.userId);
        }

        if (filters.companyId) {
            conditions.push('companyId = ?');
            params.push(filters.companyId);
        }

        if (filters.action) {
            conditions.push('action LIKE ?');
            params.push(`%${filters.action}%`);
        }

        if (filters.resource) {
            conditions.push('resource = ?');
            params.push(filters.resource);
        }

        if (filters.startDate) {
            conditions.push('createdAt >= ?');
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push('createdAt <= ?');
            params.push(filters.endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;

        const rows = await db.all(
            `SELECT * FROM audit_logs ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return rows.map(row => this.parseAuditLog(row));
    }

    /**
     * Get audit log count with filtering
     */
    async getAuditLogCount(db: IDatabase, filters: AuditFilters): Promise<number> {
        const conditions: string[] = [];
        const params: any[] = [];

        if (filters.userId) {
            conditions.push('userId = ?');
            params.push(filters.userId);
        }

        if (filters.companyId) {
            conditions.push('companyId = ?');
            params.push(filters.companyId);
        }

        if (filters.action) {
            conditions.push('action LIKE ?');
            params.push(`%${filters.action}%`);
        }

        if (filters.resource) {
            conditions.push('resource = ?');
            params.push(filters.resource);
        }

        if (filters.startDate) {
            conditions.push('createdAt >= ?');
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push('createdAt <= ?');
            params.push(filters.endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await db.get(
            `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
            params
        );

        return result.count;
    }

    /**
     * Export audit logs as CSV
     */
    async exportAuditLogs(db: IDatabase, filters: AuditFilters): Promise<string> {
        const logs = await this.getAuditLogs(db, { ...filters, limit: 10000 });

        const headers = ['Timestamp', 'User ID', 'Company ID', 'Action', 'Resource', 'Resource ID', 'IP Address'];
        const rows = logs.map(log => [
            log.createdAt,
            log.userId || '',
            log.companyId || '',
            log.action,
            log.resource || '',
            log.resourceId || '',
            log.ipAddress || '',
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        return csv;
    }

    /**
     * Delete old audit logs (for cleanup)
     */
    async deleteOldLogs(db: IDatabase, olderThan: string): Promise<number> {
        const result = await db.run(
            'DELETE FROM audit_logs WHERE createdAt < ?',
            [olderThan]
        );

        logger.info(`Deleted ${result.changes} old audit logs`);
        return result.changes || 0;
    }

    /**
     * Parse database row to AuditLog object
     */
    private parseAuditLog(row: any): AuditLog {
        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }
}

// Export singleton instance
export const auditService = new AuditService();

