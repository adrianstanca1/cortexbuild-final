import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { fileBucket } from '../buckets/FileBucket.js';
import { BucketRegistry } from '../buckets/DataBucket.js';
import { AppError } from '../utils/AppError.js';
import { WorkflowService } from '../services/workflowService.js';
import { auditService } from '../services/auditService.js';
import { getDb } from '../database.js';

/**
 * Document Controller
 * Handles document upload, download, and management with tenant isolation
 */

const documentBucket = BucketRegistry.getOrCreate('documents', 'companyId');

/**
 * Upload document
 */
export const uploadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId, userId } = req.context;

        if (!tenantId || !userId) {
            throw new AppError('Authentication required', 401);
        }
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        // In a real implementation, this would use multer or similar
        // For now, we'll assume file data is in req.body
        const { filename, content, projectId, category } = req.body;

        if (!filename || !content) {
            throw new AppError('Filename and content required', 400);
        }

        // Upload file with tenant namespacing
        const { path, url } = await fileBucket.upload(
            tenantId,
            filename,
            Buffer.from(content, 'base64'),
            userId,
            { projectId, category: category || 'documents' },
            db
        );

        // Store document metadata in database
        const document = await documentBucket.create(
            tenantId,
            {
                id: `doc-${Date.now()}`,
                filename,
                path,
                url,
                projectId,
                category: category || 'documents',
                uploadedBy: userId,
                uploadedAt: new Date().toISOString(),
                size: Buffer.from(content, 'base64').length,
            },
            userId,
            db
        );

        // Log action & Activity
        await auditService.logRequest(req, 'UPLOAD_DOCUMENT', 'Document', document.id, { filename });
        await auditService.logActivityRequest(req, projectId || null, 'uploaded', 'Document', document.id, { filename });

        res.status(201).json({ success: true, data: document });
    } catch (error) {
        next(error);
    }
};

/**
 * Get documents for tenant
 */
export const getDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { projectId, category } = req.query;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const filters: any = {};
        if (projectId) filters.projectId = projectId;
        if (category) filters.category = category;

        const documents = await documentBucket.query(tenantId, filters, {
            orderBy: 'uploadedAt',
            orderDirection: 'DESC',
        }, db);

        // This block is also clearly for a safety controller, not document controller.
        // Placing it as requested, but it will cause errors due to undefined variables.
        // If this is for a safety controller, please provide that file.
        // If it's meant to be here, the variables need to be defined.
        /*
        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_SAFETY_HAZARD', 'SafetyHazard', id, updates); // id, updates not defined
        await auditService.logActivityRequest(req, updatedHazard?.projectId || null, 'updated safety hazard', 'SafetyHazard', id, { updates }); // updatedHazard, id, updates not defined

        res.json({ success: true, data: updatedHazard }); // updatedHazard not defined
        */

        res.json(Array.isArray(documents) ? documents : []);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single document
 */
export const getDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { id } = req.params;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        const document = await documentBucket.getById(tenantId, id, db);

        if (!document) {
            throw new AppError('Document not found', 404);
        }

        // This block is also clearly for a safety controller, not document controller.
        // Placing it as requested, but it will cause errors due to undefined variables.
        // If this is for a safety controller, please provide that file.
        // If it's meant to be here, the variables need to be defined.
        /*
        // Log action & Activity
        await auditService.logRequest(req, 'UPDATE_SAFETY_INCIDENT', 'SafetyIncident', id, updates); // id, updates not defined
        await auditService.logActivityRequest(req, updatedIncident?.projectId || null, 'updated safety incident', 'SafetyIncident', id, { updates }); // updatedIncident, id, updates not defined

        res.json({ success: true, data: updatedIncident }); // updatedIncident not defined
        */

        res.json({ success: true, data: document });
    } catch (error) {
        next(error);
    }
};

/**
 * Download document
 */
export const downloadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { id } = req.params;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        // Get document metadata
        const document = await documentBucket.getById(tenantId, id, db);

        if (!document) {
            throw new AppError('Document not found', 404);
        }

        // Download file content
        const content = await fileBucket.download(
            tenantId,
            document.filename,
            { projectId: document.projectId, category: document.category }
        );

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
        res.send(content);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete document
 */
export const deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId, userId } = req.context;
        const { id } = req.params;

        if (!tenantId || !userId) {
            throw new AppError('Authentication required', 401);
        }
        const db = req.tenantDb;
        if (!db) throw new AppError('Tenant connection failed', 500);

        // Get document metadata
        const document = await documentBucket.getById(tenantId, id, db);

        if (!document) {
            throw new AppError('Document not found', 404);
        }

        // Delete file from storage
        await fileBucket.delete(
            tenantId,
            document.filename,
            userId,
            { projectId: document.projectId, category: document.category },
            db
        );

        // Delete document metadata
        await documentBucket.delete(tenantId, id, userId, db);

        // Log action & Activity
        await auditService.logRequest(req, 'DELETE_DOCUMENT', 'Document', id, { filename: document.filename });
        await auditService.logActivityRequest(req, document.projectId || null, 'deleted', 'Document', id, { filename: document.filename });

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * List files in directory
 */
export const listFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context;
        const { projectId, category } = req.query;

        if (!tenantId) {
            throw new AppError('Tenant ID required', 401);
        }

        const files = await fileBucket.list(tenantId, {
            projectId: projectId as string,
            category: category as string,
        });

        res.json(Array.isArray(files) ? files : []);
    } catch (error) {
        next(error);
    }
};
