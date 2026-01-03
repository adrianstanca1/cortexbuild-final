import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, dashboardController.getUserDashboards);
router.post('/', authenticateToken, dashboardController.createDashboard);
router.get('/:dashboardId/widgets', authenticateToken, dashboardController.getDashboardWidgets);
router.post('/:dashboardId/widgets', authenticateToken, dashboardController.addWidget);
router.put('/widgets/:id', authenticateToken, dashboardController.updateWidget);
router.delete('/widgets/:id', authenticateToken, dashboardController.deleteWidget);

export default router;
