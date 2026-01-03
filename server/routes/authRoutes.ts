import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/login', authController.login);

router.get('/roles', authController.getRoles);
router.post('/roles', authController.createRole);
router.post('/user-roles', authController.assignUserRole);
router.get('/user-roles/:userId/:companyId', authController.getUserRoles);
router.get('/user/permissions', authController.getCurrentUserPermissions);
router.get('/permissions', authController.getAllPermissions);
router.get('/roles/:role/permissions', authController.getRolePermissions);
router.get('/me/context', authController.getCurrentUserContext);
router.post('/invite', authController.inviteUser);
router.post('/register', authController.registerUser);


export default router;
