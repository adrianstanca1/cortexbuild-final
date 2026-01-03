import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';
import * as superadminCompanyController from '../controllers/superadminCompanyController.js';
import { requireSuperAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

// SUPERADMIN routes for company management
router.get('/all', requireSuperAdmin, superadminCompanyController.getAllCompanies);
router.get('/stats', requireSuperAdmin, superadminCompanyController.getCompanyStats);
router.post('/', requireSuperAdmin, superadminCompanyController.createCompany);
router.post('/:id/suspend', requireSuperAdmin, superadminCompanyController.suspendCompany);
router.post('/:id/activate', requireSuperAdmin, superadminCompanyController.activateCompany);
router.put('/:id/limits', requireSuperAdmin, superadminCompanyController.updateCompanyLimits);
router.put('/:id/features', requireSuperAdmin, superadminCompanyController.updateCompanyFeatures);
router.get('/:id/activity', requireSuperAdmin, superadminCompanyController.getCompanyActivity);

// Company member management routes (nested under /api/companies/:companyId)
router.put('/my-company', companyController.updateMyCompany);
router.get('/:companyId/details', companyController.getCompanyDetails);
router.post('/:companyId/admins', companyController.inviteCompanyAdmin);
router.get('/:companyId/members', companyController.getCompanyMembers);
router.put('/:companyId/members/:userId/role', companyController.updateMemberRole);
router.delete('/:companyId/members/:userId', companyController.removeMember);

export default router;