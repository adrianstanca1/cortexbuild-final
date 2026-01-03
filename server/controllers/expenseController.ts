import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all expenses for a tenant (optionally filtered by project)
 */
export const getExpenses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { projectId } = req.query;

        let query = 'SELECT * FROM expense_claims WHERE companyId = ?';
        const params: any[] = [tenantId];

        if (projectId) {
            query += ' AND projectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY date DESC';

        const expenses = await db.all(query, params);
        res.json(Array.isArray(expenses) ? expenses : []);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new expense
 */
export const createExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const data = req.body;
        const id = data.id || uuidv4();

        await db.run(
            `INSERT INTO expense_claims (
                id, companyId, projectId, description, amount, date, category, status, costCodeId, vendorId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                tenantId,
                data.projectId,
                data.description,
                data.amount,
                data.date || new Date().toISOString().split('T')[0],
                data.category || 'General',
                data.status || 'PENDING',
                data.costCodeId || null,
                data.vendorId || null
            ]
        );

        // Update Cost Code "Spent" amount if linked
        if (data.costCodeId) {
            await db.run(
                `UPDATE cost_codes SET spent = spent + ? WHERE id = ? AND companyId = ?`,
                [Math.abs(data.amount), data.costCodeId, tenantId]
            );
        }

        const newExpense = await db.get('SELECT * FROM expense_claims WHERE id = ?', [id]);
        res.status(201).json(newExpense);
    } catch (error) {
        next(error);
    }
};

/**
 * Update an expense
 */
export const updateExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const updates = req.body;
        const allowedFields = ['description', 'amount', 'date', 'category', 'status', 'costCodeId', 'vendorId'];

        // Get old expense to handle cost code logic if amount changes
        const oldExpense = await db.get('SELECT * FROM expense_claims WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!oldExpense) throw new AppError('Expense not found', 404);

        const fields: string[] = [];
        const values: any[] = [];

        Object.entries(updates).forEach(([key, val]) => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(val);
            }
        });

        if (fields.length === 0) throw new AppError('No valid fields', 400);

        values.push(id);
        values.push(tenantId);

        await db.run(`UPDATE expense_claims SET ${fields.join(', ')} WHERE id = ? AND companyId = ?`, values);

        // If amount or cost code changed, we should re-calculate (simplified here: just subtract old, add new if needed)
        // For robustness, this logic might need to be more complex or handled via triggers/periodic recalculation.
        if (updates.amount && updates.amount !== oldExpense.amount && oldExpense.costCodeId) {
            const diff = Math.abs(updates.amount) - Math.abs(oldExpense.amount);
            await db.run(`UPDATE cost_codes SET spent = spent + ? WHERE id = ?`, [diff, oldExpense.costCodeId]);
        }

        res.json({ success: true, id });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const expense = await db.get('SELECT * FROM expense_claims WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!expense) throw new AppError('Expense not found', 404);

        await db.run('DELETE FROM expense_claims WHERE id = ? AND companyId = ?', [id, tenantId]);

        // Revert cost code spent
        if (expense.costCodeId) {
            await db.run(
                `UPDATE cost_codes SET spent = spent - ? WHERE id = ? AND companyId = ?`,
                [Math.abs(expense.amount), expense.costCodeId, tenantId]
            );
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
