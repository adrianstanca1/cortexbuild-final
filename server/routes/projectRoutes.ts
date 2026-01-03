import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { protectTenantResource, validateActiveMembership, validateTenantLimits } from '../middleware/apiValidationMiddleware.js';

const router = Router();

// All project routes require active membership
router.use(validateActiveMembership);

// List projects (tenant-scoped)
router.get('/', requirePermission('projects', 'read'), projectController.getProjects);

// Get specific project (with resource ownership validation)
router.get('/:id',
    requirePermission('projects', 'read'),
    ...protectTenantResource('projects', 'id'),
    projectController.getProject
);

// Create project
router.post('/', requirePermission('projects', 'create'), validateTenantLimits('projects'), projectController.createProject);

// Update project (with resource ownership validation)
router.put('/:id',
    requirePermission('projects', 'update'),
    ...protectTenantResource('projects', 'id'),
    projectController.updateProject
);

// Delete project (with resource ownership validation)
router.delete('/:id',
    requirePermission('projects', 'delete'),
    ...protectTenantResource('projects', 'id'),
    projectController.deleteProject
);

export default router;
