import { Request, Response, NextFunction } from 'express';
import { moduleAccessService } from '../services/moduleAccessService.js';
import { CompanyModule } from '../types/modules.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware factory to require specific modules
 * Usage: router.get('/analytics', requireModule(CompanyModule.ANALYTICS), controller)
 */
export function requireModule(...modules: CompanyModule[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = (req as any).context;

            // SuperAdmins bypass module checks
            if (context?.isSuperadmin) {
                return next();
            }

            // Get company ID from context
            const companyId = context?.tenantId;
            if (!companyId) {
                logger.warn('Module check failed: No company context', { url: req.originalUrl });
                return res.status(403).json({
                    error: 'Company context required',
                    code: 'NO_COMPANY_CONTEXT'
                });
            }

            // Check if company has required modules
            const hasModules = await moduleAccessService.hasAllModules(companyId, modules);

            if (!hasModules) {
                const enabledModules = await moduleAccessService.getEnabledModules(companyId);
                const missing = modules.filter(m => !enabledModules.includes(m));

                logger.warn('Module access denied', {
                    companyId,
                    required: modules,
                    missing,
                    url: req.originalUrl
                });

                return res.status(403).json({
                    error: 'This feature is not enabled for your company',
                    code: 'MODULE_NOT_ENABLED',
                    required: modules,
                    missing
                });
            }

            next();
        } catch (error) {
            logger.error('Module middleware error', error);
            next(error);
        }
    };
}

/**
 * Middleware to require at least one of the specified modules
 */
export function requireAnyModule(...modules: CompanyModule[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = (req as any).context;

            // SuperAdmins bypass module checks
            if (context?.isSuperadmin) {
                return next();
            }

            const companyId = context?.tenantId;
            if (!companyId) {
                return res.status(403).json({
                    error: 'Company context required',
                    code: 'NO_COMPANY_CONTEXT'
                });
            }

            const hasAny = await moduleAccessService.hasAnyModule(companyId, modules);

            if (!hasAny) {
                logger.warn('Module access denied (any)', {
                    companyId,
                    required: modules,
                    url: req.originalUrl
                });

                return res.status(403).json({
                    error: 'This feature requires one of the following modules',
                    code: 'MODULE_NOT_ENABLED',
                    required: modules
                });
            }

            next();
        } catch (error) {
            logger.error('Module middleware error', error);
            next(error);
        }
    };
}

/**
 * Attach enabled modules to request context (optional middleware)
 */
export async function attachModules(req: Request, res: Response, next: NextFunction) {
    try {
        const context = (req as any).context;
        const companyId = context?.tenantId;

        if (companyId) {
            const modules = await moduleAccessService.getEnabledModules(companyId);
            (req as any).enabledModules = modules;
        }

        next();
    } catch (error) {
        logger.error('Attach modules error', error);
        next(); // Don't fail request if this fails
    }
}
