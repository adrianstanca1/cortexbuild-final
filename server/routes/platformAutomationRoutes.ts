import { Router } from 'express';
import * as platformAutomationController from '../controllers/platformAutomationController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// All automation routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

router.get('/jobs', platformAutomationController.getAutomationJobs);
router.post('/jobs', platformAutomationController.createAutomationJob);
router.put('/jobs/:id', platformAutomationController.updateAutomationJob);
router.post('/jobs/:id/execute', platformAutomationController.executeAutomationJob);
router.delete('/jobs/:id', platformAutomationController.deleteAutomationJob);

export default router;
