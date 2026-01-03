import { Router } from 'express';
import { 
  getAllPlatformUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  changeUserRole, 
  changeUserStatus,
  inviteUser,
  bulkInviteUsers,
  resetUserPassword,
  forgotPassword,
  confirmPasswordReset
} from '../controllers/userManagementController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types/rbac.js';

const router = Router();

// All user management routes require at least COMPANY_ADMIN or SUPERADMIN role
const allowedRoles = [UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN];

// Public routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-confirm', confirmPasswordReset);

router.use(requireRole(allowedRoles));

// Get all users (with optional tenant filter)
router.get('/', getAllPlatformUsers);

// Get specific user
router.get('/:id', getUserById);

// Create new user
router.post('/', createUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Change user role
router.put('/:id/role', changeUserRole);

// Change user status
router.put('/:id/status', changeUserStatus);

// Invite user
router.post('/invite', inviteUser);

// Bulk invite users
router.post('/bulk-invite', bulkInviteUsers);

// Reset user password
router.post('/:id/reset-password', resetUserPassword);

export default router;