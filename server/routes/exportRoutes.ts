import { Router } from 'express';
import * as exportController from '../controllers/exportController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// All export routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

// Excel exports
router.get('/users/excel', exportController.exportUsersExcel);
router.get('/companies/excel', exportController.exportCompaniesExcel);
router.get('/audit-logs/excel', exportController.exportAuditLogsExcel);
router.get('/support-tickets/excel', exportController.exportSupportTicketsExcel);
router.get('/system-events/excel', exportController.exportSystemEventsExcel);

// Comprehensive platform report (for PDF generation)
router.get('/platform-report', exportController.generatePlatformReport);

export default router;
