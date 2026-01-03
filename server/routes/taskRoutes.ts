import { Router } from 'express';
import * as taskController from '../controllers/taskController.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { protectTenantResource, validateActiveMembership, validateRequestBody } from '../middleware/apiValidationMiddleware.js';

const router = Router();

// All task routes require active membership
router.use(validateActiveMembership);


// Critical Path Analysis
router.get('/analysis/critical-path',
    requirePermission('tasks', 'read'),
    taskController.getCriticalPath
);

// List tasks (tenant-scoped)
router.get('/', requirePermission('tasks', 'read'), taskController.getTasks);

// Get specific task (with resource ownership validation)
router.get('/:id',
    requirePermission('tasks', 'read'),
    ...protectTenantResource('tasks', 'id'),
    taskController.getTask
);

// Create task (with body validation)
router.post('/',
    requirePermission('tasks', 'create'),
    validateRequestBody,
    taskController.createTask
);

// Update task (with resource ownership and body validation)
router.put('/:id',
    requirePermission('tasks', 'update'),
    ...protectTenantResource('tasks', 'id'),
    validateRequestBody,
    taskController.updateTask
);

// Delete task (with resource ownership validation)
router.delete('/:id',
    requirePermission('tasks', 'delete'),
    ...protectTenantResource('tasks', 'id'),
    taskController.deleteTask
);

// Task Assignments
router.get('/:id/assignments',
    requirePermission('tasks', 'read'),
    ...protectTenantResource('tasks', 'id'),
    taskController.getTaskAssignments
);

router.post('/:id/assignments',
    requirePermission('tasks', 'update'),
    ...protectTenantResource('tasks', 'id'),
    validateRequestBody,
    taskController.assignResources
);

export default router;
