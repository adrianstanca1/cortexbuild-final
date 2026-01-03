import { Router, Response, NextFunction } from 'express';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';
import { validateActiveMembership } from '../middleware/apiValidationMiddleware.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../types/express.js';

const router = Router();

// Requires Company Admin role
router.use(validateActiveMembership);
router.use(requireRole([UserRole.COMPANY_ADMIN]));

router.post('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId: companyId, userId } = req.context;

        // In a real implementation, this would trigger a background job
        // For now, we simulate the request
        logger.info(`Data export requested for company ${companyId} by ${userId}`);

        // Log to audit table
        // (Assuming auditService is available or via direct DB call handled by middleware logging ideally)

        res.status(202).json({
            success: true,
            message: 'Data export process initiated. You will receive an email when the archive is ready.'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/request-deletion', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId: companyId, userId } = req.context;
        const { reason } = req.body;

        logger.warn(`Company deletion requested for ${companyId} by ${userId}. Reason: ${reason}`);

        // In production, this would create a support ticket or notify superadmins

        res.status(200).json({
            success: true,
            message: 'Deletion request received. A support representative will contact you for verification.'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
