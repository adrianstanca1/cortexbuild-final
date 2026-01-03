import { Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage Isolation Middleware
 * Enforces strict tenant boundaries in file storage operations
 */

interface StorageQuota {
    companyId: string;
    maxBytes: number;
    usedBytes: number;
}

/**
 * Validate tenant access to file path
 */
export const validateFileAccess = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { tenantId, userId, isSuperadmin } = req.context || {};
        const filePath = req.params.filePath || req.body.filePath || req.query.filePath;

        if (!filePath) {
            return res.status(400).json({ error: 'File path required' });
        }

        // SUPERADMIN bypass (with audit)
        if (isSuperadmin) {
            await auditFileAccess(userId, tenantId, 'SUPERADMIN_FILE_ACCESS', filePath, 'warning');
            return next();
        }

        // Validate file belongs to user's tenant
        const fileCompanyId = extractCompanyIdFromPath(filePath);

        if (!fileCompanyId) {
            await auditFileAccess(userId, tenantId, 'INVALID_FILE_PATH', filePath, 'warning');
            return res.status(400).json({ error: 'Invalid file path' });
        }

        if (fileCompanyId !== tenantId) {
            await auditFileAccess(userId, tenantId, 'CROSS_TENANT_FILE_ACCESS', filePath, 'critical');
            return res.status(403).json({ error: 'Access denied: File belongs to different tenant' });
        }

        // Prevent path traversal
        if (containsPathTraversal(filePath)) {
            await auditFileAccess(userId, tenantId, 'PATH_TRAVERSAL_ATTEMPT', filePath, 'critical');
            return res.status(403).json({ error: 'Invalid file path: Path traversal detected' });
        }

        next();
    } catch (error) {
        logger.error('File access validation error:', error);
        res.status(500).json({ error: 'Validation error' });
    }
};

/**
 * Enforce storage quota before upload
 */
export const enforceStorageQuota = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { tenantId, isSuperadmin } = req.context || {};

        if (!tenantId || isSuperadmin) {
            return next();
        }

        const fileSize = parseInt(req.headers['content-length'] || '0');

        if (fileSize === 0) {
            return next();
        }

        const quota = await getStorageQuota(tenantId);

        if (!quota) {
            // No quota set - allow
            return next();
        }

        if (quota.usedBytes + fileSize > quota.maxBytes) {
            await auditFileAccess(req.context.userId, tenantId, 'STORAGE_QUOTA_EXCEEDED', '', 'warning');
            return res.status(413).json({
                error: 'Storage quota exceeded',
                quota: quota.maxBytes,
                used: quota.usedBytes,
                requested: fileSize
            });
        }

        next();
    } catch (error) {
        logger.error('Storage quota enforcement error:', error);
        next(); // Don't block on error
    }
};

/**
 * Sanitize file path to prevent attacks
 */
export const sanitizeFilePath = (req: any, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.context || {};

        if (req.body.filePath) {
            req.body.filePath = sanitizePath(req.body.filePath, tenantId);
        }

        if (req.params.filePath) {
            req.params.filePath = sanitizePath(req.params.filePath, tenantId);
        }

        next();
    } catch (error) {
        logger.error('Path sanitization error:', error);
        res.status(400).json({ error: 'Invalid file path' });
    }
};

/**
 * Audit file operations
 */
export const auditFileOperation = (operation: 'UPLOAD' | 'DOWNLOAD' | 'DELETE') => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId } = req.context || {};
            const filePath = req.params.filePath || req.body.filePath;

            await auditFileAccess(userId, tenantId, `FILE_${operation}`, filePath, 'info');

            next();
        } catch (error) {
            logger.error('File operation audit error:', error);
            next();
        }
    };
};

/**
 * Helper: Extract company ID from file path
 */
function extractCompanyIdFromPath(filePath: string): string | null {
    // Expected format: /storage/{companyId}/...
    const match = filePath.match(new RegExp('^/storage/([^/]+)'));
    return match ? match[1] : null;
}

/**
 * Helper: Check for path traversal attempts
 */
function containsPathTraversal(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    return normalized.includes('..') ||
        filePath.includes('../') ||
        filePath.includes('..\\') ||
        normalized !== filePath;
}

/**
 * Helper: Sanitize path
 */
function sanitizePath(filePath: string, companyId: string): string {
    // Remove any path traversal attempts
    let sanitized = filePath.replace(/\.\./g, '');

    // Ensure path starts with /storage/{companyId}
    if (!sanitized.startsWith(`/storage/${companyId}`)) {
        sanitized = `/storage/${companyId}/${sanitized.replace(/^\/+/, '')}`;
    }

    // Normalize path
    sanitized = path.normalize(sanitized);

    return sanitized;
}

/**
 * Helper: Get storage quota for company
 */
async function getStorageQuota(companyId: string): Promise<StorageQuota | null> {
    try {
        const db = await getDb();
        const result = await db.get(
            `SELECT storageQuota as maxBytes, storageUsed as usedBytes 
       FROM companies WHERE id = ?`,
            [companyId]
        );

        if (!result) {
            return null;
        }

        return {
            companyId,
            maxBytes: result.maxBytes || 10737418240, // 10GB default
            usedBytes: result.usedBytes || 0
        };
    } catch (error) {
        logger.error('Get storage quota error:', error);
        return null;
    }
}

/**
 * Helper: Audit file access
 */
async function auditFileAccess(
    userId: string,
    companyId: string,
    action: string,
    filePath: string,
    severity: 'info' | 'warning' | 'critical'
) {
    try {
        const db = await getDb();
        await db.run(
            `INSERT INTO audit_logs (id, userId, companyId, action, resource, resourceId, severity, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crypto.randomUUID(),
                userId,
                companyId,
                action,
                'file_storage',
                filePath,
                severity,
                new Date().toISOString()
            ]
        );
    } catch (error) {
        logger.error('File access audit error:', error);
    }
}

/**
 * Composite storage protection middleware
 */
export const protectFileStorage = [
    sanitizeFilePath,
    validateFileAccess,
    enforceStorageQuota
];
