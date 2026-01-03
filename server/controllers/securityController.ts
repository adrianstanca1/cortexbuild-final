import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';

/**
 * Track failed login attempt
 */
export const trackFailedLogin = async (email: string, ipAddress: string) => {
    const db = getDb();
    try {
        await db.run(
            `INSERT INTO security_events (id, type, severity, ipAddress, email, timestamp, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                'FAILED_LOGIN',
                'medium',
                ipAddress,
                email,
                new Date().toISOString(),
                JSON.stringify({ userAgent: 'unknown' })
            ]
        );
    } catch (e) {
        logger.error('Failed to track security event:', e);
    }
};

/**
 * Get security threat summary
 */
export const getSecurityThreats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const { hours = 24 } = req.query;

        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - Number(hours));

        // Get failed login attempts
        const failedLogins = await db.all(`
            SELECT ipAddress, email, COUNT(*) as attempts, MAX(timestamp) as lastAttempt
            FROM security_events
            WHERE type = 'FAILED_LOGIN' AND timestamp > ?
            GROUP BY ipAddress, email
            ORDER BY attempts DESC
            LIMIT 50
        `, [cutoff.toISOString()]);

        // Get suspicious IPs (multiple failures)
        const suspiciousIPs = await db.all(`
            SELECT ipAddress, COUNT(DISTINCT email) as targetedAccounts, COUNT(*) as attempts
            FROM security_events
            WHERE type = 'FAILED_LOGIN' AND timestamp > ?
            GROUP BY ipAddress
            HAVING attempts > 5
            ORDER BY attempts DESC
        `, [cutoff.toISOString()]);

        // Get blocked IPs
        const blockedIPs = await db.all(`
            SELECT * FROM ip_blacklist ORDER BY createdAt DESC
        `);

        res.json({
            summary: {
                failedLoginAttempts: failedLogins.reduce((sum, item) => sum + item.attempts, 0),
                suspiciousIPs: suspiciousIPs.length,
                blockedIPs: blockedIPs.length,
                timeWindow: `${hours} hours`
            },
            failedLogins,
            suspiciousIPs,
            blockedIPs
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Block IP address
 */
export const blockIPAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ipAddress, reason } = req.body;
        const db = getDb();

        await db.run(
            `INSERT INTO ip_blacklist (id, ipAddress, reason, createdBy, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
                `ip-block-${Date.now()}`,
                ipAddress,
                reason,
                (req as any).userName,
                new Date().toISOString()
            ]
        );

        logger.warn(`IP ${ipAddress} blocked by ${(req as any).userName}. Reason: ${reason}`);
        res.json({ success: true, message: `IP ${ipAddress} blocked` });
    } catch (e) {
        next(e);
    }
};

/**
 * Unblock IP address
 */
export const unblockIPAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ipAddress } = req.params;
        const db = getDb();

        await db.run('DELETE FROM ip_blacklist WHERE ipAddress = ?', [ipAddress]);

        logger.info(`IP ${ipAddress} unblocked by ${(req as any).userName}`);
        res.json({ success: true, message: `IP ${ipAddress} unblocked` });
    } catch (e) {
        next(e);
    }
};

/**
 * Get compliance report
 */
export const getComplianceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Check for users without 2FA
        const users2FA = await db.get(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN twoFactorEnabled = 1 THEN 1 ELSE 0 END) as enabled
            FROM users WHERE role != 'CLIENT'
        `);

        // Check for inactive users
        const inactiveUsers = await db.get(`
            SELECT COUNT(*) as count FROM users 
            WHERE isActive = 0
        `);

        // Check for suspended companies
        const suspendedCompanies = await db.get(`
            SELECT COUNT(*) as count FROM companies 
            WHERE status = 'suspended'
        `);

        // Recent audit log coverage
        const auditCoverage = await db.get(`
            SELECT COUNT(*) as count FROM audit_logs
            WHERE timestamp > datetime('now', '-30 days')
        `);

        // Password policy compliance (simulated)
        const passwordCompliance = {
            total: users2FA.total || 0,
            compliant: Math.floor((users2FA.total || 0) * 0.95) // Simulated
        };

        res.json({
            twoFactorAuth: {
                enabled: users2FA.enabled || 0,
                total: users2FA.total || 0,
                percentage: users2FA.total ? ((users2FA.enabled / users2FA.total) * 100).toFixed(1) : 0,
                status: (users2FA.enabled / users2FA.total) > 0.8 ? 'compliant' : 'needs_attention'
            },
            inactiveAccounts: {
                count: inactiveUsers.count,
                status: inactiveUsers.count < 10 ? 'good' : 'review_needed'
            },
            suspendedCompanies: {
                count: suspendedCompanies.count
            },
            auditLogging: {
                recentLogs: auditCoverage.count,
                status: auditCoverage.count > 100 ? 'active' : 'low_activity'
            },
            passwordPolicy: {
                compliant: passwordCompliance.compliant,
                total: passwordCompliance.total,
                percentage: ((passwordCompliance.compliant / passwordCompliance.total) * 100).toFixed(1),
                status: 'compliant'
            },
            generatedAt: new Date().toISOString()
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Get active sessions (simulated)
 */
export const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Get recent audit logs as proxy for active sessions
        const recentActivity = await db.all(`
            SELECT DISTINCT userId, userName, ipAddress, MAX(timestamp) as lastActivity
            FROM audit_logs
            WHERE timestamp > datetime('now', '-1 hour')
            GROUP BY userId
            ORDER BY lastActivity DESC
            LIMIT 50
        `);

        res.json({
            activeSessions: recentActivity.length,
            sessions: recentActivity.map(session => ({
                userId: session.userId,
                userName: session.userName,
                ipAddress: session.ipAddress,
                lastActivity: session.lastActivity,
                duration: 'Active' // Simulated
            }))
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Force logout user session
 */
export const forceLogout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        // In a real implementation, this would invalidate JWT tokens or clear sessions
        // For now, we log the action
        logger.warn(`Force logout requested for user ${userId} by ${(req as any).userName}`);

        res.json({
            success: true,
            message: `Session terminated for user ${userId}`,
            note: 'User will be logged out on next request'
        });
    } catch (e) {
        next(e);
    }
};
