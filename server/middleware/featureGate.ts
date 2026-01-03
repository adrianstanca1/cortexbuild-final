import { Request, Response, NextFunction } from 'express';
import { featureService } from '../services/featureService.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to require a specific feature to be enabled for the tenant
 * Usage: router.get('/advanced-reports', requireFeature('advanced_reports'), controller)
 */
export const requireFeature = (featureName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = (req as any).context;

            if (!context || !context.companyId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const { companyId } = context;

            // Check if feature is enabled
            const enabled = await featureService.isFeatureEnabled(companyId, featureName);

            if (!enabled) {
                logger.warn(`Feature gate blocked: ${featureName} not enabled for company ${companyId}`);

                return res.status(403).json({
                    error: `Feature '${featureName}' is not enabled for your plan`,
                    code: 'FEATURE_NOT_ENABLED',
                    feature: featureName,
                    upgradeRequired: true
                });
            }

            // Feature is enabled, proceed
            next();
        } catch (error) {
            logger.error('Feature gate middleware error:', error);
            return res.status(500).json({
                error: 'Failed to verify feature access',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

/**
 * Middleware to check multiple features (requires ALL to be enabled)
 */
export const requireFeatures = (featureNames: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = (req as any).context;

            if (!context || !context.companyId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const { companyId } = context;

            // Check all features
            const checks = await Promise.all(
                featureNames.map(async (featureName) => ({
                    feature: featureName,
                    enabled: await featureService.isFeatureEnabled(companyId, featureName)
                }))
            );

            const missingFeatures = checks.filter(c => !c.enabled).map(c => c.feature);

            if (missingFeatures.length > 0) {
                logger.warn(`Feature gate blocked: Missing features ${missingFeatures.join(', ')} for company ${companyId}`);

                return res.status(403).json({
                    error: `Required features not enabled: ${missingFeatures.join(', ')}`,
                    code: 'FEATURES_NOT_ENABLED',
                    missingFeatures,
                    upgradeRequired: true
                });
            }

            // All features enabled, proceed
            next();
        } catch (error) {
            logger.error('Feature gate middleware error:', error);
            return res.status(500).json({
                error: 'Failed to verify feature access',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

/**
 * Middleware to check if ANY of the features are enabled
 */
export const requireAnyFeature = (featureNames: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = (req as any).context;

            if (!context || !context.companyId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const { companyId } = context;

            // Check all features
            const checks = await Promise.all(
                featureNames.map(async (featureName) => ({
                    feature: featureName,
                    enabled: await featureService.isFeatureEnabled(companyId, featureName)
                }))
            );

            const hasAnyEnabled = checks.some(c => c.enabled);

            if (!hasAnyEnabled) {
                logger.warn(`Feature gate blocked: None of ${featureNames.join(', ')} enabled for company ${companyId}`);

                return res.status(403).json({
                    error: `At least one of these features required: ${featureNames.join(', ')}`,
                    code: 'FEATURES_NOT_ENABLED',
                    requiredFeatures: featureNames,
                    upgradeRequired: true
                });
            }

            // At least one feature enabled, proceed
            next();
        } catch (error) {
            logger.error('Feature gate middleware error:', error);
            return res.status(500).json({
                error: 'Failed to verify feature access',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};
