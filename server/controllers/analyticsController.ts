import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { analyticsBucket } from '../buckets/AnalyticsBucket.js';
import { AppError } from '../utils/AppError.js';
// Removed getDb from imports as we switch to req.tenantDb for data
import { getDb } from '../database.js';

/**
 * Analytics Controller
 * Handles metrics and analytics queries with tenant isolation
 */

/**
 * Record a metric
 */
export const recordMetric = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { metricName, value, dimensions } = req.body;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        if (!metricName || value === undefined) {
            throw new AppError('metricName and value are required', 400);
        }

        await analyticsBucket.recordMetric(tenantId, metricName, value, dimensions);

        res.json({ success: true, message: 'Metric recorded' });
    } catch (error) {
        next(error);
    }
};

/**
 * Query metrics
 */
export const queryMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { metricName, startDate, endDate, groupBy } = req.query;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        if (!metricName || !startDate || !endDate) {
            throw new AppError('metricName, startDate, and endDate are required', 400);
        }

        const metrics = await analyticsBucket.queryMetrics(
            tenantId,
            metricName as string,
            {
                startDate: startDate as string,
                endDate: endDate as string,
                groupBy: groupBy as 'hour' | 'day' | 'week' | 'month',
            }
        );

        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
};

/**
 * Get metric statistics
 */
export const getStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { metricName, startDate, endDate } = req.query;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        if (!metricName || !startDate || !endDate) {
            throw new AppError('metricName, startDate, and endDate are required', 400);
        }

        const stats = await analyticsBucket.getStatistics(
            tenantId,
            metricName as string,
            {
                startDate: startDate as string,
                endDate: endDate as string,
            }
        );

        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard metrics
 */
export const getFinancialTrends = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const options = {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: now.toISOString(),
            groupBy: 'day' as const,
        };

        // Get aggregated metrics for dashboard
        const metrics = await analyticsBucket.getAggregatedMetrics(
            tenantId,
            ['user_activity', 'project_created', 'task_completed', 'api_call'],
            options
        );

        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Executive KPIs
 */
export const getExecutiveKPIs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        // Use Tenant DB
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        // 1. Active Projects Count
        // Now targeting Tenant DB. companyId check is redundant if DB is isolated but harmless.
        const projectResult = await db.get(`
            SELECT COUNT(*) as count 
            FROM projects 
            WHERE status != 'archived'
        `);

        // 2. Budget Health
        const budgetResult = await db.get(`
            SELECT 
                SUM(budget) as totalBudget, 
                SUM(spent) as totalSpent 
            FROM projects 
        `);

        const totalBudget = budgetResult?.totalBudget || 0;
        const totalSpent = budgetResult?.totalSpent || 0;
        const variance = totalBudget - totalSpent;
        const percentageUsed = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";

        // 3. Safety Score (Aggregate from safety_incidents & hazards via Tenant DB)
        // High severity incidents reduce score. Base 100.
        const safetyResult = await db.get(`
            SELECT 
                COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical,
                COUNT(CASE WHEN severity = 'High' THEN 1 END) as high,
                COUNT(CASE WHEN severity = 'Medium' THEN 1 END) as medium
            FROM safety_incidents 
            WHERE status != 'Resolved'
        `);

        let safetyScore = 100;
        if (safetyResult) {
            safetyScore -= (safetyResult.critical * 20);
            safetyScore -= (safetyResult.high * 10);
            safetyScore -= (safetyResult.medium * 5);
            safetyScore = Math.max(0, safetyScore);
        }

        // 4. Team Velocity (Completed tasks in last 30 days)
        const dbType = db.getType();
        const dateCondition = dbType === 'mysql'
            ? "updatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            : dbType === 'postgres'
                ? "updatedAt >= NOW() - INTERVAL '30 days'"
                : "updatedAt >= date('now', '-30 days')";

        const taskResult = await db.get(`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE status = 'completed' 
            AND ${dateCondition}
        `);

        // 5. Open RFIs
        const rfiResult = await db.get(`
            SELECT COUNT(*) as count 
            FROM rfis 
            WHERE status = 'open'
        `);

        res.json({
            success: true,
            data: {
                activeProjects: projectResult?.count || 0,
                budgetHealth: {
                    totalBudget,
                    totalSpent,
                    variance,
                    percentageUsed: percentageUsed + "%"
                },
                safetyScore,
                teamVelocity: taskResult?.count || 0,
                openRFIs: rfiResult?.count || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Project Progress
 */
export const getProjectProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        const results = await db.all(`
            SELECT name, progress, status 
            FROM projects 
            ORDER BY progress DESC 
            LIMIT 5
        `);

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Cost Variance Trend
 */
export const getCostVarianceTrend = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        // Group transactions by category/type to show spending trends
        const results = await db.all(`
            SELECT category as name, SUM(amount) as value
            FROM transactions 
            GROUP BY category
            ORDER BY value DESC
        `);

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Resource Utilization
 */
export const getResourceUtilization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        // Count tasks per person to show load
        const results = await db.all(`
            SELECT assignedTo as name, COUNT(*) as value
            FROM tasks 
            WHERE status != 'completed'
            AND assignedTo IS NOT NULL
            GROUP BY assignedTo
            ORDER BY value DESC
        `);

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Safety Metrics
 */
export const getSafetyMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        const results = await db.all(`
            SELECT type as name, COUNT(*) as value
            FROM safety_incidents 
            GROUP BY type
            ORDER BY value DESC
        `);

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Project Health
 */
export const getProjectHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        const project = await db.get(`SELECT * FROM projects WHERE id = ?`, [projectId]);

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Simple health score logic
        let score = 100;

        // Budget penalty
        if (project.spent > project.budget) score -= 20;

        // Safety penalty
        const incidents = await db.get(`SELECT COUNT(*) as count FROM safety_incidents WHERE projectId = ? AND status != 'Resolved'`, [projectId]);
        if (incidents?.count > 0) score -= (incidents.count * 5);

        score = Math.max(0, score);
        let status = 'Healthy';
        if (score < 50) status = 'At Risk';
        else if (score < 80) status = 'Warning';

        res.json({ success: true, data: { status, score } });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate a custom report
 */
export const getCustomReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const config = req.query as any;
        // Use Tenant DB or fallback to Platform DB
        const db = req.tenantDb || getDb();
        if (!db) throw new AppError('Tenant connection failed', 500);

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        const { metrics } = config;
        const reportData: any[] = [];
        const dateRange = config.dateRange || 'all_time';

        // Date filter creation
        let dateFilter = "";
        const dateParams: any[] = [];

        if (dateRange === 'this_month') {
            dateFilter = "AND createdAt >= date('now', 'start of month')";
        } else if (dateRange === 'last_30_days') {
            dateFilter = "AND createdAt >= date('now', '-30 days')";
        }

        // Fetch data based on requested metrics
        if (metrics && Array.isArray(metrics)) {
            for (const metric of metrics) {
                let value = "0";

                if (metric === 'Total Budget') {
                    const row = await db.get(`SELECT SUM(budget) as val FROM projects WHERE status != 'archived'`);
                    value = `$${(row?.val || 0).toLocaleString()}`;

                } else if (metric === 'Total Spent') {
                    const row = await db.get(`SELECT SUM(spent) as val FROM projects WHERE status != 'archived'`);
                    value = `$${(row?.val || 0).toLocaleString()}`;

                } else if (metric === 'Safety Score') {
                    // Re-use logic from Executive KPIs for consistency
                    const safetyResult = await db.get(`
                        SELECT 
                            COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical,
                            COUNT(CASE WHEN severity = 'High' THEN 1 END) as high,
                            COUNT(CASE WHEN severity = 'Medium' THEN 1 END) as medium
                        FROM safety_incidents 
                        WHERE status != 'Resolved'
                    `);
                    let safetyScore = 100;
                    if (safetyResult) {
                        safetyScore -= (safetyResult.critical * 20);
                        safetyScore -= (safetyResult.high * 10);
                        safetyScore -= (safetyResult.medium * 5);
                        safetyScore = Math.max(0, safetyScore);
                    }
                    value = `${safetyScore}/100`;

                } else if (metric === 'Tasks Completed') {
                    // Apply date filter if relevant (using updatedAt for completion time approximation)
                    let sql = `SELECT COUNT(*) as val FROM tasks WHERE status = 'completed'`;
                    const dbType = db.getType();
                    const nowFunc = dbType === 'mysql' ? 'NOW()' : dbType === 'postgres' ? 'NOW()' : "date('now')";
                    const intervalFunc = (days: number) => {
                        if (dbType === 'mysql') return `DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
                        if (dbType === 'postgres') return `NOW() - INTERVAL '${days} days'`;
                        return `date('now', '-${days} days')`;
                    };

                    if (dateRange === 'this_month') {
                        if (dbType === 'mysql') sql += " AND updatedAt >= DATE_FORMAT(NOW(), '%Y-%m-01')";
                        else if (dbType === 'postgres') sql += " AND updatedAt >= date_trunc('month', CURRENT_DATE)";
                        else sql += " AND updatedAt >= date('now', 'start of month')";
                    }
                    if (dateRange === 'last_30_days') sql += ` AND updatedAt >= ${intervalFunc(30)}`;

                    const row = await db.get(sql);
                    value = (row?.val || 0).toString();

                } else if (metric === 'Active Projects') {
                    const row = await db.get(`SELECT COUNT(*) as val FROM projects WHERE status = 'active'`);
                    value = (row?.val || 0).toString();

                } else if (metric === 'Open RFIs') {
                    const row = await db.get(`SELECT COUNT(*) as val FROM rfis WHERE status = 'open'`);
                    value = (row?.val || 0).toString();

                } else if (metric === 'Pending Daily Logs') {
                    const row = await db.get(`SELECT COUNT(*) as val FROM daily_logs WHERE status = 'pending'`);
                    value = (row?.val || 0).toString();

                } else {
                    // Fallback for unknown metrics to avoid random numbers
                    value = "N/A";
                }

                reportData.push({ label: metric, value });
            }
        }

        res.json({
            title: config.name || 'Custom Report',
            generatedAt: new Date().toISOString(),
            data: reportData,
            config: { type: config.type, dateRange: config.dateRange }
        });
    } catch (error) {
        next(error);
    }
};
