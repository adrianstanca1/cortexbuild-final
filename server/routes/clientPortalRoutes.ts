import { Router } from 'express';
import * as clientPortalController from '../controllers/clientPortalController.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { protectTenantResource, validateActiveMembership } from '../middleware/apiValidationMiddleware.js';
import { requireModule } from '../middleware/moduleMiddleware.js';
import { CompanyModule } from '../types/modules.js';

const router = Router();

/**
 * Authenticated Routes - Require Project Manager or higher + CLIENT_PORTAL module
 */

// Generate share link for a project
router.post(
    '/:projectId/share',
    validateActiveMembership,
    requireModule(CompanyModule.CLIENT_PORTAL),
    requirePermission('projects', 'update'),
    ...protectTenantResource('projects', 'projectId'),
    clientPortalController.generateShareLink
);

// Get all share links for a project
router.get(
    '/:projectId/shares',
    validateActiveMembership,
    requireModule(CompanyModule.CLIENT_PORTAL),
    requirePermission('projects', 'read'),
    ...protectTenantResource('projects', 'projectId'),
    clientPortalController.getProjectShareLinks
);

// Revoke a share link
// Note: linkId is not a tenant resource directly mapped in params, so we rely on controller validation
// or we could look up the link first. For now, rely on permission check + active membership.
router.delete(
    '/shares/:linkId',
    validateActiveMembership,
    requirePermission('projects', 'update'),
    clientPortalController.revokeShareLink
);

/**
 * Public Routes - No authentication required (token-based validation)
 */

// Validate share token (with optional password)
router.post(
    '/shared/:token/validate',
    clientPortalController.validateShareToken,
    (req, res) => res.json({ success: true, message: 'Token validated' })
);

// Get shared project details
router.get(
    '/shared/:token',
    clientPortalController.validateShareToken,
    clientPortalController.getSharedProject
);

// Get shared project documents
router.get(
    '/shared/:token/documents',
    clientPortalController.validateShareToken,
    clientPortalController.getSharedDocuments
);

// Get shared project photos
router.get(
    '/shared/:token/photos',
    clientPortalController.validateShareToken,
    clientPortalController.getSharedPhotos
);

export default router;
