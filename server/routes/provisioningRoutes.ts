import { Router } from 'express';
import { provisioningController } from '../controllers/provisioningController.js';
import { requireSuperAdmin } from '../middleware/rbacMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Provisioning Routes
 * All routes require SUPERADMIN role
 */

// Create new company with owner
router.post(
    '/companies',
    authenticateToken,
    requireSuperAdmin,
    provisioningController.createCompany
);

// Activate a company
router.post(
    '/companies/:id/activate',
    authenticateToken,
    requireSuperAdmin,
    provisioningController.activateCompany
);

export default router;
