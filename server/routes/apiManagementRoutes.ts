import { Router } from 'express';
import * as apiManagementController from '../controllers/apiManagementController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// All API management routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

// API Keys
router.get('/keys', apiManagementController.getAPIKeys);
router.post('/keys', apiManagementController.createAPIKey);
router.delete('/keys/:id', apiManagementController.deleteAPIKey);

// Webhooks
router.get('/webhooks', apiManagementController.getWebhooks);
router.post('/webhooks', apiManagementController.createWebhook);
router.put('/webhooks/:id', apiManagementController.updateWebhook);
router.delete('/webhooks/:id', apiManagementController.deleteWebhook);
router.post('/webhooks/:id/test', apiManagementController.testWebhook);

export default router;
