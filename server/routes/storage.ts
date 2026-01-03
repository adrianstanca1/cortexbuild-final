
import express from 'express';
import multer from 'multer';
import { uploadFile, getSignedUrl, deleteFile } from '../services/storageService.js';
import { logger } from '../utils/logger.js';

import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Memory storage for multer (files are uploaded to Supabase immediately)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// POST /api/storage/upload
router.post('/upload', requirePermission('documents', 'create'), upload.single('file'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // --- Phase 10: Enforce Tenant Isolation ---
        const tenantId = req.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant context required for storage operations' });
        }

        const bucket = `tenant-${tenantId}`;
        const pathPrefix = req.body.pathPrefix || '';

        logger.info(`Uploading file ${req.file.originalname} to tenant bucket ${bucket}`);

        const { path, error } = await uploadFile(
            bucket,
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
            pathPrefix
        );

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Get signed URL for immediate display
        let signedUrl = null;
        try {
            signedUrl = await getSignedUrl(bucket, path);
        } catch (err) {
            logger.warn('Failed to generate signed URL after upload', err);
        }

        res.json({ success: true, path, bucket, url: signedUrl });
    } catch (e: any) {
        logger.error('Upload Route Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/storage/url
router.get('/url', async (req: any, res: any) => {
    try {
        const { bucket, path } = req.query;
        if (!bucket || !path) {
            return res.status(400).json({ error: 'Bucket and path are required' });
        }

        const signedUrl = await getSignedUrl(bucket as string, path as string);
        res.json({ signedUrl });
    } catch (e: any) {
        logger.error('Signed URL Route Error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
