import { Request, Response, NextFunction } from 'express';
import { companyProvisioningService } from '../services/companyProvisioningService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * ProvisioningController - Handles company provisioning API endpoints
 */
export class ProvisioningController {
    /**
     * POST /api/provisioning/companies
     * Create a new company with owner
     */
    async createCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                company,
                owner
            } = req.body;

            // Validation
            if (!company || !company.name || !company.plan) {
                throw new AppError('Company name and plan are required', 400);
            }

            if (!owner || !owner.email || !owner.name) {
                throw new AppError('Owner email and name are required', 400);
            }

            // Create company using the new service workflow (Invitation First)
            const result = await companyProvisioningService.initiateProvisioning({
                name: company.name,
                ownerEmail: owner.email,
                ownerName: owner.name,
                plan: company.plan,
            });

            logger.info('Company provisioned successfully', {
                companyId: result.companyId,
                companyName: company.name
            });

            res.status(201).json({
                success: true,
                data: {
                    company: {
                        id: result.companyId,
                        name: company.name,
                        status: result.status
                    },
                    owner: {
                        id: null, // Owner user not created yet
                        email: owner.email,
                        name: owner.name
                    },
                    invitation: result.invitation
                }
            });

        } catch (error: any) {
            logger.error('Failed to provision company:', error);
            if (error.message.includes('already exists')) {
                return next(new AppError(error.message, 409));
            }
            next(error);
        }
    }

    /**
     * POST /api/provisioning/companies/:id/activate
     * Activate a company (transition from DRAFT to ACTIVE)
     */
    async activateCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const activatedBy = (req as any).context?.userId || 'SYSTEM';

            await companyProvisioningService.activateCompany(id, activatedBy);

            res.json({
                success: true,
                message: `Company ${id} activated successfully`
            });

        } catch (error: any) {
            logger.error('Failed to activate company:', error);
            next(new AppError(error.message, 400));
        }
    }
}

export const provisioningController = new ProvisioningController();
