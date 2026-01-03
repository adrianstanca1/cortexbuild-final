import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import ExcelJS from 'exceljs';

/**
 * Export all users to Excel
 */
export const exportUsersExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const users = await db.all(`
            SELECT u.id, u.name, u.email, u.role, u.companyId, c.name as companyName, 
                   u.isActive, u.createdAt, u.updatedAt
            FROM users u
            LEFT JOIN companies c ON u.companyId = c.id
            ORDER BY u.createdAt DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');

        // Add headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Role', key: 'role', width: 20 },
            { header: 'Company', key: 'companyName', width: 25 },
            { header: 'Active', key: 'isActive', width: 10 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }
        };

        // Add data
        users.forEach(user => {
            worksheet.addRow({
                ...user,
                isActive: user.isActive ? 'Yes' : 'No',
                createdAt: new Date(user.createdAt).toLocaleString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`Users exported to Excel by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};

/**
 * Export all companies to Excel
 */
export const exportCompaniesExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companies = await db.all(`
            SELECT c.id, c.name, c.status, c.plan, c.createdAt,
                   COUNT(DISTINCT u.id) as userCount,
                   COUNT(DISTINCT p.id) as projectCount
            FROM companies c
            LEFT JOIN users u ON c.id = u.companyId
            LEFT JOIN projects p ON c.id = p.companyId
            GROUP BY c.id
            ORDER BY c.createdAt DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Companies');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Plan', key: 'plan', width: 15 },
            { header: 'Users', key: 'userCount', width: 10 },
            { header: 'Projects', key: 'projectCount', width: 10 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF10B981' }
        };

        companies.forEach(company => {
            worksheet.addRow({
                ...company,
                createdAt: new Date(company.createdAt).toLocaleString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=companies-export-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`Companies exported to Excel by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};

/**
 * Export audit logs to Excel
 */
export const exportAuditLogsExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, limit = 5000 } = req.query;
        const db = getDb();

        // Validate and sanitize limit to prevent SQL injection
        const safeLimit = Math.min(Math.max(1, parseInt(String(limit)) || 5000), 10000);

        let query = 'SELECT * FROM audit_logs';
        const params: any[] = [];

        if (startDate || endDate) {
            query += ' WHERE 1=1';
            if (startDate) {
                query += ' AND timestamp >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND timestamp <= ?';
                params.push(endDate);
            }
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(safeLimit);

        const logs = await db.all(query, params);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Audit Logs');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'User', key: 'userName', width: 25 },
            { header: 'Action', key: 'action', width: 30 },
            { header: 'Resource', key: 'resource', width: 20 },
            { header: 'Company ID', key: 'companyId', width: 30 },
            { header: 'IP Address', key: 'ipAddress', width: 20 },
            { header: 'Timestamp', key: 'timestamp', width: 20 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF59E0B' }
        };

        logs.forEach(log => {
            worksheet.addRow({
                ...log,
                timestamp: new Date(log.timestamp).toLocaleString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`Audit logs exported to Excel by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};

/**
 * Export support tickets to Excel
 */
export const exportSupportTicketsExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const tickets = await db.all(`
            SELECT id, subject, status, priority, createdBy, createdAt, resolvedAt
            FROM support_tickets
            ORDER BY createdAt DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Support Tickets');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'Subject', key: 'subject', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Priority', key: 'priority', width: 15 },
            { header: 'Created By', key: 'createdBy', width: 25 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'Resolved At', key: 'resolvedAt', width: 20 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEF4444' }
        };

        tickets.forEach(ticket => {
            worksheet.addRow({
                ...ticket,
                createdAt: new Date(ticket.createdAt).toLocaleString(),
                resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : 'N/A'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=support-tickets-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`Support tickets exported to Excel by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};

/**
 * Export system events to Excel
 */
export const exportSystemEventsExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { limit = 1000 } = req.query;
        const db = getDb();

        // Validate and sanitize limit to prevent SQL injection
        const safeLimit = Math.min(Math.max(1, parseInt(String(limit)) || 1000), 10000);

        const events = await db.all(
            'SELECT * FROM system_events ORDER BY createdAt DESC LIMIT ?',
            [safeLimit]
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('System Events');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Level', key: 'level', width: 15 },
            { header: 'Message', key: 'message', width: 50 },
            { header: 'Source', key: 'source', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8B5CF6' }
        };

        events.forEach(event => {
            worksheet.addRow({
                ...event,
                createdAt: new Date(event.createdAt).toLocaleString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=system-events-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`System events exported to Excel by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};

/**
 * Generate comprehensive platform report (JSON for PDF generation on frontend)
 */
export const generatePlatformReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Gather all platform data
        const [
            companiesCount,
            usersCount,
            projectsCount,
            activeUsers,
            recentLogs,
            systemEvents,
            supportTickets
        ] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM companies'),
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM projects'),
            db.get('SELECT COUNT(*) as count FROM users WHERE isActive = 1'),
            db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100'),
            db.all('SELECT * FROM system_events ORDER BY createdAt DESC LIMIT 50'),
            db.all('SELECT * FROM support_tickets ORDER BY createdAt DESC LIMIT 50')
        ]);

        const report = {
            generatedAt: new Date().toISOString(),
            generatedBy: (req as any).userName,
            summary: {
                totalCompanies: companiesCount.count,
                totalUsers: usersCount.count,
                activeUsers: activeUsers.count,
                totalProjects: projectsCount.count
            },
            recentActivity: {
                auditLogs: recentLogs,
                systemEvents: systemEvents,
                supportTickets: supportTickets
            }
        };

        res.json(report);
        logger.info(`Platform report generated by ${(req as any).userName}`);
    } catch (e) {
        next(e);
    }
};
