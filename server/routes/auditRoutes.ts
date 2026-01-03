import express from 'express';
import { auditController } from '../controllers/auditController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/audit/companies/:companyId/timeline
 * @desc Get timeline of events for a company
 * @access SUPERADMIN, SUPPORT_ADMIN
 */
router.get(
    '/companies/:companyId/timeline',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN', 'COMPANY_ADMIN']),
    auditController.getCompanyTimeline
);

/**
 * @route GET /api/audit/companies/:companyId/stats
 * @desc Get audit statistics for a company
 * @access SUPERADMIN, SUPPORT_ADMIN
 */
router.get(
    '/companies/:companyId/stats',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN', 'COMPANY_ADMIN']),
    auditController.getAuditStats
);

/**
 * @route GET /api/audit/companies/:companyId/export
 * @desc Export audit logs for a company
 * @access SUPERADMIN
 */
router.get(
    '/companies/:companyId/export',
    authenticateToken,
    requireRole(['SUPERADMIN']),
    auditController.exportAuditLogs
);

/**
 * @route GET /api/audit/users/:userId
 * @desc Get audit logs for a specific user
 * @access SUPERADMIN, SUPPORT_ADMIN
 */
router.get(
    '/users/:userId',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN']),
    auditController.getUserAuditLogs
);

export default router;
