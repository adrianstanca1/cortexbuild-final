import express from 'express';
import { tenantService, getTenantUsage } from '../services/tenantService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = express.Router();

import { apiLimiter } from '../middleware/rateLimit.js';
router.use(apiLimiter as any);

// Get tenant usage/limits
router.get('/:id/usage', authenticateToken, requireRole([UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN]), async (req, res, next) => {
    try {
        const usage = await getTenantUsage(req.params.id);
        res.json(usage);
    } catch (error) {
        next(error);
    }
});

export default router;
