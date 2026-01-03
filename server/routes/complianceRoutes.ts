import { Router } from 'express';
import { complianceController } from '../controllers/complianceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

/**
 * Compliance Routes
 * All routes require SUPERADMIN or SUPPORT_ADMIN role
 */

// Get retention policy for a company
router.get(
    '/companies/:companyId/retention-policy',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN']),
    complianceController.getRetentionPolicy
);

// Update retention policy
router.patch(
    '/companies/:companyId/retention-policy',
    authenticateToken,
    requireRole(['SUPERADMIN']),
    complianceController.updateRetentionPolicy
);

// Export all company data (GDPR compliance)
router.get(
    '/companies/:companyId/data-export',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN']),
    complianceController.exportCompanyData
);

// Archive old audit logs
router.post(
    '/companies/:companyId/archive-logs',
    authenticateToken,
    requireRole(['SUPERADMIN']),
    complianceController.archiveAuditLogs
);

// Get compliance report
router.get(
    '/companies/:companyId/report',
    authenticateToken,
    requireRole(['SUPERADMIN', 'SUPPORT_ADMIN']),
    complianceController.getComplianceReport
);

// --- Safety Checklist Routes (Site Compliance) ---

// Get all safety checklists
router.get(
    '/safety-checklists',
    authenticateToken,
    complianceController.getSafetyChecklists
);

// Create a new safety checklist
router.post(
    '/safety-checklists',
    authenticateToken,
    complianceController.createSafetyChecklist
);

// Update a checklist item
router.patch(
    '/safety-checklist-items/:itemId',
    authenticateToken,
    complianceController.updateSafetyChecklistItem
);

// Submit/sign a checklist
router.post(
    '/safety-checklists/:checklistId/submit',
    authenticateToken,
    complianceController.submitSafetyChecklist
);

export default router;
