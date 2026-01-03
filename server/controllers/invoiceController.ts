import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { getDb } from '../database.js'; // Keep for fallbacks if needed, or remove if unused
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowService } from '../services/workflowService.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get all invoices for a tenant
 */
export const getInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        // Tenant DB is already scoped to the tenant, but companyId filter is still safe/redundant
        const invoices = await db.all('SELECT * FROM invoices WHERE companyId = ? ORDER BY date DESC', [tenantId]);

        const parsed = invoices.map(inv => ({
            ...inv,
            items: inv.items ? JSON.parse(inv.items) : []
        }));

        res.json(parsed);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single invoice
 */
export const getInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const invoice = await db.get('SELECT * FROM invoices WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!invoice) throw new AppError('Invoice not found', 404);

        res.json({
            ...invoice,
            items: invoice.items ? JSON.parse(invoice.items) : []
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create invoice with automation triggers
 */
export const createInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const data = req.body;
        const id = data.id || uuidv4();

        await db.run(
            `INSERT INTO invoices (
                id, companyId, projectId, number, vendorId, amount, date, dueDate, status, items
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                tenantId,
                data.projectId,
                data.number,
                data.vendorId,
                data.amount,
                data.date || new Date().toISOString().split('T')[0],
                data.dueDate,
                data.status || 'PENDING',
                JSON.stringify(data.items || [])
            ]
        );

        const newInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);

        // Trigger Automations
        await WorkflowService.trigger(tenantId, 'invoice_created', { invoiceId: id, amount: data.amount, projectId: data.projectId });

        if (data.amount > 5000) {
            await WorkflowService.trigger(tenantId, 'large_invoice_received', { invoiceId: id, amount: data.amount, projectId: data.projectId });
        }

        res.status(201).json(newInvoice);
    } catch (error) {
        next(error);
    }
};

/**
 * Update invoice
 */
export const updateInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const updates = req.body;

        const fields: string[] = [];
        const values: any[] = [];

        const allowedFields = ['projectId', 'number', 'vendorId', 'amount', 'date', 'dueDate', 'status', 'items'];

        Object.entries(updates).forEach(([key, val]) => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(key === 'items' ? JSON.stringify(val) : val);
            }
        });

        if (fields.length === 0) throw new AppError('No valid fields to update', 400);

        values.push(id);
        values.push(tenantId);

        await db.run(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`, values);

        res.json({ success: true, id });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete invoice
 */
export const deleteInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const result = await db.run('DELETE FROM invoices WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (result.changes === 0) throw new AppError('Invoice not found', 404);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
