
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin, supabaseAdmin } from '../utils/supabase.js';
import { AuthenticatedRequest } from '../types/express.js';

export const inviteMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDb(); // Platform DB for 'users'
        const tenantDb = req.tenantDb; // Tenant DB for 'team'

        if (!tenantDb) {
            throw new AppError('Tenant database connection not found', 500);
        }

        const { email, name, role, projectId } = req.body;
        const tenantId = req.tenantId;

        if (!email || !name || !role) {
            throw new AppError('Email, name, and role are required', 400);
        }

        // Check if user already exists in this company (Check Tenant Team first)
        const existing = await tenantDb.get(
            `SELECT id FROM team WHERE email = ? AND companyId = ?`,
            [email, tenantId]
        );

        if (existing) {
            throw new AppError('User already exists in this company', 409);
        }

        const id = uuidv4();

        // 1. Create/Invite in Supabase Auth (if not exists)
        // This sends an invite email if email config is set up, or just creates the user
        let userId = '';
        try {
            // Prefer the central server admin client
            const adminClient: any = supabaseAdmin || (typeof getSupabaseAdmin === 'function' ? getSupabaseAdmin() : null);
            if (!adminClient) {
                throw new AppError('Server Supabase admin client not configured. Cannot invite users via Supabase.', 500);
            }

            // We use the admin API to invite the user. This creates an authorized user in Supabase.
            const { data: { user } = { user: null }, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
                data: {
                    companyId: tenantId,
                    role: role,
                    full_name: name
                }
                // redirectTo: 'https://buildpro.app/reset-password' // Optional URL
            });

            if (inviteError) {
                logger.error('Supabase Invite Error:', inviteError);
                throw new AppError(`Failed to invite user: ${inviteError.message}`, 500);
            }

            if (user) {
                userId = user.id;
            }
        } catch (authErr) {
            logger.warn('Failed to invite via Supabase Auth, falling back to local DB only (User wont be able to login):', authErr);
            userId = id; // Fallback to random ID if auth fails (e.g. dev mode)
        }
        // For this demo, we'll create a user who can login (authMiddleware checks email) 
        // OR we just create a "TeamMember" record if they are separate tables.
        // Based on types.ts, TeamMember and UserProfile are distinct but related. 
        // Let's assume we are adding to 'team' table first for visualization.

        await tenantDb.run(
            `INSERT INTO team (id, companyId, name, email, role, status, projectId, initials, color, joinDate)
             VALUES (?, ?, ?, ?, ?, 'Invited', ?, ?, ?, ?)`,
            [
                userId, // Use the real Auth ID
                tenantId,
                name,
                email,
                role,
                projectId || null,
                name.substring(0, 2).toUpperCase(),
                'bg-gray-500',
                new Date().toISOString().split('T')[0]
            ]
        );

        // Ensure 'users' table sync (Global view for Auth)
        // Check if user exists first
        const userExists = await db.get(`SELECT id FROM users WHERE id = ?`, [userId]);
        if (!userExists) {
            await db.run(
                `INSERT INTO users (id, companyId, email, name, role, status, createdAt, isActive)
                  VALUES (?, ?, ?, ?, ?, 'invited', ?, true)`,
                [userId, tenantId, email, name, role, new Date().toISOString()]
            );
        } else {
            // Optional: Update existing user's meta if needed
            // await db.run(`UPDATE users SET companyId = ? WHERE id = ?`, [tenantId, userId]);
        }

        logger.info(`Invited member ${email} to company ${tenantId}`);

        res.status(201).json({ success: true, id, message: 'Member invited successfully' });
    } catch (e) {
        next(e);
    }
};

export const updateMemberRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDb(); // Platform DB
        const tenantDb = req.tenantDb; // Tenant DB

        if (!tenantDb) {
            throw new AppError('Tenant database connection not found', 500);
        }

        const { id } = req.params;
        const { role } = req.body;
        const tenantId = req.tenantId;

        // Verify member belongs to tenant (in team table)
        const member = await tenantDb.get(`SELECT id FROM team WHERE id = ? AND companyId = ?`, [id, tenantId]);
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        await tenantDb.run(
            `UPDATE team SET role = ? WHERE id = ?`,
            [role, id]
        );

        // Sync with users table (Platform)
        await db.run(
            `UPDATE users SET role = ? WHERE id = ?`,
            [role, id]
        );

        res.json({ success: true, id, role });
    } catch (e) {
        next(e);
    }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDb(); // Platform DB
        const tenantDb = req.tenantDb; // Tenant DB

        if (!tenantDb) {
            throw new AppError('Tenant database connection not found', 500);
        }

        const { id } = req.params;
        const tenantId = req.tenantId;

        // Verify member belongs to tenant
        const member = await tenantDb.get(`SELECT id FROM team WHERE id = ? AND companyId = ?`, [id, tenantId]);
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        await tenantDb.run(`DELETE FROM team WHERE id = ?`, [id]);
        await db.run(`DELETE FROM users WHERE id = ?`, [id]); // Also remove login access

        logger.info(`Removed member ${id} from company ${tenantId}`);

        res.json({ success: true, id });
    } catch (e) {
        next(e);
    }
};
