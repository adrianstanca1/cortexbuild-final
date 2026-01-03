import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get all companies with statistics (SUPERADMIN only)
 */
export const getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        // Get all companies with member counts
        const companies = await db.all(`
            SELECT 
                c.*,
                tr.dbConnectionString,
                c.features,
                COUNT(DISTINCT m.userId) as memberCount,
                COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.userId END) as activeMemberCount
            FROM companies c
            LEFT JOIN memberships m ON c.id = m.companyId
            LEFT JOIN tenant_registry tr ON c.id = tr.companyId
            GROUP BY c.id
            ORDER BY c.createdAt DESC
        `);

        // Parse JSON fields
        const companiesWithParsedData = companies.map(company => ({
            ...company,
            settings: company.settings ? JSON.parse(company.settings) : {},
            subscription: company.subscription ? JSON.parse(company.subscription) : { status: 'active', plan: 'free' },
            features: company.features ? JSON.parse(company.features) : [],
            isolationMode: company.dbConnectionString ? 'Dedicated' : 'Shared'
        }));

        res.json(companiesWithParsedData);
    } catch (e) {
        next(e);
    }
};

/**
 * Get company statistics for dashboard (SUPERADMIN only)
 */
export const getCompanyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();

        const stats = await db.get(`
            SELECT 
                COUNT(*) as totalCompanies,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as activeCompanies,
                COUNT(CASE WHEN status = 'Suspended' THEN 1 END) as suspendedCompanies,
                SUM(users) as totalUsers,
                SUM(projects) as totalProjects,
                SUM(mrr) as totalMrr
            FROM companies
        `);

        // Get recent companies (last 30 days)
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const thirtyDaysAgo = date.toISOString();

        const recentCompanies = await db.get(`
            SELECT COUNT(*) as count
            FROM companies
            WHERE createdAt >= ?
        `, [thirtyDaysAgo]);

        // Get plan distribution
        const planDistribution = await db.all(`
            SELECT plan, COUNT(*) as count
            FROM companies
            GROUP BY plan
        `);

        res.json({
            ...stats,
            recentCompanies: recentCompanies.count,
            planDistribution
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Suspend a company (SUPERADMIN only)
 */
import { tenantService } from '../services/tenantService.js';

// ... (keep getAllCompanies and getCompanyStats as they are mostly read ops)

/**
 * Create a new company (SUPERADMIN only)
 */
import { companyProvisioningService } from '../services/companyProvisioningService.js';

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, legalName, slug, industry, region, ownerEmail, ownerName, plan, maxUsers, maxProjects, storageQuotaGB, isolationMode, initialFeatures } = req.body;

        if (!name || !ownerEmail || !ownerName) {
            throw new AppError('Name, Owner Email, and Owner Name are required', 400);
        }

        // 1. Provision Company
        const result = await companyProvisioningService.initiateProvisioning({
            name,
            legalName,
            slug,
            industry,
            region,
            ownerEmail,
            ownerName,
            plan,
            storageQuotaGB: storageQuotaGB ? Number(storageQuotaGB) : undefined,
            isolationMode,
            initialFeatures
        });

        // 2. Update Limits if provided (Optional overrides)
        if (maxUsers || maxProjects) {
            await tenantService.updateTenantLimits(result.companyId, {
                maxUsers: maxUsers ? Number(maxUsers) : undefined,
                maxProjects: maxProjects ? Number(maxProjects) : undefined,
                plan
            });
        }

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Suspend a company (SUPERADMIN only)
 */
export const suspendCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        // userId is available in req from auth middleware if needed for audit inside service

        await tenantService.suspendTenant(id);

        // Audit log allows tracking reason, currently tenantService logs simple message
        // Enhancing tenantService audit later would be ideal, but for now this is cleaner

        res.json({ message: 'Company suspended successfully' });
    } catch (e) {
        next(e);
    }
};

/**
 * Activate a suspended company (SUPERADMIN only)
 */
export const activateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await tenantService.reactivateTenant(id);

        res.json({ message: 'Company activated successfully' });
    } catch (e) {
        next(e);
    }
};

/**
 * Update company resource limits (SUPERADMIN only)
 */
export const updateCompanyLimits = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { maxUsers, maxProjects, plan } = req.body;

        await tenantService.updateTenantLimits(id, { maxUsers, maxProjects, plan });

        res.json({ message: 'Company limits updated successfully' });
    } catch (e) {
        next(e);
    }
};

/**
 * Get company activity logs (SUPERADMIN only)
 */
export const getCompanyActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const db = getDb();
        const logs = await db.all(`
            SELECT *
            FROM audit_logs
            WHERE companyId = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [id, Number(limit), Number(offset)]);

        // Parse JSON fields
        const logsWithParsedData = logs.map(log => ({
            ...log,
            changes: log.changes ? JSON.parse(log.changes) : null
        }));

        res.json(logsWithParsedData);
    } catch (e) {
        next(e);
    }
};

/**
 * Update company features (SUPERADMIN only)
 */
export const updateCompanyFeatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { features } = req.body; // Expecting JSON object
        const db = getDb();

        await db.run(
            `UPDATE companies SET features = ?, updatedAt = ? WHERE id = ?`,
            [JSON.stringify(features), new Date().toISOString(), id]
        );

        res.json({ message: 'Company features updated successfully' });
    } catch (e) {
        next(e);
    }
};
