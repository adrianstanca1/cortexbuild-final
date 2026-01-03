import { Router } from 'express';
import * as moduleController from '../controllers/moduleController.js';
import * as marketplaceController from '../controllers/marketplaceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/rbacMiddleware.js';
import { moduleAccessService } from '../services/moduleAccessService.js';
import { MODULE_DEFINITIONS } from '../types/modules.js';

const router = Router();

// Developer Module Management
router.get('/dev', authenticateToken, moduleController.getModules);
router.post('/dev', authenticateToken, moduleController.publishModule);
router.get('/dev/:id', authenticateToken, moduleController.getModuleById);
router.put('/dev/:id', authenticateToken, moduleController.updateModule);
router.delete('/dev/:id', authenticateToken, moduleController.deleteModule);

// Marketplace Browsing & Installation
router.get('/marketplace', authenticateToken, marketplaceController.getMarketplaceModules);
router.get('/marketplace/categories', authenticateToken, marketplaceController.getMarketplaceCategories);
router.get('/marketplace/installed/:companyId', authenticateToken, marketplaceController.getInstalledModules);
router.post('/marketplace/install/:moduleId', authenticateToken, marketplaceController.installModule);
router.post('/marketplace/uninstall/:moduleId', authenticateToken, marketplaceController.uninstallModule);

// ==============================
// Company Feature Modules (NEW)
// ==============================

// Get all available feature modules (metadata)
router.get('/features/available', authenticateToken, async (req, res) => {
    res.json({ success: true, modules: MODULE_DEFINITIONS });
});

// Get enabled feature modules for user's company
router.get('/features/my-company', authenticateToken, async (req, res, next) => {
    try {
        const companyId = (req as any).context?.tenantId;
        if (!companyId) {
            return res.status(400).json({ error: 'No company context' });
        }
        const modules = await moduleAccessService.getEnabledModules(companyId);
        res.json({
            success: true,
            companyId,
            enabledModules: modules,
            moduleDetails: MODULE_DEFINITIONS.filter(m => modules.includes(m.id))
        });
    } catch (e) {
        next(e);
    }
});

// Get enabled feature modules for specific company
router.get('/features/:companyId', authenticateToken, async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const context = (req as any).context;

        // Only allow access if user is from this company or is SuperAdmin
        if (context.tenantId !== companyId && !context.isSuperadmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const modules = await moduleAccessService.getEnabledModules(companyId);
        res.json({
            success: true,
            companyId,
            enabledModules: modules,
            moduleDetails: MODULE_DEFINITIONS.filter(m => modules.includes(m.id))
        });
    } catch (e) {
        next(e);
    }
});

// Update company feature modules (SuperAdmin only)
router.patch('/features/:companyId', authenticateToken, requireSuperAdmin, async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const { modules: newModules } = req.body;

        if (!Array.isArray(newModules)) {
            return res.status(400).json({ error: 'modules must be an array' });
        }

        const { getDb } = await import('../database.js');
        const db = getDb();

        const company = await db.get('SELECT features FROM companies WHERE id = ?', [companyId]);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const features = company.features ? JSON.parse(company.features) : {};
        features.enabledModules = newModules;

        await db.run(
            'UPDATE companies SET features = ?, updatedAt = ? WHERE id = ?',
            [JSON.stringify(features), new Date().toISOString(), companyId]
        );

        moduleAccessService.clearCache(companyId);

        res.json({
            success: true,
            companyId,
            enabledModules: newModules
        });
    } catch (e) {
        next(e);
    }
});

export default router;

