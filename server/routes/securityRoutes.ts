import { Router } from 'express';
import * as securityController from '../controllers/securityController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// All security routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

router.get('/threats', securityController.getSecurityThreats);
router.post('/ip-block', securityController.blockIPAddress);
router.delete('/ip-block/:ipAddress', securityController.unblockIPAddress);
router.get('/compliance-report', securityController.getComplianceReport);
router.get('/active-sessions', securityController.getActiveSessions);
router.post('/force-logout/:userId', securityController.forceLogout);

export default router;
