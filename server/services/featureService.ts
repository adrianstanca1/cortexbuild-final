import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * FeatureService - Manages feature entitlements for companies
 * Handles feature enablement, bundle application, and runtime evaluation
 */
export class FeatureService {
    /**
     * Get all features for a company
     */
    async getCompanyFeatures(companyId: string) {
        const db = getDb();

        const features = await db.all(
            `SELECT cf.*, fd.displayName, fd.category, fd.description
       FROM companyfeatures cf
       JOIN featuredefinitions fd ON cf.featureName = fd.name
       WHERE cf.companyId = ?
       ORDER BY fd.category, fd.displayName`,
            [companyId]
        );

        return features;
    }

    /**
     * Get all available features from catalog
     */
    async getAllFeatureDefinitions() {
        const db = getDb();

        const features = await db.all(
            `SELECT * FROM featuredefinitions
       ORDER BY category, displayName`
        );

        return features;
    }

    /**
     * Check if a specific feature is enabled for a company
     */
    async isFeatureEnabled(companyId: string, featureName: string): Promise<boolean> {
        const db = getDb();

        const feature = await db.get(
            `SELECT enabled FROM companyfeatures
       WHERE companyId = ? AND featureName = ?`,
            [companyId, featureName]
        );

        // If feature record doesn't exist, check default from definition
        if (!feature) {
            const definition = await db.get(
                `SELECT defaultEnabled FROM featuredefinitions
         WHERE name = ?`,
                [featureName]
            );
            return definition?.defaultEnabled || false;
        }

        return feature.enabled;
    }

    /**
     * Enable or disable a feature for a company
     */
    async setFeature(
        companyId: string,
        featureName: string,
        enabled: boolean,
        config: any = {},
        createdBy?: string
    ) {
        const db = getDb();

        // Check if feature exists in definitions
        const definition = await db.get(
            `SELECT * FROM featuredefinitions WHERE name = ?`,
            [featureName]
        );

        if (!definition) {
            throw new Error(`Feature '${featureName}' not found in catalog`);
        }

        // Check dependencies
        if (enabled && definition.requiresFeatures && definition.requiresFeatures.length > 0) {
            const requiresFeatures = JSON.parse(definition.requiresFeatures);
            for (const requiredFeature of requiresFeatures) {
                const isEnabled = await this.isFeatureEnabled(companyId, requiredFeature);
                if (!isEnabled) {
                    throw new Error(
                        `Cannot enable '${featureName}': required feature '${requiredFeature}' is not enabled`
                    );
                }
            }
        }

        // Upsert feature
        const now = new Date().toISOString();
        const configStr = JSON.stringify(config);
        const isMysql = process.env.DATABASE_TYPE === 'mysql';
        const query = isMysql
            ? `INSERT INTO companyfeatures (companyId, featureName, enabled, config, createdBy, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), config = VALUES(config), updatedAt = VALUES(updatedAt)`
            : `INSERT INTO companyfeatures (companyId, featureName, enabled, config, createdBy, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (companyId, featureName)
               DO UPDATE SET enabled = ?, config = ?, updatedAt = ?`;

        // MySQL ON DUPLICATE KEY with VALUES() wrapper doesn't need extra params if referring to inserted values
        // But if using positional params in UPDATE clause (like the Postgres version does for DO UPDATE SET ... = ?), we need to supply them.
        // However, the Postgres version supplied 3 extra params.
        // The MySQL version I wrote above uses VALUES(), so it uses the params from the INSERT part.

        let params;
        if (isMysql) {
            params = [companyId, featureName, enabled, configStr, createdBy, now, now];
        } else {
            params = [companyId, featureName, enabled, configStr, createdBy, now, now, enabled, configStr, now];
        }

        await db.run(query, params);

        logger.info(`Feature '${featureName}' ${enabled ? 'enabled' : 'disabled'} for company ${companyId}`);
    }

    /**
     * Apply a feature bundle to a company
     * Bundles are predefined sets of features based on plan tier
     */
    async applyFeatureBundle(companyId: string, bundleName: string, createdBy?: string) {
        const FEATURE_BUNDLES: Record<string, string[] | 'ALL'> = {
            FREE: ['basic_reports', 'real_time_collaboration', 'comments_mentions', 'file_sharing', 'email_automation', 'document_storage'],
            STARTER: ['basic_reports', 'real_time_collaboration', 'comments_mentions', 'file_sharing', 'integrations', 'email_automation', 'document_storage'],
            PROFESSIONAL: [
                'basic_reports', 'advanced_reports', 'custom_dashboards', 'scheduled_reports',
                'real_time_collaboration', 'comments_mentions', 'file_sharing', 'task_dependencies',
                'integrations', 'api_access', 'webhooks',
                'email_automation', 'workflow_automation', 'status_automation',
                'document_storage', 'version_control', 'advanced_search'
            ],
            ENTERPRISE: 'ALL' // All features
        };

        const bundle = FEATURE_BUNDLES[bundleName.toUpperCase()];

        if (!bundle) {
            throw new Error(`Feature bundle '${bundleName}' not found`);
        }

        if (bundle === 'ALL') {
            // Enable all features
            const allFeatures = await this.getAllFeatureDefinitions();
            for (const feature of allFeatures) {
                await this.setFeature(companyId, feature.name, true, {}, createdBy);
            }
            logger.info(`All features enabled for company ${companyId} (ENTERPRISE bundle)`);
        } else {
            // Enable specific features
            for (const featureName of bundle) {
                await this.setFeature(companyId, featureName, true, {}, createdBy);
            }
            logger.info(`Feature bundle '${bundleName}' applied to company ${companyId}`);
        }
    }

    /**
     * Bootstrap default features for a new company based on their plan
     */
    async bootstrapDefaultFeatures(companyId: string, plan: string) {
        const planToBundle: Record<string, string> = {
            'Free': 'FREE',
            'Starter': 'STARTER',
            'Professional': 'PROFESSIONAL',
            'Enterprise': 'ENTERPRISE'
        };

        const bundleName = planToBundle[plan] || 'FREE';
        await this.applyFeatureBundle(companyId, bundleName, 'SYSTEM');

        logger.info(`Default features bootstrapped for company ${companyId} with plan ${plan}`);
    }
}

export const featureService = new FeatureService();
