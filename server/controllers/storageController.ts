import { Request, Response, NextFunction } from 'express';
import {
    getCompanyStorageStats,
    updateCompanyStorageQuota,
    getCompanyBucketPath
} from '../services/storageService.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get storage statistics for current company
 */
export const getStorageUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).context?.companyId;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID not found' });
        }

        const stats = await getCompanyStorageStats(companyId);

        res.json({
            success: true,
            storage: {
                used: stats.storageUsed,
                usedMB: (stats.storageUsed / 1024 / 1024).toFixed(2),
                usedGB: (stats.storageUsed / 1024 / 1024 / 1024).toFixed(2),
                quota: stats.storageQuota,
                quotaGB: (stats.storageQuota / 1024 / 1024 / 1024).toFixed(2),
                percentage: stats.usagePercentage.toFixed(1),
                fileCount: stats.fileCount,
                available: stats.storageQuota - stats.storageUsed,
                availableGB: ((stats.storageQuota - stats.storageUsed) / 1024 / 1024 / 1024).toFixed(2)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List files in company bucket
 */
export const listCompanyFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).context?.companyId;
        const { subPath = '' } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID not found' });
        }

        const bucketPath = getCompanyBucketPath(companyId);
        const targetPath = path.join(bucketPath, String(subPath));

        // Security check: prevent directory traversal
        if (!targetPath.startsWith(bucketPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(targetPath)) {
            return res.json({ success: true, files: [] });
        }

        const files = fs.readdirSync(targetPath);
        const fileInfos = files.map(file => {
            const filePath = path.join(targetPath, file);
            const stats = fs.statSync(filePath);

            return {
                name: file,
                path: path.relative(bucketPath, filePath),
                size: stats.size,
                sizeMB: (stats.size / 1024 / 1024).toFixed(2),
                type: stats.isDirectory() ? 'directory' : 'file',
                modifiedAt: stats.mtime.toISOString()
            };
        });

        res.json({
            success: true,
            files: fileInfos,
            currentPath: String(subPath),
            totalFiles: fileInfos.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update storage quota (SuperAdmin only)
 */
export const updateStorageQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;
        const { quotaGB } = req.body;

        if (!quotaGB || quotaGB < 1) {
            return res.status(400).json({ error: 'Invalid quota value' });
        }

        await updateCompanyStorageQuota(companyId, quotaGB);

        logger.info(`Storage quota updated for company ${companyId}: ${quotaGB}GB by ${(req as any).userName}`);

        res.json({
            success: true,
            message: `Storage quota updated to ${quotaGB}GB`,
            quotaGB
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get company storage statistics (SuperAdmin)
 */
export const getCompanyStorage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { companyId } = req.params;

        const stats = await getCompanyStorageStats(companyId);

        res.json({
            success: true,
            storage: {
                companyId: stats.companyId,
                bucketPath: stats.bucketPath,
                used: stats.storageUsed,
                usedGB: (stats.storageUsed / 1024 / 1024 / 1024).toFixed(2),
                quota: stats.storageQuota,
                quotaGB: (stats.storageQuota / 1024 / 1024 / 1024).toFixed(2),
                percentage: stats.usagePercentage.toFixed(1),
                fileCount: stats.fileCount
            }
        });
    } catch (error) {
        next(error);
    }
};
