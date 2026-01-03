import { Router } from 'express';
import * as storageController from '../controllers/storageController.js';
import { uploadSingleToCompany, uploadMultipleToCompany, handleCompanyUpload } from '../middleware/companyUploadMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';
import { validateActiveMembership } from '../middleware/apiValidationMiddleware.js';
import { protectFileStorage, auditFileOperation } from '../middleware/storageIsolationMiddleware.js';

const router = Router();

// Company user routes (authenticated via tenant context)
// Require active membership for all tenant operations
router.use('/usage', validateActiveMembership);
router.use('/files', validateActiveMembership);
router.use('/upload', validateActiveMembership);

router.get('/usage', storageController.getStorageUsage);
router.get('/files', storageController.listCompanyFiles);

// File upload endpoints with storage isolation and auditing
router.post('/upload/single',
    ...protectFileStorage,
    auditFileOperation('UPLOAD'),
    ...uploadSingleToCompany('file'),
    handleCompanyUpload
);

router.post('/upload/multiple',
    ...protectFileStorage,
    auditFileOperation('UPLOAD'),
    ...uploadMultipleToCompany('files', 10),
    handleCompanyUpload
);

// SuperAdmin routes
router.get('/company/:companyId/stats', requireRole([UserRole.SUPERADMIN]), storageController.getCompanyStorage);
router.put('/company/:companyId/quota', requireRole([UserRole.SUPERADMIN]), storageController.updateStorageQuota);

export default router;
