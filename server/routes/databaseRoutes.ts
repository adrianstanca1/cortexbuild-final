import { Router } from 'express';
import * as databaseController from '../controllers/databaseController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// All database routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

router.get('/health', databaseController.getDatabaseHealth);
router.post('/backup', databaseController.createDatabaseBackup);
router.get('/backups', databaseController.listBackups);
router.post('/cleanup', databaseController.cleanupDatabase);
router.get('/metrics/live', databaseController.getLiveMetrics);

export default router;
