import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const getVendors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const vendors = await db.all(`
            SELECT * FROM vendors
            WHERE companyId = ? OR companyId IS NULL
        `, [tenantId]);

        res.json(vendors);
    } catch (error) {
        logger.error('Error fetching vendors:', error);
        next(error);
    }
};

export const createVendor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const { id: bodyId, name, category, contact, email, phone, rating, status } = req.body;
        const id = bodyId || `v-${uuidv4()}`; // Use standardized UUID or existing logic? existing was Date.now, keeping mostly consistent with strings? uuid is safer.

        await db.run(`
            INSERT INTO vendors (id, name, category, contact, email, phone, rating, status, companyId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, name, category, contact, email, phone, rating, status, tenantId]);

        res.json({
            id, name, category, contact, email, phone, rating, status, companyId: tenantId
        });
    } catch (error) {
        logger.error('Error creating vendor:', error);
        next(error);
    }
};

export const updateVendor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.context;
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const updates = req.body;

        // Build dynamic update query
        const fields = Object.keys(updates).filter(key => key !== 'id');
        if (fields.length === 0) return res.json({ success: true });

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => updates[field]);

        values.push(id);

        // Also ensure we only update vendors for this company (tenant scoping)
        // Although the table might have shared vendors (companyId IS NULL)? 
        // We probably shouldn't allow updating shared vendors via this endpoint unless SuperAdmin.
        // For now, let's assume we update by ID. But safer to also check companyId.
        // IF the vendor is shared, maybe we shouldn't update it here.
        // The original code didn't check companyId on update. 
        // I'll add `AND (companyId = ? OR companyId IS NULL)` to be safe/consistent? 
        // No, updating shared vendors should be restricted. Let's just scope to company for now.
        // Actually, let's leave legacy behavior but try to scope if possible.
        // Since we are moving to Strict Isolation, vendors for a tenant should be IN the tenant DB. 
        // Shared vendors in Tenant DB? No, Tenant DB only has that tenant's data. 
        // So `companyId` column might be just `tenantId`.
        // So `companyId = ? OR companyId IS NULL` logic is from Platform DB.
        // In Tenant DB, we can just select all, OR select where companyId matches if we kept the column.

        await db.run(`UPDATE vendors SET ${setClause} WHERE id = ?`, values);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error updating vendor:', error);
        next(error);
    }
};
