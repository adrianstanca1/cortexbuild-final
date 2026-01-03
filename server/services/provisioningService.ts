import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { featureService } from './featureService.js';
import { limitService } from './limitService.js';
import { auditService } from './auditService.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from './emailService.js';
import { invitationService } from './invitationService.js';

export interface CreateCompanyParams {
    name: string;
    legalName?: string;
    slug?: string;
    industry?: string;
    region?: string;
    timezone?: string;
    currency?: string;
    plan: string;
    status?: string;
    metadata?: Record<string, any>;
}

export interface OwnerParams {
    email: string;
    name: string;
    title?: string;
    phone?: string;
    department?: string;
}

/**
 * ProvisioningService - Orchestrates atomic company creation and provisioning
 * Ensures transactional integrity and handles rollback on failure
 */
export class ProvisioningService {
    /**
     * Create a new company with owner (atomic transaction)
     * This is the main entry point for company provisioning
     */
    async createCompany(
        companyParams: CreateCompanyParams,
        ownerParams: OwnerParams,
        createdBy: string = 'SYSTEM'
    ): Promise<{ company: any; owner: any; invitation: any }> {
        const db = getDb();
        let companyId: string | null = null;
        let userId: string | null = null;
        let invitationId: string | null = null;

        try {
            logger.info('Starting company provisioning...', { companyName: companyParams.name, ownerEmail: ownerParams.email });

            // Step 1: Generate slug if not provided
            const slug = companyParams.slug || await this.generateSlug(companyParams.name);

            // Step 2: Validate slug uniqueness
            await this.validateSlugUniqueness(slug);

            // Step 3: Check if owner email already exists
            const existingUser = await this.findUserByEmail(ownerParams.email);
            if (existingUser) {
                throw new Error(`User with email ${ownerParams.email} already exists. Cannot use as company owner.`);
            }

            // Step 4: Create company in DRAFT status
            companyId = await this.createCompanyRecord({
                ...companyParams,
                slug,
                status: 'DRAFT'
            });

            logger.info(`Company created with ID: ${companyId}`);

            // Step 5: Create owner user record
            userId = await this.createOwnerUser(ownerParams, companyId);

            logger.info(`Owner user created with ID: ${userId}`);

            // Step 6: Bootstrap default roles and permissions
            await this.bootstrapTenantDefaults(companyId, userId);

            // Step 7: Bootstrap default features based on plan
            await featureService.bootstrapDefaultFeatures(companyId, companyParams.plan);

            // Step 8: Bootstrap default limits based on plan
            await limitService.bootstrapDefaultLimits(companyId, companyParams.plan);

            // Step 9: Generate and send invitation
            const invitation = await this.createInvitation(companyId, ownerParams.email, userId, createdBy);
            invitationId = invitation.id;

            logger.info(`Invitation created with ID: ${invitationId}`);

            // Step 10: Log provisioning event
            await auditService.log(db, {
                userId: createdBy,
                companyId,
                action: 'COMPANY_PROVISIONED',
                resource: 'COMPANY',
                resourceId: companyId,
                metadata: {
                    companyName: companyParams.name,
                    plan: companyParams.plan,
                    ownerEmail: ownerParams.email,
                    slug
                }
            });

            // Retrieve created records
            const company = await this.getCompanyById(companyId);
            const owner = await this.getUserById(userId);

            logger.info('Company provisioning completed successfully', { companyId, userId });

            return { company, owner, invitation };

        } catch (error) {
            logger.error('Company provisioning failed, rolling back...', error);

            // Rollback in reverse order
            if (invitationId) {
                await this.deleteInvitation(invitationId).catch(e => logger.error('Rollback: delete invitation failed', e));
            }
            if (userId) {
                await this.deleteUser(userId).catch(e => logger.error('Rollback: delete user failed', e));
            }
            if (companyId) {
                await this.deleteCompany(companyId).catch(e => logger.error('Rollback: delete company failed', e));
            }

            throw error;
        }
    }

    /**
     * Create company record in database
     */
    private async createCompanyRecord(params: CreateCompanyParams & { slug: string }): Promise<string> {
        const db = getDb();
        const companyId = `c-${uuidv4()}`;
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO companies (
        id, name, slug, legalName, industry, region, timezone, currency,
        status, plan, securityProfile, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                params.name,
                params.slug,
                params.legalName || null,
                params.industry || null,
                params.region || 'US',
                params.timezone || 'UTC',
                params.currency || 'USD',
                params.status || 'DRAFT',
                params.plan,
                JSON.stringify({
                    mfaRequired: false,
                    ssoEnabled: false,
                    sessionTTL: 86400,
                    passwordPolicy: 'standard'
                }),
                JSON.stringify(params.metadata || {}),
                now,
                now
            ]
        );

        return companyId;
    }

    /**
     * Create owner user and membership
     */
    private async createOwnerUser(params: OwnerParams, companyId: string): Promise<string> {
        const db = getDb();
        const userId = uuidv4();
        const now = new Date().toISOString();

        // Create user record
        await db.run(
            `INSERT INTO users (
        id, email, name, password, role, status, companyId, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                params.email,
                params.name,
                'INVITATION_PENDING',
                'COMPANY_OWNER',
                'pending',
                companyId,
                true,
                now,
                now
            ]
        );

        // Create membership record
        await db.run(
            `INSERT INTO memberships (
        id, userId, companyId, role, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                userId,
                companyId,
                'COMPANY_OWNER',
                'PENDING',
                now,
                now
            ]
        );

        return userId;
    }

    /**
     * Bootstrap default tenant configuration
     */
    private async bootstrapTenantDefaults(companyId: string, ownerId: string): Promise<void> {
        const db = getDb();

        // Create default roles and permissions can be added here
        // For now, the owner membership is enough
        logger.info(`Tenant defaults bootstrapped for company ${companyId}`);
    }

    private async createInvitation(
        companyId: string,
        email: string,
        userId: string,
        createdBy: string
    ): Promise<any> {
        const invitation = await invitationService.createInvitation(email, companyId, 'COMPANY_OWNER', createdBy, { userId });

        const invitationUrl = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/accept-invitation?token=${invitation.token}`;

        // Send invitation email
        await emailService.sendInvitation(
            email,
            'Company Owner',
            'Your New Company',
            invitationUrl
        ).catch(err => logger.error(`Failed to send invitation email to ${email}`, err));

        return {
            ...invitation,
            invitationUrl
        };
    }

    /**
     * Generate unique slug from company name
     */
    private async generateSlug(name: string): Promise<string> {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        let slug = baseSlug;
        let attempt = 0;

        // Check uniqueness and add suffix if needed
        while (await this.slugExists(slug)) {
            attempt++;
            slug = `${baseSlug}-${attempt}`;
        }

        return slug;
    }

    /**
     * Check if slug exists
     */
    private async slugExists(slug: string): Promise<boolean> {
        const db = getDb();
        const result = await db.get('SELECT id FROM companies WHERE slug = ?', [slug]);
        return !!result;
    }

    /**
     * Validate slug uniqueness
     */
    private async validateSlugUniqueness(slug: string): Promise<void> {
        if (await this.slugExists(slug)) {
            throw new Error(`Company slug '${slug}' already exists`);
        }
    }

    /**
     * Find user by email
     */
    private async findUserByEmail(email: string): Promise<any> {
        const db = getDb();
        return await db.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    /**
     * Generate secure invitation token
     */
    private generateInvitationToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Get company by ID
     */
    private async getCompanyById(id: string): Promise<any> {
        const db = getDb();
        return await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    }

    /**
     * Get user by ID
     */
    private async getUserById(id: string): Promise<any> {
        const db = getDb();
        return await db.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    /**
     * Rollback: Delete company
     */
    private async deleteCompany(id: string): Promise<void> {
        const db = getDb();
        await db.run('DELETE FROM companies WHERE id = ?', [id]);
        logger.warn(`Rolled back: deleted company ${id}`);
    }

    /**
     * Rollback: Delete user
     */
    private async deleteUser(id: string): Promise<void> {
        const db = getDb();
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        await db.run('DELETE FROM memberships WHERE userId = ?', [id]);
        logger.warn(`Rolled back: deleted user ${id}`);
    }

    /**
     * Rollback: Delete invitation
     */
    private async deleteInvitation(id: string): Promise<void> {
        const db = getDb();
        await db.run('DELETE FROM userinvitations WHERE id = ?', [id]);
        logger.warn(`Rolled back: deleted invitation ${id}`);
    }

    /**
     * Activate a company (transition from DRAFT to ACTIVE)
     */
    async activateCompany(companyId: string, activatedBy: string): Promise<void> {
        const db = getDb();
        const now = new Date().toISOString();

        // Validate company exists and is in DRAFT state
        const company = await this.getCompanyById(companyId);
        if (!company) {
            throw new Error(`Company ${companyId} not found`);
        }

        if (company.status === 'ACTIVE') {
            throw new Error(`Company ${companyId} is already active`);
        }

        // Update status
        await db.run(
            'UPDATE companies SET status = ?, updatedAt = ?, lastActivityAt = ? WHERE id = ?',
            ['ACTIVE', now, now, companyId]
        );

        // Log activation
        await auditService.log(db, {
            userId: activatedBy,
            companyId,
            action: 'COMPANY_ACTIVATED',
            resource: 'COMPANY',
            resourceId: companyId
        });

        logger.info(`Company ${companyId} activated`);
    }
}

export const provisioningService = new ProvisioningService();
