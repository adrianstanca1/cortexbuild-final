import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { membershipService } from '../services/membershipService.js';
import { tenantService } from '../services/tenantService.js';
import { UserRole, MembershipStatus } from '../types/rbac.js';
import { emailService } from '../services/emailService.js';

import { companyProvisioningService } from '../services/companyProvisioningService.js';

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, ownerEmail, ownerName } = req.body;
        // plan is optional in body, defaults to 'Free Beta' in service
        const plan = req.body.plan;

        if (!name || !ownerEmail || !ownerName) {
            throw new AppError('Company name, owner email, and owner name are required', 400);
        }

        // Use the new Provisioning Service
        const result = await companyProvisioningService.initiateProvisioning({
            name,
            ownerEmail,
            ownerName,
            plan
        });

        // Audit Log (system level)
        // Note: The service might handle internal logging, but we log the API action here too.
        // We use system logger or existing audit logic if needed.
        // For now, simple logger.
        logger.info(`Company created via API: ${result.companyId}`);

        res.status(201).json({
            status: 'success',
            data: {
                company: {
                    id: result.companyId,
                    name,
                    status: 'Pending Invite', // Explicitly return status
                    ownerEmail // Return info for UI feedback
                },
                invitation: result.invitation // Return invitation details (could be hidden in production)
            }
        });
    } catch (error) {
        next(error);
    }
};



export const inviteCompanyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId, email, name } = req.body;
        const inviterId = (req as any).userId;

        if (!companyId || !email || !name) {
            throw new AppError('Company ID, email, and name are required', 400);
        }

        const db = getDb();

        // Verify the requesting user has permission to invite
        const membership = await membershipService.getMembership(inviterId, companyId);
        if (!membership || membership.role !== UserRole.COMPANY_ADMIN) {
            throw new AppError('Only company admins can invite other admins', 403);
        }

        // Check if company exists
        const company = await db.get('SELECT name FROM companies WHERE id = ?', [companyId]);
        if (!company) {
            throw new AppError('Company not found', 404);
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        const userId = existingUser ? existingUser.id : uuidv4();
        const now = new Date().toISOString();

        if (existingUser) {
            // Update existing user
            await db.run(
                `UPDATE users SET name = ?, updatedAt = ? WHERE id = ?`,
                [name, now, userId]
            );
        } else {
            // Create new user
            await db.run(
                `INSERT INTO users (id, email, name, status, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, email, name, 'invited', now, now]
            );
        }

        // Check if user is already a member of this company
        const existingMembership = await membershipService.getMembership(userId, companyId);
        if (existingMembership) {
            if (existingMembership.status === 'active') {
                throw new AppError('User is already a member of this company', 409);
            } else {
                // Update existing invitation
                await membershipService.updateMembership(existingMembership.id, {
                    role: UserRole.COMPANY_ADMIN,
                    status: MembershipStatus.INVITED
                }, inviterId);
            }
        } else {
            // Add user as COMPANY_ADMIN to the company
            await membershipService.addMember(
                {
                    userId,
                    companyId,
                    role: UserRole.COMPANY_ADMIN
                },
                inviterId
            );
        }

        // Audit Log
        const logId = uuidv4();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, companyId, inviterId, 'System User', 'INVITE_ADMIN', 'memberships', userId, JSON.stringify({ email, role: UserRole.COMPANY_ADMIN }), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        // Send invitation email
        try {
            const inviteLink = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/accept-invite?userId=${userId}&companyId=${companyId}`;
            await emailService.sendInvitation(
                email,
                'Company Admin',
                company.name,
                inviteLink
            );
        } catch (emailError) {
            logger.error('Failed to send invitation email', emailError);
        }

        res.status(200).json({
            message: 'Company admin invited successfully',
            userId,
            companyId
        });
    } catch (e) {
        next(e);
    }
};

export const getCompanyMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;
        const userId = (req as any).userId;

        // Verify user has permission to view company members
        const membership = await membershipService.getMembership(userId, companyId);
        if (!membership) {
            throw new AppError('You do not have access to this company', 403);
        }

        const db = getDb();
        const members = await db.all(`
            SELECT u.id, u.name, u.email, u.status, m.role, m.status as membershipStatus, m.createdAt
            FROM users u
            JOIN memberships m ON u.id = m.userId
            WHERE m.companyId = ?
            ORDER BY m.createdAt DESC
        `, [companyId]);

        res.json(members);
    } catch (e) {
        next(e);
    }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId, userId: targetUserId } = req.params;
        const { role } = req.body;
        const actorId = (req as any).userId;

        if (!role) {
            throw new AppError('Role is required', 400);
        }

        // Verify the requesting user has permission to update roles
        const actorMembership = await membershipService.getMembership(actorId, companyId);
        if (!actorMembership || actorMembership.role !== UserRole.COMPANY_ADMIN) {
            throw new AppError('Only company admins can update member roles', 403);
        }

        // Verify the target user is a member of the company
        const targetMembership = await membershipService.getMembership(targetUserId, companyId);
        if (!targetMembership) {
            throw new AppError('Target user is not a member of this company', 404);
        }

        // Prevent downgrading company admin role
        if (targetMembership.role === UserRole.COMPANY_ADMIN && role !== UserRole.COMPANY_ADMIN) {
            throw new AppError('Company admin role cannot be changed by another admin', 403);
        }

        // Update the role
        await membershipService.updateMembership(targetMembership.id, { role: role as UserRole }, actorId);

        // Audit Log
        const db = getDb();
        const now = new Date().toISOString();
        const logId = uuidv4();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, companyId, actorId, 'System User', 'UPDATE_ROLE', 'memberships', targetUserId, JSON.stringify({ oldRole: targetMembership.role, newRole: role }), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        res.json({ message: 'Member role updated successfully' });
    } catch (e) {
        next(e);
    }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId, userId: targetUserId } = req.params;
        const actorId = (req as any).userId;

        // Verify the requesting user has permission to remove members
        const actorMembership = await membershipService.getMembership(actorId, companyId);
        if (!actorMembership || actorMembership.role !== UserRole.COMPANY_ADMIN) {
            throw new AppError('Only company admins can remove members', 403);
        }

        // Verify the target user is a member of the company
        const targetMembership = await membershipService.getMembership(targetUserId, companyId);
        if (!targetMembership) {
            throw new AppError('Target user is not a member of this company', 404);
        }

        // Prevent removing the company admin by another admin
        if (targetMembership.role === UserRole.COMPANY_ADMIN) {
            throw new AppError('Company admin cannot be removed by another admin', 403);
        }

        // Remove the membership
        await membershipService.removeMember(targetMembership.id, actorId);

        // Audit Log
        const db = getDb();
        const now = new Date().toISOString();
        const logId = uuidv4();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, companyId, actorId, 'System User', 'REMOVE_MEMBER', 'memberships', targetUserId, JSON.stringify({ removedRole: targetMembership.role }), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        res.json({ message: 'Member removed successfully' });
    } catch (e) {
        next(e);
    }
};

export const getCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).userId;

        // Get all companies the user is a member of
        const db = getDb();
        const companies = await db.all(`
            SELECT c.id, c.name, c.plan, c.status, c.users, c.projects, c.mrr, c.joinedDate,
                   m.role as userRole, m.status as membershipStatus
            FROM companies c
            JOIN memberships m ON c.id = m.companyId
            WHERE m.userId = ?
            ORDER BY c.joinedDate DESC
        `, [userId]);

        res.json(companies);
    } catch (e) {
        next(e);
    }
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = (req as any).userId;

        // Verify user has permission to update this company
        const membership = await membershipService.getMembership(userId, id);
        if (!membership || membership.role !== UserRole.COMPANY_ADMIN) {
            throw new AppError('Only company admins can update company information', 403);
        }

        const db = getDb();
        const now = new Date().toISOString();

        // Prepare update fields
        const updateFields = Object.keys(updates).filter(key =>
            ['name', 'plan', 'status', 'settings', 'subscription'].includes(key)
        );

        if (updateFields.length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        const setClause = updateFields.map(field => `${field} = ?`).join(', ');
        const values = updateFields.map(field => {
            // Stringify objects for JSON fields
            return typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field];
        });

        values.push(now); // For updatedAt
        values.push(id); // For WHERE clause

        await db.run(
            `UPDATE companies SET ${setClause}, updatedAt = ? WHERE id = ?`,
            values
        );

        // Audit Log
        const logId = uuidv4();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, id, userId, 'System User', 'UPDATE_COMPANY', 'companies', id, JSON.stringify(updates), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        res.json({ message: 'Company updated successfully' });
    } catch (e) {
        next(e);
    }
};

export const deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).userId;

        // Verify user has permission to delete this company (Superadmin only)
        const actorMembership = await membershipService.getMembership(userId, id);
        if (!actorMembership || actorMembership.role !== UserRole.SUPERADMIN) {
            throw new AppError('Only superadmins can delete companies', 403);
        }

        const db = getDb();

        // Delete all related data (in proper order to respect foreign keys)
        await db.run('DELETE FROM memberships WHERE companyId = ?', [id]);
        await db.run('DELETE FROM audit_logs WHERE companyId = ?', [id]);
        // Add other related tables as needed

        // Delete the company itself
        await db.run('DELETE FROM companies WHERE id = ?', [id]);

        // Audit Log
        const logId = uuidv4();
        const now = new Date().toISOString();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, id, userId, 'System User', 'DELETE_COMPANY', 'companies', id, JSON.stringify({ deleted: true }), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        res.json({ message: 'Company deleted successfully' });
    } catch (e) {
        next(e);
    }
};

export const updateMyCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).userId;
        const updates = req.body;

        // Find the user's company admin membership to determine which company to update
        const db = getDb();
        const membership = await db.get(`
            SELECT companyId FROM memberships
            WHERE userId = ? AND role = ?
            ORDER BY createdAt DESC LIMIT 1
        `, [userId, UserRole.COMPANY_ADMIN]);

        if (!membership) {
            throw new AppError('You do not have company admin access to any company', 403);
        }

        const companyId = membership.companyId;

        // Prepare update fields (only allow updating certain fields for company admins)
        const allowedFields = ['name', 'settings'];
        const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (updateFields.length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        const setClause = updateFields.map(field => `${field} = ?`).join(', ');
        const values = updateFields.map(field => {
            // Stringify objects for JSON fields
            return typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field];
        });

        const now = new Date().toISOString();
        values.push(now); // For updatedAt
        values.push(companyId); // For WHERE clause

        await db.run(
            `UPDATE companies SET ${setClause}, updatedAt = ? WHERE id = ?`,
            values
        );

        // Audit Log
        const logId = uuidv4();
        await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, userName, action, resource, resourceId, changes, status, timestamp, ipAddress, userAgent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [logId, companyId, userId, 'System User', 'UPDATE_MY_COMPANY', 'companies', companyId, JSON.stringify(updates), 'success', now, req.ip, req.headers['user-agent']]
        ).catch(err => logger.error('Audit log failed', err));

        res.json({ message: 'Company updated successfully' });
    } catch (e) {
        next(e);
    }
};
export const getCompanyDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;
        const userId = (req as any).userId;

        // Verify user has permission to view this company
        const membership = await membershipService.getMembership(userId, companyId);
        if (!membership) {
            throw new AppError('You do not have access to this company', 403);
        }

        const db = getDb();
        const company = await db.get('SELECT * FROM companies WHERE id = ?', [companyId]);

        if (!company) {
            throw new AppError('Company not found', 404);
        }

        // Parse JSON fields
        try {
            company.settings = company.settings && typeof company.settings === 'string' ? JSON.parse(company.settings) : (company.settings || {});
            company.subscription = company.subscription && typeof company.subscription === 'string' ? JSON.parse(company.subscription) : (company.subscription || { status: 'active', plan: 'free' });
            company.features = company.features && typeof company.features === 'string' ? JSON.parse(company.features) : (company.features || []);
        } catch (e) {
            logger.error('Failed to parse company JSON fields', { companyId, error: e });
            company.settings = company.settings || {};
            company.subscription = company.subscription || { status: 'active', plan: 'free' };
            company.features = company.features || [];
        }

        res.json(company);
    } catch (e) {
        next(e);
    }
};
