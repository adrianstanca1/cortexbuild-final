import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '../database.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { SharedLink } from '../types.js';
import { TenantDatabaseFactory } from '../services/tenantDatabaseFactory.js';

/**
 * Client Portal Controller
 * Handles share link generation, validation, and client access to projects
 */

/**
 * Generate a secure share link for a project
 */
export const generateShareLink = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { projectId } = req.params;
        const { expiresIn = 30, password } = req.body; // expiresIn: days

        if (!userId || !tenantId) {
            throw new AppError('Authentication required', 401);
        }

        // Verify project exists in TENANT DB
        const tenantDb = req.tenantDb;
        if (!tenantDb) throw new AppError('Tenant connection failed', 500);

        const project = await tenantDb.get(
            'SELECT id, companyId FROM projects WHERE id = ? AND companyId = ?',
            [projectId, tenantId]
        );

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Generate cryptographically secure token
        const token = randomBytes(32).toString('hex'); // 64 character hex string

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);

        // Hash password if provided
        let hashedPassword: string | undefined;
        if (password) {
            hashedPassword = createHash('sha256').update(password).digest('hex');
        }

        // Create share link record in PLATFORM DB (Global Registry)
        const platformDb = getDb();
        const id = uuidv4();
        const sharedLink: SharedLink = {
            id,
            projectId,
            companyId: tenantId,
            token,
            password: hashedPassword,
            expiresAt: expiresAt.toISOString(),
            createdBy: userId,
            createdAt: new Date().toISOString(),
            accessCount: 0,
            isActive: true,
        };

        await platformDb.run(
            `INSERT INTO shared_links (id, projectId, companyId, token, password, expiresAt, createdBy, createdAt, accessCount, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sharedLink.id,
                sharedLink.projectId,
                sharedLink.companyId,
                sharedLink.token,
                sharedLink.password || null,
                sharedLink.expiresAt,
                sharedLink.createdBy,
                sharedLink.createdAt,
                sharedLink.accessCount,
                sharedLink.isActive ? 1 : 0
            ]
        );

        logger.info(`Share link generated for project ${projectId} by user ${userId}`);

        res.status(201).json({
            success: true,
            data: {
                ...sharedLink,
                password: undefined, // Don't send hashed password back
                shareUrl: `${req.protocol}://${req.get('host')}/client-portal/${token}`
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all share links for a project
 */
export const getProjectShareLinks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { projectId } = req.params;

        if (!userId || !tenantId) {
            throw new AppError('Authentication required', 401);
        }

        // Get links from PLATFORM DB
        const db = getDb();
        const links = await db.all<SharedLink>(
            `SELECT id, projectId, companyId, token, expiresAt, createdBy, createdAt, lastAccessedAt, accessCount, isActive
             FROM shared_links
             WHERE projectId = ? AND companyId = ?
             ORDER BY createdAt DESC`,
            [projectId, tenantId]
        );

        res.json({ success: true, data: links });
    } catch (error) {
        next(error);
    }
};

/**
 * Revoke a share link
 */
export const revokeShareLink = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { userId, tenantId } = req.context;
        const { linkId } = req.params;

        if (!userId || !tenantId) {
            throw new AppError('Authentication required', 401);
        }

        // Update in PLATFORM DB
        const db = getDb();
        const result = await db.run(
            'UPDATE shared_links SET isActive = 0 WHERE id = ? AND companyId = ?',
            [linkId, tenantId]
        );

        if (result.changes === 0) {
            throw new AppError('Share link not found', 404);
        }

        logger.info(`Share link ${linkId} revoked by user ${userId}`);

        res.json({ success: true, message: 'Share link revoked successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate share token and return project data (PUBLIC ROUTE - No Auth)
 */
export const validateShareToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const db = getDb();
        const link = await db.get<SharedLink>(
            'SELECT * FROM shared_links WHERE token = ?',
            [token]
        );

        if (!link) {
            throw new AppError('Invalid share link', 404);
        }

        // Check if link is active
        if (!link.isActive) {
            throw new AppError('This share link has been revoked', 403);
        }

        // Check if link is expired
        if (new Date(link.expiresAt) < new Date()) {
            throw new AppError('This share link has expired', 403);
        }

        // Verify password if required
        if (link.password) {
            if (!password) {
                return res.status(401).json({
                    success: false,
                    requiresPassword: link.password ? true : false,
                    message: 'Password required'
                });
            }

            const hashedPassword = createHash('sha256').update(password).digest('hex');
            if (hashedPassword !== link.password) {
                throw new AppError('Invalid password', 401);
            }
        }

        // Update access tracking
        await db.run(
            'UPDATE shared_links SET accessCount = accessCount + 1, lastAccessedAt = ? WHERE id = ?',
            [new Date().toISOString(), link.id]
        );

        // Attach validated link to request for next middleware
        req.sharedLink = link;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Get shared project details (PUBLIC ROUTE - No Auth, Token Validated)
 */
export const getSharedProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const link = req.sharedLink;
        if (!link) {
            throw new AppError('Invalid access', 401);
        }

        // CONNECT TO TENANT DB
        const tenantDb = await TenantDatabaseFactory.getInstance().getTenantDatabase(link.companyId);

        const project = await tenantDb.get(
            `SELECT id, name, description, status, progress, startDate, endDate, image, location
             FROM projects
             WHERE id = ? AND companyId = ?`,
            [link.projectId, link.companyId]
        );

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shared project documents (PUBLIC ROUTE - No Auth, Token Validated)
 */
export const getSharedDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const link = req.sharedLink;
        if (!link) {
            throw new AppError('Invalid access', 401);
        }

        // CONNECT TO TENANT DB
        const tenantDb = await TenantDatabaseFactory.getInstance().getTenantDatabase(link.companyId);

        const documents = await tenantDb.all(
            `SELECT id, name, type, size, date, url, currentVersion
             FROM documents
             WHERE projectId = ? AND companyId = ?
             ORDER BY date DESC`,
            [link.projectId, link.companyId]
        );

        res.json({ success: true, data: documents });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shared project photos (PUBLIC ROUTE - No Auth, Token Validated)
 */
export const getSharedPhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const link = req.sharedLink;
        if (!link) {
            throw new AppError('Invalid access', 401);
        }

        // CONNECT TO TENANT DB
        const tenantDb = await TenantDatabaseFactory.getInstance().getTenantDatabase(link.companyId);

        const photos = await tenantDb.all(
            `SELECT id, name, url, date
             FROM documents
             WHERE projectId = ? AND companyId = ? AND type = 'Image'
             ORDER BY date DESC`,
            [link.projectId, link.companyId]
        );

        res.json({ success: true, data: photos });
    } catch (error) {
        next(error);
    }
};

// Type augmentation for Express Request
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            sharedLink?: SharedLink;
        }
    }
}
