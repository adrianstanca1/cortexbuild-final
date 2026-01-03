import { Router } from 'express';
import { impersonationController } from '../controllers/impersonationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/start', authenticateToken, (req, res, next) => impersonationController.startSession(req, res, next));
router.post('/stop', authenticateToken, (req, res, next) => impersonationController.stopSession(req, res, next));
router.get('/active', authenticateToken, (req, res, next) => impersonationController.getActiveSession(req, res, next));

export default router;
