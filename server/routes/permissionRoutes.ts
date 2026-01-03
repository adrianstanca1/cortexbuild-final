import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';
import { permissionService } from '../services/permissionService.js';
import { logger } from '../utils/logger.js';
import * as rbacController from '../controllers/rbacController.js';
import crypto from 'crypto';

const router = Router();

/**
 * Get all available permissions
 * GET /api/permissions
 */
router.get('/', authenticateToken, rbacController.getPermissions);

/**
 * Grant optional permission to a user
 * POST /api/permissions/grant
 */
router.post(
    '/grant',
    authenticateToken,
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            const { userId, companyId, permission, expiresAt, constraints } = req.body;
            const grantedBy = (req as any).context.userId;

            if (!userId || !companyId || !permission) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const result = await permissionService.grantOptionalPermission(
                userId,
                companyId,
                permission,
                grantedBy,
                expiresAt ? new Date(expiresAt) : undefined,
                constraints
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            logger.error('Grant permission error:', error);
            res.status(500).json({ error: error.message || 'Failed to grant permission' });
        }
    }
);

/**
 * Revoke optional permission
 * DELETE /api/permissions/:permissionId
 */
router.delete(
    '/:permissionId',
    authenticateToken,
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            const { permissionId } = req.params;
            const revokedBy = (req as any).context.userId;

            await permissionService.revokeOptionalPermission(permissionId, revokedBy);

            res.json({
                success: true,
                message: 'Permission revoked successfully'
            });
        } catch (error: any) {
            logger.error('Revoke permission error:', error);
            res.status(500).json({ error: error.message || 'Failed to revoke permission' });
        }
    }
);

/**
 * Get user's optional permissions
 * GET /api/permissions/user/:userId/company/:companyId
 */
router.get(
    '/user/:userId/company/:companyId',
    authenticateToken,
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            const { userId, companyId } = req.params;

            const permissions = await permissionService.getUserOptionalPermissions(userId, companyId);

            res.json({
                success: true,
                data: permissions
            });
        } catch (error: any) {
            logger.error('Get permissions error:', error);
            res.status(500).json({ error: error.message || 'Failed to get permissions' });
        }
    }
);

/**
 * Request break-glass access
 * POST /api/permissions/break-glass
 */
router.post(
    '/break-glass',
    authenticateToken,
    requireRole([UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            const { targetCompanyId, justification, durationMinutes } = req.body;
            const adminId = (req as any).context.userId;

            if (!targetCompanyId || !justification) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const access = await permissionService.requestBreakGlassAccess(
                adminId,
                targetCompanyId,
                justification,
                durationMinutes || 60
            );

            res.json({
                success: true,
                data: access,
                message: 'Break-glass access granted'
            });
        } catch (error: any) {
            logger.error('Break-glass request error:', error);
            res.status(500).json({ error: error.message || 'Failed to request break-glass access' });
        }
    }
);

/**
 * Revoke break-glass access
 * DELETE /api/permissions/break-glass/:accessId
 */
router.delete(
    '/break-glass/:accessId',
    authenticateToken,
    requireRole([UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            const { accessId } = req.params;
            const revokedBy = (req as any).context.userId;

            await permissionService.revokeBreakGlassAccess(accessId, revokedBy);

            res.json({
                success: true,
                message: 'Break-glass access revoked'
            });
        } catch (error: any) {
            logger.error('Revoke break-glass error:', error);
            res.status(500).json({ error: error.message || 'Failed to revoke break-glass access' });
        }
    }
);

/**
 * Cleanup expired permissions (cron job endpoint)
 * POST /api/permissions/cleanup
 */
router.post(
    '/cleanup',
    authenticateToken,
    requireRole([UserRole.SUPERADMIN]),
    async (req, res) => {
        try {
            await permissionService.cleanupExpiredPermissions();

            res.json({
                success: true,
                message: 'Expired permissions cleaned up'
            });
        } catch (error: any) {
            logger.error('Cleanup error:', error);
            res.status(500).json({ error: error.message || 'Failed to cleanup permissions' });
        }
    }
);

export default router;
