import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class ComplianceController {
    /**
     * Get data retention policy for a company
     * GET /api/compliance/companies/:companyId/retention-policy
     */
    async getRetentionPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const { companyId } = req.params;

            if (tenantId !== companyId && !req.context.isSuperadmin) {
                throw new AppError('Access denied', 403);
            }

            const db = getDb();
            const company = await db.get('SELECT id, name, settings FROM companies WHERE id = ?', [companyId]);

            if (!company) {
                throw new AppError('Company not found', 404);
            }

            const settings = typeof company.settings === 'string' ? JSON.parse(company.settings) : (company.settings || {});
            const retentionPolicy = settings.retention_policy || {
                audit_logs: 365,
                user_data: 730,
                project_data: 1095,
                documents: 2190,
                automated_cleanup: false,
            };

            return res.json({
                company_id: companyId,
                retention_policy: retentionPolicy,
                last_updated: settings.retention_policy_updated_at || null,
            });
        } catch (error) {
            logger.error('Error fetching retention policy:', error);
            next(error);
        }
    }

    /**
     * Update data retention policy
     */
    async updateRetentionPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const { companyId } = req.params;
            const { audit_logs, user_data, project_data, documents, automated_cleanup } = req.body;

            if (tenantId !== companyId && !req.context.isSuperadmin) {
                throw new AppError('Access denied', 403);
            }

            if (audit_logs && (audit_logs < 30 || audit_logs > 3650)) {
                throw new AppError('Audit logs retention must be between 30 and 3650 days', 400);
            }

            const db = getDb();
            const company = await db.get('SELECT settings FROM companies WHERE id = ?', [companyId]);

            if (!company) throw new AppError('Company not found', 404);

            const currentSettings = typeof company.settings === 'string' ? JSON.parse(company.settings) : (company.settings || {});

            const newPolicy = {
                audit_logs: audit_logs || currentSettings.retention_policy?.audit_logs || 365,
                user_data: user_data || currentSettings.retention_policy?.user_data || 730,
                project_data: project_data || currentSettings.retention_policy?.project_data || 1095,
                documents: documents || currentSettings.retention_policy?.documents || 2190,
                automated_cleanup: automated_cleanup ?? currentSettings.retention_policy?.automated_cleanup ?? false,
            };

            currentSettings.retention_policy = newPolicy;
            currentSettings.retention_policy_updated_at = new Date().toISOString();

            await db.run('UPDATE companies SET settings = ? WHERE id = ?', [JSON.stringify(currentSettings), companyId]);

            return res.json({
                message: 'Retention policy updated successfully',
                policy: newPolicy,
            });
        } catch (error) {
            logger.error('Error in updateRetentionPolicy:', error);
            next(error);
        }
    }

    /**
     * Export all company data
     */
    async exportCompanyData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const { companyId } = req.params;
            const { format = 'json', include_users = 'true', include_projects = 'true' } = req.query;

            if (tenantId !== companyId && !req.context.isSuperadmin) {
                throw new AppError('Access denied', 403);
            }

            const platformDb = getDb();
            const company = await platformDb.get('SELECT * FROM companies WHERE id = ?', [companyId]);

            if (!company) {
                throw new AppError('Company not found', 404);
            }

            const exportData: any = {
                company: company,
                export_date: new Date().toISOString(),
                includes: {
                    users: include_users === 'true',
                    projects: include_projects === 'true',
                },
            };

            if (include_users === 'true') {
                const users = await platformDb.all('SELECT id, email, role, createdAt, isActive FROM users WHERE companyId = ?', [companyId]);
                exportData.users = users || [];
            }

            const tenantDb = req.tenantDb;
            if (tenantDb) {
                if (include_projects === 'true') {
                    const projects = await tenantDb.all('SELECT * FROM projects');
                    exportData.projects = projects || [];
                }

                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const auditLogs = await tenantDb.all('SELECT * FROM audit_logs WHERE timestamp >= ? ORDER BY timestamp DESC', [ninetyDaysAgo.toISOString()]);
                exportData.audit_logs = auditLogs || [];
            }

            if (format === 'csv') {
                throw new AppError('CSV format not yet supported for full data export', 400);
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="company_data_${companyId}_${Date.now()}.json"`);
            return res.json(exportData);
        } catch (error) {
            logger.error('Error in exportCompanyData:', error);
            next(error);
        }
    }

    /**
     * Archive old audit logs
     */
    async archiveAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { olderThanDays = 365 } = req.body;

            if (olderThanDays < 90) {
                throw new AppError('Cannot archive logs less than 90 days old', 400);
            }

            const archiveDate = new Date();
            archiveDate.setDate(archiveDate.getDate() - olderThanDays);

            const logsToArchive = await db.all('SELECT id FROM audit_logs WHERE timestamp < ?', [archiveDate.toISOString()]);
            const count = logsToArchive.length;

            return res.json({
                message: count === 0 ? 'No logs found for archival' : `Found ${count} logs eligible for archival`,
                archived_count: count,
                note: 'Archival logic placeholder - logs remain in database',
            });
        } catch (error) {
            logger.error('Error in archiveAuditLogs:', error);
            next(error);
        }
    }

    /**
     * Get compliance report
     */
    async getComplianceReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.context;
            const { companyId } = req.params;

            if (tenantId !== companyId && !req.context.isSuperadmin) {
                throw new AppError('Access denied', 403);
            }

            const platformDb = getDb();
            const tenantDb = req.tenantDb;
            if (!tenantDb) throw new AppError('Tenant connection failed', 500);

            const company = await platformDb.get('SELECT * FROM companies WHERE id = ?', [companyId]);
            if (!company) throw new AppError('Company not found', 404);

            const userCountResult = await platformDb.get('SELECT COUNT(*) as count FROM users WHERE companyId = ?', [companyId]);
            const projectCountResult = await tenantDb.get('SELECT COUNT(*) as count FROM projects');
            const auditLogCountResult = await tenantDb.get('SELECT COUNT(*) as count FROM audit_logs');
            const oldestLog = await tenantDb.get('SELECT timestamp FROM audit_logs ORDER BY timestamp ASC LIMIT 1');

            const settings = typeof company.settings === 'string' ? JSON.parse(company.settings) : (company.settings || {});
            const retentionPolicy = settings.retention_policy || {};
            const auditLogRetentionDays = retentionPolicy.audit_logs || 365;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - auditLogRetentionDays);

            const logsRetainedResult = await tenantDb.get('SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= ?', [cutoffDate.toISOString()]);
            const auditLogCount = auditLogCountResult?.count || 0;
            const logsToRetain = logsRetainedResult?.count || 0;

            const report = {
                company_id: companyId,
                company_name: company.name,
                report_date: new Date().toISOString(),
                data_summary: {
                    total_users: userCountResult?.count || 0,
                    total_projects: projectCountResult?.count || 0,
                    total_audit_logs: auditLogCount,
                    oldest_audit_log: oldestLog?.timestamp || null,
                },
                retention_policy: {
                    audit_logs_days: auditLogRetentionDays,
                    automated_cleanup: retentionPolicy.automated_cleanup || false,
                },
                compliance_status: {
                    logs_within_retention: logsToRetain,
                    logs_outside_retention: auditLogCount - logsToRetain,
                    retention_compliance_pct: auditLogCount ? ((logsToRetain / auditLogCount) * 100).toFixed(2) : 100,
                },
            };

            return res.json(report);
        } catch (error) {
            logger.error('Error in getComplianceReport:', error);
            next(error);
        }
    }

    /**
     * Get all safety checklists
     */
    async getSafetyChecklists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const checklists = await db.all('SELECT * FROM safety_checklists ORDER BY createdAt DESC');
            const checklistsWithItems = await Promise.all(checklists.map(async (cl: any) => {
                const items = await db.all('SELECT * FROM safety_checklist_items WHERE checklistId = ?', [cl.id]);
                return { ...cl, safety_checklist_items: items };
            }));

            return res.json(checklistsWithItems);
        } catch (error) {
            logger.error('Error in getSafetyChecklists:', error);
            next(error);
        }
    }

    /**
     * Create a new safety checklist
     */
    async createSafetyChecklist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { userId, tenantId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { name, projectId, items } = req.body;
            if (!name || !items || !Array.isArray(items)) {
                throw new AppError('name and items are required', 400);
            }

            const checklistId = `sc-${uuidv4()}`;
            const now = new Date().toISOString();

            await db.run(
                `INSERT INTO safety_checklists (id, companyId, projectId, name, date, inspector, status, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [checklistId, tenantId, projectId || null, name, now.split('T')[0], userId, 'In Progress', now, now]
            );

            const itemInserts = items.map((item: any) => ({
                id: `sci-${uuidv4()}`,
                checklistId,
                category: item.category || 'General',
                text: item.text,
                status: item.status || 'PENDING',
                notes: item.notes || null,
                createdAt: now,
                updatedAt: now
            }));

            for (const item of itemInserts) {
                await db.run(
                    `INSERT INTO safety_checklist_items (id, checklistId, category, text, status, notes, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.id, item.checklistId, item.category, item.text, item.status, item.notes, item.createdAt, item.updatedAt]
                );
            }

            return res.status(201).json({ id: checklistId, items: itemInserts });
        } catch (error) {
            logger.error('Error in createSafetyChecklist:', error);
            next(error);
        }
    }

    /**
     * Update a safety checklist item status
     */
    async updateSafetyChecklistItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { itemId } = req.params;
            const { status, notes } = req.body;

            const now = new Date().toISOString();
            const updates: any = { updatedAt: now };
            let sql = 'UPDATE safety_checklist_items SET updatedAt = ?';
            const params: any[] = [now];

            if (status) {
                sql += ', status = ?';
                params.push(status);
                updates.status = status;
            }
            if (notes !== undefined) {
                sql += ', notes = ?';
                params.push(notes);
                updates.notes = notes;
            }

            sql += ' WHERE id = ?';
            params.push(itemId);

            const result = await db.run(sql, params);
            if (result.changes === 0) throw new AppError('Item not found', 404);

            return res.json({ success: true, itemId, ...updates });
        } catch (error) {
            logger.error('Error in updateSafetyChecklistItem:', error);
            next(error);
        }
    }

    /**
     * Submit/sign a safety checklist
     */
    async submitSafetyChecklist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { userId } = req.context;
            const db = req.tenantDb;
            if (!db) throw new AppError('Tenant connection failed', 500);

            const { checklistId } = req.params;
            const now = new Date().toISOString();

            const items = await db.all('SELECT status FROM safety_checklist_items WHERE checklistId = ?', [checklistId]);
            const total = items.length;
            const passed = items.filter((i: any) => i.status === 'PASS').length;
            const score = total > 0 ? (passed / total) * 100 : 0;

            const result = await db.run(
                `UPDATE safety_checklists 
                 SET status = 'Submitted', score = ?, signedBy = ?, signedAt = ?, updatedAt = ?
                 WHERE id = ?`,
                [score, userId, now, now, checklistId]
            );

            if (result.changes === 0) throw new AppError('Checklist not found', 404);

            return res.json({ success: true, checklistId, score: score.toFixed(1), signedAt: now });
        } catch (error) {
            logger.error('Error in submitSafetyChecklist:', error);
            next(error);
        }
    }
}

export const complianceController = new ComplianceController();
