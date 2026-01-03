/**
 * Invitation Controller
 * Handles invitation-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { invitationService } from '../services/invitationService.js';
import { emailService } from '../services/emailService.js';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Create a new invitation (Company Admin invites user)
 */
export const createInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, role, companyId } = req.body;
        const userId = (req as any).userId;

        if (!email || !role || !companyId) {
            throw new AppError('Email, role, and companyId are required', 400);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Invalid email format', 400);
        }

        const invitation = await invitationService.createInvitation(
            email,
            companyId,
            role,
            userId
        );

        res.status(201).json({
            status: 'success',
            message: 'Invitation sent successfully',
            data: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get invitation details by token
 */
export const validateInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;

        if (!token) {
            throw new AppError('Token is required', 400);
        }

        const invitation = await invitationService.getInvitationByToken(token);

        if (!invitation) {
            throw new AppError('Invalid invitation token', 404);
        }

        res.json({
            status: 'success',
            data: {
                email: invitation.email,
                role: invitation.role,
                companyId: invitation.companyId,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                companyName: (invitation as any).companyName,
                inviterName: (invitation as any).inviterName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Accept invitation and create/update user account
 */
export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password, name } = req.body;

        if (!token || !password || !name) {
            throw new AppError('Token, password, and name are required', 400);
        }

        // Password validation
        if (password.length < 8) {
            throw new AppError('Password must be at least 8 characters', 400);
        }

        const db = getDb();
        const invitation = await invitationService.getInvitationByToken(token);

        if (!invitation) {
            throw new AppError('Invalid invitation token', 404);
        }

        if (invitation.status !== 'pending') {
            throw new AppError(`Invitation is ${invitation.status}`, 400);
        }

        // Check if user exists
        let userId: string;
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [invitation.email]);

        if (existingUser) {
            userId = existingUser.id;
            const hashedPassword = await bcrypt.hash(password, 12);

            // Update user with new password and activate
            await db.run(`
        UPDATE users 
        SET name = ?, password = ?, status = 'active', updatedAt = datetime('now')
        WHERE id = ?
      `, [name, hashedPassword, userId]);
        } else {
            // Create new user
            userId = crypto.randomUUID();
            const hashedPassword = await bcrypt.hash(password, 12);

            await db.run(`
        INSERT INTO users (id, email, password, name, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      `, [userId, invitation.email, hashedPassword, name]);
        }

        // Accept invitation (creates membership)
        await invitationService.acceptInvitation(token, userId);

        // Generate auth token
        const authToken = jwt.sign(
            { userId, email: invitation.email, companyId: invitation.companyId },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '7d' }
        );

        res.json({
            status: 'success',
            message: 'Invitation accepted successfully',
            token: authToken,
            data: {
                user: {
                    id: userId,
                    email: invitation.email,
                    name
                },
                companyId: invitation.companyId
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend invitation
 */
export const resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        await invitationService.resendInvitation(id, userId);

        res.json({
            status: 'success',
            message: 'Invitation resent successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel invitation
 */
export const cancelInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        await invitationService.cancelInvitation(id, userId);

        res.json({
            status: 'success',
            message: 'Invitation cancelled successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all invitations for a company
 */
export const getCompanyInvitations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;
        const { status } = req.query;

        const invitations = await invitationService.getCompanyInvitations(
            companyId,
            status as string
        );

        res.json({
            status: 'success',
            data: invitations.map(inv => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                expiresAt: inv.expiresAt,
                acceptedAt: inv.acceptedAt,
                createdAt: inv.createdAt,
                inviterName: (inv as any).inviterName,
                inviterEmail: (inv as any).inviterEmail
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cleanup expired invitations (scheduled job endpoint)
 */
export const cleanupExpiredInvitations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await invitationService.cleanupExpiredInvitations();

        res.json({
            status: 'success',
            message: `Cleaned up ${count} expired invitations`,
            data: { count }
        });
    } catch (error) {
        next(error);
    }
};
