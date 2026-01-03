import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { CompanyModule } from '../types/modules.js';
import { AppError } from '../utils/AppError.js';

/**
 * Module Access Service
 * Handles checking if companies have specific modules enabled
 */
class ModuleAccessService {
    private moduleCache: Map<string, { modules: CompanyModule[]; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if a company has a specific module enabled
     */
    async hasModule(companyId: string, module: CompanyModule): Promise<boolean> {
        const modules = await this.getEnabledModules(companyId);
        return modules.includes(module);
    }

    /**
     * Check if a company has all specified modules enabled
     */
    async hasAllModules(companyId: string, modules: CompanyModule[]): Promise<boolean> {
        const enabledModules = await this.getEnabledModules(companyId);
        return modules.every(module => enabledModules.includes(module));
    }

    /**
     * Check if a company has at least one of the specified modules
     */
    async hasAnyModule(companyId: string, modules: CompanyModule[]): Promise<boolean> {
        const enabledModules = await this.getEnabledModules(companyId);
        return modules.some(module => enabledModules.includes(module));
    }

    /**
     * Get all enabled modules for a company
     */
    async getEnabledModules(companyId: string): Promise<CompanyModule[]> {
        // Check cache first
        const cached = this.moduleCache.get(companyId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.modules;
        }

        // Fetch from database
        const db = getDb();
        const company = await db.get(
            'SELECT features FROM companies WHERE id = ?',
            [companyId]
        );

        if (!company) {
            logger.warn(`Company not found: ${companyId}`);
            return [];
        }

        let enabledModules: CompanyModule[] = [];
        try {
            const features = company.features ? JSON.parse(company.features) : {};
            enabledModules = features.enabledModules || [];
        } catch (error) {
            logger.error('Failed to parse company features', { companyId, error });
        }

        // Update cache
        this.moduleCache.set(companyId, {
            modules: enabledModules,
            timestamp: Date.now()
        });

        return enabledModules;
    }

    /**
     * Require specific modules - throws error if not enabled
     */
    async requireModules(companyId: string, modules: CompanyModule[]): Promise<void> {
        const hasAll = await this.hasAllModules(companyId, modules);
        if (!hasAll) {
            const enabledModules = await this.getEnabledModules(companyId);
            const missing = modules.filter(m => !enabledModules.includes(m));
            throw new AppError(
                `Missing required modules: ${missing.join(', ')}`,
                403
            );
        }
    }

    /**
     * Clear cache for a specific company (call after updating modules)
     */
    clearCache(companyId: string): void {
        this.moduleCache.delete(companyId);
    }

    /**
     * Clear all cache
     */
    clearAllCache(): void {
        this.moduleCache.clear();
    }
}

export const moduleAccessService = new ModuleAccessService();
