import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { getCompanyBucketPath, hasAvailableStorage } from '../services/storageService.js';
import { logger } from '../utils/logger.js';

/**
 * Company-specific multer storage configuration
 * Routes uploads to the correct company bucket
 */
const companyStorage = multer.diskStorage({
    destination: async (req: any, file, cb) => {
        try {
            const companyId = req.context?.companyId;

            if (!companyId) {
                return cb(new Error('Company ID not found in request context'), '');
            }

            // Get company bucket path
            const bucketPath = getCompanyBucketPath(companyId);

            // Determine subdirectory based on upload type
            let subdir = 'uploads';
            if (req.body.uploadType) {
                subdir = req.body.uploadType; // e.g., 'projects', 'documents', 'invoices'
            } else if (req.originalUrl.includes('/projects/')) {
                subdir = 'projects';
            } else if (req.originalUrl.includes('/documents/')) {
                subdir = 'documents';
            } else if (req.originalUrl.includes('/invoices/')) {
                subdir = 'invoices';
            }

            const uploadPath = path.join(bucketPath, subdir);

            cb(null, uploadPath);
        } catch (error) {
            logger.error('Error determining upload destination:', error);
            cb(error as Error, '');
        }
    },

    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
});

/**
 * Middleware to check storage quota before upload
 */
export const checkStorageQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).context?.companyId;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID not found' });
        }

        // Get file size from headers or estimate
        const contentLength = parseInt(req.headers['content-length'] || '0');

        if (contentLength === 0) {
            return next(); // Let multer handle the upload, we'll check after
        }

        // Check if company has available storage
        const hasSpace = await hasAvailableStorage(companyId, contentLength);

        if (!hasSpace) {
            return res.status(413).json({
                error: 'Storage quota exceeded',
                message: 'Your company has reached its storage limit. Please contact support to upgrade.'
            });
        }

        next();
    } catch (error) {
        logger.error('Storage quota check failed:', error);
        next(error);
    }
};

/**
 * Multer configuration for company uploads
 */
export const companyUpload = multer({
    storage: companyStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/zip',
            'application/x-zip-compressed'
        ];

        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});

/**
 * Middleware for single file upload to company bucket
 */
export const uploadSingleToCompany = (fieldName: string = 'file') => [
    checkStorageQuota,
    companyUpload.single(fieldName)
];

/**
 * Middleware for multiple file uploads to company bucket
 */
export const uploadMultipleToCompany = (fieldName: string = 'files', maxCount: number = 10) => [
    checkStorageQuota,
    companyUpload.array(fieldName, maxCount)
];

/**
 * Generic company file upload handler
 */
export const handleCompanyUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = (req as any).file;
        const files = (req as any).files;

        if (!file && !files) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const companyId = (req as any).context?.companyId;
        const uploadedFiles = files || [file];

        const result = uploadedFiles.map((f: any) => ({
            filename: f.filename,
            originalName: f.originalname,
            path: f.path,
            size: f.size,
            mimetype: f.mimetype,
            companyId
        }));

        res.json({
            success: true,
            files: result,
            message: `${uploadedFiles.length} file(s) uploaded successfully`
        });

        logger.info(`Files uploaded to company ${companyId} bucket:`, result.map((f: any) => f.filename));
    } catch (error) {
        next(error);
    }
};
