import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import { tenantDatabaseFactory } from './tenantDatabaseFactory.js';
import { tenantProvisioningService } from './tenantProvisioningService.js';
import { invitationService } from './invitationService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { createCompanyBucket } from './storageService.js';
import { auditService } from './auditService.js';
import { realtimeService } from './realtimeService.js';
import { CompanyModule, getDefaultModulesForPlan, validateModuleSelection } from '../types/modules.js';

export class CompanyProvisioningService {

    /**
     * Initiates the company provisioning process.
     * 1. Creates Company Record (Status: PENDING_OWNER_ACCEPTANCE)
     * 2. Creates Invitation for Owner
     */
    async initiateProvisioning(data: {
        name: string;
        legalName?: string;
        slug?: string;
        industry?: string;
        region?: string;
        ownerEmail: string;
        ownerName: string;
        plan?: string;
        storageQuotaGB?: number;
        isolationMode?: 'Shared' | 'Dedicated';
        selectedModules?: string[]; // CompanyModule IDs
        initialFeatures?: any;
    }) {
        const db = getDb();
        const companyId = `company-${uuidv4()}`;
        const now = new Date().toISOString();
        const plan = data.plan || 'Free Beta';

        try {
            logger.info(`Initiating provisioning for company: ${data.name}`);

            // Determine and validate modules
            let enabledModules: string[];
            if (data.selectedModules && data.selectedModules.length > 0) {
                // Validate provided modules
                const validation = validateModuleSelection(data.selectedModules as CompanyModule[], plan);
                if (!validation.valid) {
                    throw new AppError(`Module validation failed: ${validation.errors.join(', ')}`, 400);
                }
                enabledModules = data.selectedModules;
            } else {
                // Use default modules for plan
                enabledModules = getDefaultModulesForPlan(plan) as string[];
            }

            logger.info(`Enabled modules for ${data.name}: ${enabledModules.join(', ')}`);

            // 1. Create Company Record (Platform DB)
            await db.run(
                `INSERT INTO companies (
                    id, name, legalName, slug, industry, region, 
                    plan, status, users, projects, mrr, joinedDate, createdAt, updatedAt, features, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    companyId,
                    data.name,
                    data.legalName || data.name,
                    data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    data.industry || 'Other',
                    data.region || 'US',
                    plan,
                    'PENDING_OWNER_ACCEPTANCE',
                    0,
                    0,
                    0,
                    now,
                    now,
                    now,
                    JSON.stringify({
                        ...(data.initialFeatures || {}),
                        enabledModules
                    }),
                    JSON.stringify({
                        storageQuotaGB: data.storageQuotaGB,
                        isolationMode: data.isolationMode
                    })
                ]
            );

            // 2. Create Invitation for Owner
            const invitation = await invitationService.createInvitation(
                data.ownerEmail,
                companyId,
                'COMPANY_OWNER_ADMIN',
                'system',
                { initialOwnerName: data.ownerName }
            );

            // Notify SuperAdmins of new provisioning
            realtimeService.notifySystemAlert('info', `New company provisioning initiated: ${data.name}`, { companyId, status: 'PENDING_OWNER_ACCEPTANCE' });

            return {
                companyId,
                tenantId: companyId, // Added for script/logic compatibility
                invitation,
                status: 'PENDING_OWNER_ACCEPTANCE'
            };

        } catch (error: any) {
            logger.error(`Initiate Provisioning failed for ${data.name}`, error);
            // Diagnostic logging
            try {
                const fs = await import('fs');
                const logPath = './debug_provisioning.log';
                const logEntry = `[${new Date().toISOString()}] Provisioning failed for ${data.name}:\n${error.message}\n${error.stack}\n\n`;
                fs.appendFileSync(logPath, logEntry);
            } catch (loggingError) {
                logger.error('Failed to write diagnostic log', loggingError);
            }
            throw new AppError('Company initiation failed', 500);
        }
    }

    /**
     * Activate a company (transition to ACTIVE)
     */
    async activateCompany(companyId: string, activatedBy: string): Promise<void> {
        const db = getDb();
        const now = new Date().toISOString();

        // Validate company exists
        const company = await db.get('SELECT * FROM companies WHERE id = ?', [companyId]);
        if (!company) {
            throw new AppError(`Company ${companyId} not found`, 404);
        }

        if (company.status === 'ACTIVE') {
            throw new AppError(`Company ${companyId} is already active`, 400);
        }

        // Update status
        await db.run(
            'UPDATE companies SET status = ?, updatedAt = ?, lastActivityAt = ? WHERE id = ?',
            ['ACTIVE', now, now, companyId]
        );

        // Log activation
        if (activatedBy && activatedBy !== 'SYSTEM') {
            await auditService.log(db, {
                userId: activatedBy,
                companyId,
                action: 'COMPANY_ACTIVATED',
                resource: 'COMPANY',
                resourceId: companyId
            });
        }

        logger.info(`Company ${companyId} activated by ${activatedBy}`);

        // Notify SuperAdmins
        realtimeService.notifySystemAlert('success', `Company activated: ${company.name}`, { companyId, activatedBy });
    }
}

export const companyProvisioningService = new CompanyProvisioningService();
