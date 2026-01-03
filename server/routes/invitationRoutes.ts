/**
 * Invitation Routes
 * API endpoints for invitation management
 */

import { Router } from 'express';
import * as invitationController from '../controllers/invitationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// Public routes (no auth required)
router.get('/validate/:token', invitationController.validateInvitation);
router.post('/accept', invitationController.acceptInvitation);

// Protected routes (auth required)
router.use(authenticateToken);

// Create invitation (Company Admin only)
router.post(
    '/',
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    invitationController.createInvitation
);

// Get company invitations
router.get('/company/:companyId', invitationController.getCompanyInvitations);

// Resend invitation
router.post(
    '/:id/resend',
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    invitationController.resendInvitation
);

// Cancel invitation
router.delete(
    '/:id',
    requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN]),
    invitationController.cancelInvitation
);

// Cleanup expired invitations (SuperAdmin or system cron)
router.post(
    '/cleanup/expired',
    requireRole([UserRole.SUPERADMIN]),
    invitationController.cleanupExpiredInvitations
);

export default router;
