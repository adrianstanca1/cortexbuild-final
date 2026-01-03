/**
 * Platform Statistics Controller
 * Provides real-time metrics and analytics for SuperAdmin dashboard
 */

import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';

/**
 * Get comprehensive platform statistics
 */
export const getPlatformStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Get company stats
        const companies = await db.all('SELECT status FROM companies');
        const totalCompanies = companies.length;
        const activeCompanies = companies.filter((c: any) =>
            c.status?.toLowerCase() === 'active'
        ).length;

        // Get user stats
        const users = await db.all('SELECT status FROM users');
        const totalUsers = users.length;
        const activeUsers = users.filter((u: any) =>
            u.status?.toLowerCase() === 'active'
        ).length;

        // Get project stats
        const projectsResult = await db.get('SELECT COUNT(*) as count FROM projects');
        const totalProjects = projectsResult?.count || 0;

        // Get storage stats
        // Size is stored as TEXT, so we cast to integer for summation. 
        // Handles both SQLite and MySQL implicit casting usually, but explicit CAST is safer.
        const storageResult = await db.get('SELECT SUM(CAST(size AS INTEGER)) as totalBytes FROM documents');
        const storageUsed = storageResult?.totalBytes || 0;

        // Real API metrics from audit logs (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const apiRequestsResult = await db.get('SELECT COUNT(*) as count FROM audit_logs WHERE createdAt > ?', [oneDayAgo]);
        const apiRequests = apiRequestsResult?.count || 0;

        // Error rate from failed actions in audit logs
        const errorActionsResult = await db.get(`
            SELECT COUNT(*) as count FROM audit_logs 
            WHERE (action LIKE '%ERROR%' OR action LIKE '%FAILED%') AND createdAt > ?
        `, [oneDayAgo]);
        const errorCount = errorActionsResult?.count || 0;
        const errorRate = apiRequests > 0 ? (errorCount / apiRequests) * 100 : 0;

        res.json({
            totalCompanies,
            activeCompanies,
            totalUsers,
            activeUsers,
            totalProjects,
            storageUsed,
            apiRequests,
            errorRate: parseFloat(errorRate.toFixed(2))
        });
    } catch (error) {
        logger.error('Error fetching platform stats:', error);
        next(error);
    }
};

/**
 * Get system health metrics
 */
export const getSystemHealthMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Check database connectivity
        const dbHealthy = await db.get('SELECT 1 as health')
            .then(() => true)
            .catch(() => false);

        // Get system uptime
        const uptime = process.uptime();

        // Memory usage
        const memUsage = process.memoryUsage();
        const memoryUsed = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

        res.json({
            status: 'healthy',
            api: dbHealthy ? 'healthy' : 'degraded',
            database: dbHealthy ? 'healthy' : 'error',
            uptime,
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                percentage: memoryUsed
            },
            cpu: {
                usage: Math.random() * 40 + 10 // Mock CPU usage
            }
        });
    } catch (error) {
        logger.error('Error fetching system health:', error);
        res.status(200).json({
            status: 'degraded',
            api: 'error',
            database: 'error',
            uptime: process.uptime()
        });
    }
};

/**
 * Get performance history (24h)
 */
export const getPerformanceHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Generate mock performance data
        // In production, this should come from a metrics/monitoring service
        const history = Array.from({ length: 24 }, (_, i) => ({
            timestamp: Date.now() - (23 - i) * 3600000,
            cpu: Math.random() * 60 + 20,
            ram: Math.random() * 50 + 30,
            requests: Math.floor(Math.random() * 1000) + 500
        }));

        res.json(history);
    } catch (error) {
        logger.error('Error fetching performance history:', error);
        next(error);
    }
};

/**
 * Get platform alerts
 */
export const getPlatformAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Fetch recent audit logs with high severity or errors
        const alerts = await db.all(`
      SELECT 
        id,
        action as message,
        createdAt as timestamp,
        'medium' as severity
      FROM audit_logs
      WHERE action LIKE '%ERROR%' OR action LIKE '%FAILED%'
      ORDER BY createdAt DESC
      LIMIT 10
    `);

        res.json(alerts);
    } catch (error) {
        logger.error('Error fetching platform alerts:', error);
        res.json([]);
    }
};

/**
 * Get security statistics
 */
export const getSecurityStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Count failed login attempts in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const failedLoginsResult = await db.get(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
      AND createdAt > ?
    `, [oneDayAgo]);

        const failedLogins24h = failedLoginsResult?.count || 0;

        // Active sessions (mock - should come from session store)
        const activeSessions = Math.floor(Math.random() * 50) + 20;

        // Calculate security score
        const securityScore = Math.max(100 - (failedLogins24h * 2), 70);

        res.json({
            securityScore,
            activeSessions,
            failedLogins24h,
            unusualLogins: Math.floor(failedLogins24h * 0.3)
        });
    } catch (error) {
        logger.error('Error fetching security stats:', error);
        res.json({
            securityScore: 85,
            activeSessions: 0,
            failedLogins24h: 0,
            unusualLogins: 0
        });
    }
};

/**
 * Get global activity feed
 */
export const getGlobalActivityFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const limit = parseInt(req.query.limit as string) || 50;

        const activities = await db.all(`
      SELECT 
        a.id,
        a.action,
        a.resource,
        a.createdAt,
        u.name as userName,
        u.email as userEmail,
        c.name as companyName
      FROM audit_logs a
      LEFT JOIN users u ON a.userId = u.id
      LEFT JOIN companies c ON a.companyId = c.id
      ORDER BY a.createdAt DESC
      LIMIT ?
    `, [limit]);

        res.json(activities);
    } catch (error) {
        logger.error('Error fetching activity feed:', error);
        next(error);
    }
};

/**
 * Get company activity
 */
export const getCompanyActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const activities = await db.all(`
      SELECT 
        a.id,
        a.action,
        a.resource,  
        a.createdAt,
        u.name as userName,
        u.email as userEmail
      FROM audit_logs a
      LEFT JOIN users u ON a.userId = u.id
      WHERE a.companyId = ?
      ORDER BY a.createdAt DESC
      LIMIT 100
    `, [id]);

        res.json(activities);
    } catch (error) {
        logger.error('Error fetching company activity:', error);
        next(error);
    }
};
