import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { authService } from '../services/authService.js';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export class ImpersonationController {
    /**
     * Start an impersonation session
     * POST /api/impersonation/start
     */
    async startSession(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, reason } = req.body;
            const adminId = (req as any).userId;

            if (!userId) throw new AppError('Target userId is required', 400);

            // Use AuthService for the core logic
            const session = await authService.impersonateUser(adminId, userId, reason);

            // Audit logging is handled within authService or could be enhanced here if needed
            // For now, we rely on authService logging

            res.json({
                message: 'Impersonation session started',
                token: session.token,
                user: {
                    id: session.id,
                    email: session.email,
                    name: session.name,
                    role: session.role
                }
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Stop an impersonation session
     * POST /api/impersonation/stop
     */
    async stopSession(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token || !token.startsWith('imp_v1:')) {
                throw new AppError('No active impersonation session found', 400);
            }

            const db = getDb();
            const now = new Date().toISOString();

            // Mark session as completed
            await db.run(
                `UPDATE impersonation_sessions 
                 SET status = 'completed', completedAt = ? 
                 WHERE token = ? AND status = 'active'`,
                [now, token]
            );

            // Audit Log
            const parts = token.split(':');
            const userId = parts[1];
            const adminId = (req as any).userId;
            const companyId = (req as any).tenantId || 'c1';

            await db.run(
                `INSERT INTO audit_logs (id, userId, companyId, action, status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [uuidv4(), adminId || 'admin', companyId, 'STOP_IMPERSONATION', 'success', now]
            ).catch(e => logger.error('Failed to log impersonation stop', e));

            res.json({ message: 'Impersonation session ended' });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Get active session info
     * GET /api/impersonation/active
     */
    async getActiveSession(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token || !token.startsWith('imp_v1:')) {
                return res.json({ active: false });
            }

            const db = getDb();
            const session = await db.get(
                `SELECT s.*, u.name as adminName, target.name as targetName
                 FROM impersonation_sessions s
                 JOIN users u ON s.adminId = u.id
                 JOIN users target ON s.targetUserId = target.id
                 WHERE s.token = ? AND s.status = 'active'`,
                [token]
            );

            if (!session) {
                return res.json({ active: false });
            }

            res.json({
                active: true,
                session: {
                    id: session.id,
                    adminName: session.adminName,
                    targetName: session.targetName,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt
                }
            });
        } catch (e) {
            next(e);
        }
    }
}

export const impersonationController = new ImpersonationController();
