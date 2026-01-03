/**
 * Enhanced Invitation Service
 * Handles user invitations with expiration, tracking, and resend capabilities
 */

import crypto from 'crypto';
import { getDb } from '../database.js';
import { emailService } from './emailService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export interface Invitation {
    id: string;
    email: string;
    companyId: string;
    role: string;
    token: string;
    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
    invitedBy: string;
    expiresAt: Date;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    metadata?: any;
}

export class InvitationService {
    private readonly INVITATION_EXPIRY_DAYS = 7;
    private readonly TOKEN_LENGTH = 32;

    /**
     * Create a new invitation
     */
    async createInvitation(
        email: string,
        companyId: string,
        role: string,
        invitedBy: string,
        metadata?: any
    ): Promise<Invitation> {
        const db = getDb();

        try {
            // Check if user already exists in this company
            const existingMember = await db.get(`
        SELECT u.id, m.role, m.status
        FROM users u
        JOIN memberships m ON u.id = m.userId
        WHERE u.email = ? AND m.companyId = ?
      `, [email, companyId]);

            if (existingMember) {
                throw new AppError('User is already a member of this company', 400);
            }

            // Check for existing pending invitation
            const existingInvite = await db.get(`
        SELECT id, status, expiresAt
        FROM invitations
        WHERE email = ? AND companyId = ? AND status = 'pending'
      `, [email, companyId]);

            if (existingInvite) {
                const expiresAt = new Date(existingInvite.expiresAt);
                if (expiresAt > new Date()) {
                    throw new AppError('An active invitation already exists for this email', 400);
                }
                // Expire old invitation
                await db.run(`
          UPDATE invitations SET status = 'expired' WHERE id = ?
        `, [existingInvite.id]);
            }

            // Generate secure token
            const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
            const id = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

            // Create invitation
            // Create invitation
            const now = new Date().toISOString();
            // N.B. We insert into both camelCase (new schema) and snake_case (legacy schema) columns
            // to ensure compatibility with the existing database constraints and foreign keys.
            await db.run(`
        INSERT INTO invitations (
          id, email, 
          companyId, company_id, 
          role, 
          token, token_hash, tokenHash, 
          status, 
          invitedBy, created_by, 
          expiresAt, expires_at, 
          createdAt, created_at, 
          updatedAt, 
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                id, email,
                companyId, companyId,
                role,

                token, token, token, // Using token as hash for legacy compatibility if hashing not enforced
                invitedBy, invitedBy,
                expiresAt.toISOString(), expiresAt.toISOString(),
                now, now,
                now,
                JSON.stringify(metadata || {})
            ]);

            // Get company info for email
            const company = await db.get('SELECT name FROM companies WHERE id = ?', [companyId]);
            const inviter = await db.get('SELECT name, email FROM users WHERE id = ?', [invitedBy]);

            // Build invitation URL
            const invitationUrl = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/accept-invitation?token=${token}`;

            // Send invitation email
            await emailService.sendInvitation(
                email,
                role,
                company?.name || 'Company',
                invitationUrl
            );

            // Audit log
            await db.run(`
        INSERT INTO audit_logs (id, userId, companyId, action, resource, details, createdAt)
        VALUES (?, ?, ?, 'INVITE_SENT', 'invitation', ?, ?)
      `, [crypto.randomUUID(), invitedBy, companyId, JSON.stringify({ email, role, invitationId: id }), now]);

            const invitation = await db.get('SELECT * FROM invitations WHERE id = ?', [id]);
            return this.mapInvitation(invitation);
        } catch (error) {
            logger.error('Error creating invitation:', error);
            throw error;
        }
    }

    /**
     * Get invitation by token
     */
    async getInvitationByToken(token: string): Promise<Invitation | null> {
        const db = getDb();

        const invitation = await db.get(`
      SELECT i.*, c.name as companyName, u.name as inviterName
      FROM invitations i
      LEFT JOIN companies c ON i.companyId = c.id
      LEFT JOIN users u ON i.invitedBy = u.id
      WHERE i.token = ?
    `, [token]);

        if (!invitation) {
            return null;
        }

        // Check if expired
        const expiresAt = new Date(invitation.expiresAt);
        if (expiresAt < new Date() && invitation.status === 'pending') {
            await db.run(`UPDATE invitations SET status = 'expired' WHERE id = ?`, [invitation.id]);
            invitation.status = 'expired';
        }

        return this.mapInvitation(invitation);
    }

    /**
     * Accept invitation
     */
    async acceptInvitation(token: string, userId: string): Promise<void> {
        const db = getDb();

        try {
            const invitation = await this.getInvitationByToken(token);

            if (!invitation) {
                throw new AppError('Invalid invitation token', 404);
            }

            if (invitation.status !== 'pending') {
                throw new AppError(`Invitation is ${invitation.status}`, 400);
            }

            if (new Date(invitation.expiresAt) < new Date()) {
                await db.run(`UPDATE invitations SET status = 'expired' WHERE id = ?`, [invitation.id]);
                throw new AppError('Invitation has expired', 400);
            }

            // Create membership
            const membershipId = crypto.randomUUID();
            const now = new Date().toISOString();
            await db.run(`
        INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `, [membershipId, userId, invitation.companyId, invitation.role, now, now]);

            // Mark invitation as accepted
            await db.run(`
        UPDATE invitations 
        SET status = 'accepted', acceptedAt = ?, updatedAt = ?
        WHERE id = ?
      `, [now, now, invitation.id]);

            // Audit log
            await db.run(`
        INSERT INTO audit_logs (id, userId, companyId, action, resource, details, createdAt)
        VALUES (?, ?, ?, 'INVITE_ACCEPTED', 'invitation', ?, ?)
      `, [crypto.randomUUID(), userId, invitation.companyId, JSON.stringify({ invitationId: invitation.id, role: invitation.role }), now]);

            logger.info('Invitation accepted', { invitationId: invitation.id, userId });
        } catch (error) {
            logger.error('Error accepting invitation:', error);
            throw error;
        }
    }

    /**
     * Resend invitation
     */
    async resendInvitation(invitationId: string, resendBy: string): Promise<void> {
        const db = getDb();

        try {
            const invitation = await db.get('SELECT * FROM invitations WHERE id = ?', [invitationId]);

            if (!invitation) {
                throw new AppError('Invitation not found', 404);
            }

            if (invitation.status !== 'pending') {
                throw new AppError('Can only resend pending invitations', 400);
            }

            // Extend expiration
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);
            const now = new Date().toISOString();

            await db.run(`
        UPDATE invitations 
        SET expiresAt = ?, updatedAt = ?
        WHERE id = ?
      `, [newExpiresAt.toISOString(), now, invitationId]);

            // Get company info
            const company = await db.get('SELECT name FROM companies WHERE id = ?', [invitation.companyId]);
            const resender = await db.get('SELECT name FROM users WHERE id = ?', [resendBy]);

            // Build invitation URL
            const invitationUrl = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/accept-invitation?token=${invitation.token}`;

            // Resend email
            await emailService.sendInvitation(
                invitation.email,
                invitation.role,
                company?.name || 'Company',
                invitationUrl
            );

            // Audit log
            await db.run(`
        INSERT INTO audit_logs (id, userId, companyId, action, resource, details, createdAt)
        VALUES (?, ?, ?, 'INVITE_RESENT', 'invitation', ?, ?)
      `, [crypto.randomUUID(), resendBy, invitation.companyId, JSON.stringify({ invitationId, email: invitation.email }), now]);

            logger.info('Invitation resent', { invitationId, resendBy });
        } catch (error) {
            logger.error('Error resending invitation:', error);
            throw error;
        }
    }

    /**
     * Cancel invitation
     */
    async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
        const db = getDb();

        try {
            const invitation = await db.get('SELECT * FROM invitations WHERE id = ?', [invitationId]);

            if (!invitation) {
                throw new AppError('Invitation not found', 404);
            }

            if (invitation.status !== 'pending') {
                throw new AppError('Can only cancel pending invitations', 400);
            }

            const now = new Date().toISOString();
            await db.run(`
        UPDATE invitations 
        SET status = 'cancelled', updatedAt = ?
        WHERE id = ?
      `, [now, invitationId]);

            // Audit log
            await db.run(`
        INSERT INTO audit_logs (id, userId, companyId, action, resource, details, createdAt)
        VALUES (?, ?, ?, 'INVITE_CANCELLED', 'invitation', ?, ?)
      `, [crypto.randomUUID(), cancelledBy, invitation.companyId, JSON.stringify({ invitationId, email: invitation.email }), now]);

            logger.info('Invitation cancelled', { invitationId, cancelledBy });
        } catch (error) {
            logger.error('Error cancelling invitation:', error);
            throw error;
        }
    }

    /**
     * Get all invitations for a company
     */
    async getCompanyInvitations(companyId: string, status?: string): Promise<Invitation[]> {
        const db = getDb();

        let query = `
      SELECT i.*, u.name as inviterName, u.email as inviterEmail
      FROM invitations i
      LEFT JOIN users u ON i.invitedBy = u.id
      WHERE i.companyId = ?
    `;
        const params: any[] = [companyId];

        if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY i.createdAt DESC`;

        const invitations = await db.all(query, params);
        return invitations.map(inv => this.mapInvitation(inv));
    }

    /**
     * Clean up expired invitations
     */
    async cleanupExpiredInvitations(): Promise<number> {
        const db = getDb();
        const now = new Date().toISOString();

        const result = await db.run(`
      UPDATE invitations 
      SET status = 'expired', updatedAt = ?
      WHERE status = 'pending' AND expiresAt < ?
    `, [now, now]);

        const count = result.changes || 0;
        if (count > 0) {
            logger.info(`Marked ${count} invitations as expired`);
        }

        return count;
    }

    /**
     * Map database row to Invitation object
     */
    private mapInvitation(row: any): Invitation {
        return {
            id: row.id,
            email: row.email,
            companyId: row.companyId,
            role: row.role,
            token: row.token,
            status: row.status,
            invitedBy: row.invitedBy,
            expiresAt: new Date(row.expiresAt),
            acceptedAt: row.acceptedAt ? new Date(row.acceptedAt) : undefined,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };
    }
}

export const invitationService = new InvitationService();
