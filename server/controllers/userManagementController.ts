import { Request, Response, NextFunction } from 'express';
import { userManagementService } from '../services/userManagementService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Get all platform users
 */
export const getAllPlatformUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;
    const filters = {
      status: req.query.status as string,
      role: req.query.role as string,
      search: req.query.search as string
    };

    const users = await userManagementService.getAllUsers(tenantId as string, filters);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await userManagementService.getUserById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password, role, companyId, permissions } = req.body;
    const actorId = (req as any).userId;

    const newUser = await userManagementService.createUser({
      email,
      name,
      password,
      role,
      companyId,
      permissions
    }, actorId);

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const actorId = (req as any).userId;

    const updatedUser = await userManagementService.updateUser(id, updateData, actorId);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).userId;

    await userManagementService.deleteUser(id, actorId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user role
 */
export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role, companyId } = req.body;
    const actorId = (req as any).userId;

    if (!companyId) {
      throw new AppError('Company ID is required to change user role', 400);
    }

    await userManagementService.changeUserRole(id, role, companyId, actorId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user status
 */
export const changeUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = (req as any).userId;

    await userManagementService.changeUserStatus(id, status, actorId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Invite user
 */
export const inviteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role, companyId } = req.body;
    const actorId = (req as any).userId;

    if (!email || !role || !companyId) {
      throw new AppError('Email, role, and companyId are required', 400);
    }

    await userManagementService.inviteUser(email, role, companyId, actorId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk invite users
 */
export const bulkInviteUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invitations, companyId } = req.body;
    const actorId = (req as any).userId;

    if (!Array.isArray(invitations) || !companyId) {
      throw new AppError('Invitations array and companyId are required', 400);
    }

    await userManagementService.bulkInviteUsers(invitations, companyId, actorId);
    res.json({ success: true, count: invitations.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password
 */
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).userId;

    await userManagementService.resetUserPassword(id, actorId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password (public)
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await userManagementService.forgotPassword(email);
    res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm password reset (public)
 */
export const confirmPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      throw new AppError('Token and password are required', 400);
    }

    await userManagementService.confirmPasswordReset(token, password);
    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
};