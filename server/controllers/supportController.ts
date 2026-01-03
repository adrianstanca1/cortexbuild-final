
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all support tickets (SuperAdmin) or company tickets
 */
export const getTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId, role } = req.context;
        // Logic: specific tenant admin sees only their tickets.
        // SuperAdmin might want to see ALL tickets. 
        // IF SuperAdmin is accessing /api/tickets, are they in a tenant context?
        // If they are "impersonating" or selected a tenant, yes.
        // If they are in "Platform Admin" mode, `tenantId` might be 'platform-admin' or similar, 
        // OR they might use a different endpoint /api/admin/tickets.
        // For now, let's assume this endpoint is for determining tickets visible *within the current context*.
        // So if I am in Tenant A, I see Tenant A tickets.

        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        let query = 'SELECT * FROM support_tickets';
        const params: any[] = [];

        // If we are in restricted tenant context, we only see tickets for this tenant. 
        // Which is guaranteed by `req.tenantDb`.
        // However, if we were using Platform DB (Legacy), we would filter.
        // In Strict Isolation, Filter is implicit.

        // Wait, does 'companyId' column exist in tenant DB? Yes.
        // Should we filter? Usually good practice even if DB is isolated.
        query += ' WHERE companyId = ?';
        params.push(tenantId);

        query += ' ORDER BY lastMessageAt DESC';

        const tickets = await db.all(query, params);
        res.json(tickets);
    } catch (e) {
        next(e);
    }
};

/**
 * Get messages for a specific ticket
 */
export const getTicketMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { ticketId } = req.params;

        const messages = await db.all(
            'SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY createdAt ASC',
            [ticketId]
        );

        res.json(messages);
    } catch (e) {
        next(e);
    }
};

/**
 * Create a new ticket
 */
export const createTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { subject, message, priority = 'MEDIUM', category } = req.body;
        const { userId, tenantId, userName } = req.context;

        if (!subject || !message) {
            throw new AppError('Subject and message are required', 400);
        }

        const ticketId = uuidv4();
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO support_tickets (id, companyId, userId, subject, status, priority, category, lastMessageAt, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)`,
            [ticketId, tenantId, userId, subject, priority, category || 'General', now, now, now]
        );

        await db.run(
            `INSERT INTO ticket_messages (id, ticketId, userId, userName, message, isInternal, createdAt)
             VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [uuidv4(), ticketId, userId, userName || 'User', message, now]
        );

        res.status(201).json({ id: ticketId, subject, status: 'OPEN' });
    } catch (e) {
        next(e);
    }
};

/**
 * Reply to a ticket
 */
export const replyToTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { ticketId } = req.params;
        const { message, isAdmin = false } = req.body;
        const { userId, userName } = req.context;
        const now = new Date().toISOString();

        if (!message) throw new AppError('Message is required', 400);

        await db.run(
            `INSERT INTO ticket_messages (id, ticketId, userId, userName, message, isInternal, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), ticketId, userId, userName || 'User', message, isAdmin ? 1 : 0, now]
        );

        await db.run(
            'UPDATE support_tickets SET lastMessageAt = ?, updatedAt = ? WHERE id = ?',
            [now, now, ticketId]
        );

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status) throw new AppError('Status is required', 400);

        await db.run(
            'UPDATE support_tickets SET status = ?, updatedAt = ? WHERE id = ?',
            [status, new Date().toISOString(), ticketId]
        );

        res.json({ success: true });
    } catch (e) {
        next(e);
    }
};
