import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

interface TimelineEvent {
    id: string;
    timestamp: string;
    action: string;
    actor: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    resource: {
        type: string;
        id: string;
        name?: string;
    };
    details: any;
    metadata: any;
    ip_address?: string;
}

export class AuditController {
    /**
     * Get company timeline
     * GET /api/audit/companies/:companyId/timeline
     */
    async getCompanyTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { limit = 50, offset = 0, action, actor, since } = req.query;

            let query = `
                SELECT 
                    a.id, a.createdAt as timestamp, a.action, a.userId, a.companyId, a.resource as resourceType, a.resourceId,
                    a.details, a.metadata, a.ipAddress,
                    t.name as actorName, t.email as actorEmail, t.role as actorRole
                FROM audit_logs a
                LEFT JOIN team t ON a.userId = t.userId
                WHERE a.companyId = ?
            `;

            const params: any[] = [tenantId];

            if (action) {
                query += ` AND a.action LIKE ?`;
                params.push(`%${action}%`);
            }

            if (actor) {
                query += ` AND a.userId = ?`;
                params.push(actor);
            }

            if (since) {
                query += ` AND a.createdAt >= ?`;
                params.push(since);
            }

            query += ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`;
            params.push(Number(limit), Number(offset));

            const auditLogs = await db.all(query, params);

            // Count total
            const countResult = await db.get(`SELECT COUNT(*) as total FROM audit_logs WHERE companyId = ?`, [tenantId]);
            const total = countResult?.total || 0;

            // Transform to timeline events
            const events: TimelineEvent[] = auditLogs.map((log: any) => ({
                id: log.id,
                timestamp: log.timestamp,
                action: log.action,
                actor: {
                    id: log.userId,
                    name: log.actorName || 'Unknown',
                    email: log.actorEmail || 'unknown@example.com',
                    role: log.actorRole || 'USER',
                },
                resource: {
                    type: log.resourceType || 'unknown',
                    id: log.resourceId || '',
                    name: log.details ? JSON.parse(log.details).name : undefined,
                },
                details: log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : {},
                metadata: log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {},
                ip_address: log.ipAddress,
            }));

            return res.json({
                events,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                },
            });
        } catch (error) {
            logger.error('Error fetching company timeline:', error);
            next(error);
        }
    }

    /**
     * Get user audit logs
     * GET /api/audit/users/:userId
     */
    async getUserAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { userId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            const logs = await db.all(
                `SELECT *, createdAt as timestamp FROM audit_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
                [userId, Number(limit), Number(offset)]
            );

            return res.json(Array.isArray(logs) ? logs : []);
        } catch (error) {
            logger.error('Error in getUserAuditLogs:', error);
            next(error);
        }
    }

    /**
     * Export audit logs
     * GET /api/audit/companies/:companyId/export
     */
    async exportAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { format = 'json', startDate, endDate } = req.query;

            let query = `SELECT * FROM audit_logs WHERE companyId = ?`;
            const params: any[] = [tenantId];

            if (startDate) {
                query += ` AND createdAt >= ?`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND createdAt <= ?`;
                params.push(endDate);
            }

            query += ` ORDER BY createdAt DESC`;

            const auditLogs = await db.all(query, params);

            if (format === 'csv') {
                const csv = this.convertToCSV(auditLogs || []);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${tenantId}_${Date.now()}.csv"`);
                return res.send(csv);
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${tenantId}_${Date.now()}.json"`);
            return res.json(auditLogs || []);
        } catch (error) {
            logger.error('Error in exportAuditLogs:', error);
            next(error);
        }
    }

    /**
     * Get audit statistics
     * GET /api/audit/companies/:companyId/stats
     */
    async getAuditStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { period = '7d' } = req.query;

            const now = new Date();
            const startDate = new Date();
            switch (period) {
                case '24h': startDate.setHours(now.getHours() - 24); break;
                case '30d': startDate.setDate(now.getDate() - 30); break;
                case '7d':
                default:
                    startDate.setDate(now.getDate() - 7);
            }

            const logs = await db.all(
                `SELECT action, userId, createdAt as timestamp FROM audit_logs WHERE companyId = ? AND createdAt >= ?`,
                [tenantId, startDate.toISOString()]
            );

            const stats = {
                totalEvents: logs.length,
                uniqueActors: new Set(logs.map((l: any) => l.userId)).size,
                topActions: this.getTopActions(logs),
                activityByDay: this.getActivityByDay(logs),
            };

            return res.json(stats);
        } catch (error) {
            logger.error('Error in getAuditStats:', error);
            next(error);
        }
    }

    // Helper methods
    private convertToCSV(data: any[]): string {
        if (data.length === 0) return '';
        const headers = ['timestamp', 'action', 'userId', 'resourceType', 'resourceId', 'ipAddress'];
        const rows = data.map(row =>
            headers.map(header => JSON.stringify(row[header] || '')).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    }

    private getTopActions(logs: any[]): { action: string; count: number }[] {
        const actionCounts: Record<string, number> = {};
        logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        });
        return Object.entries(actionCounts)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    private getActivityByDay(logs: any[]): { date: string; count: number }[] {
        const dayCounts: Record<string, number> = {};
        logs.forEach(log => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            dayCounts[date] = (dayCounts[date] || 0) + 1;
        });
        return Object.entries(dayCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}

export const auditController = new AuditController();
