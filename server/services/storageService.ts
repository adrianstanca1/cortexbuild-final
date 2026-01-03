import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class LocalFileAdapter {
    async upload(bucket: string, filePath: string, fileBuffer: Buffer) {
        const fullPath = path.join(UPLOADS_DIR, bucket, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(fullPath, fileBuffer);
        return { data: { path: `${bucket}/${filePath}` }, error: null };
    }

    getPublicUrl(bucket: string, filePath: string) {
        return { data: { publicUrl: `/uploads/${bucket}/${filePath}` } };
    }
}

const localAdapter = new LocalFileAdapter();

import { getSupabaseAdmin, supabaseAdmin } from '../utils/supabase.js';

let supabase: any = supabaseAdmin || null;

if (!supabase) {
    logger.warn('Supabase admin client not available. Falling back to local filesystem storage.');
    supabase = {
        storage: {
            from: (bucket: string) => ({
                upload: async (path: string, file: Buffer) => localAdapter.upload(bucket, path, file),
                createSignedUrl: async (path: string) => ({ data: { signedUrl: `/uploads/${bucket}/${path}` }, error: null }),
                remove: async () => ({ error: null })
            }),
            createBucket: async (name: string) => ({ data: { name }, error: null }),
            getBucket: async (name: string) => ({ data: null, error: { message: 'Not found' } })
        }
    };
} else {
    // If a client wasn't exported at import time, attempt a factory call
    if (!supabase.storage && typeof getSupabaseAdmin === 'function') {
        const maybe = getSupabaseAdmin();
        if (maybe) supabase = maybe;
    }
}

/**
 * Creates a dedicated storage bucket for a tenant
 */
export const createTenantBucket = async (tenantId: string) => {
    const bucketName = `tenant-${tenantId}`;
    logger.info(`Provisioning storage bucket: ${bucketName}`);

    const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    });

    if (error && error.message !== 'Bucket already exists') {
        logger.error('Failed to create tenant bucket:', error);
        return { error };
    }

    return { data, error: null };
};

/**
 * Ensures a tenant bucket exists, creating it if necessary
 */
export const ensureTenantBucket = async (tenantId: string) => {
    const bucketName = `tenant-${tenantId}`;
    const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName);

    if (getError || !bucket) {
        return createTenantBucket(tenantId);
    }

    return { data: bucket, error: null };
};

export const uploadFile = async (
    bucket: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    pathPrefix: string = ''
): Promise<{ path: string; url: string | null; error: any }> => {
    try {
        const fileExt = originalName.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            logger.error('Supabase Upload Error:', error);
            return { path: '', url: null, error };
        }

        return { path: data.path, url: null, error: null };
    } catch (e) {
        logger.error('Storage Service Exception:', e);
        return { path: '', url: null, error: e };
    }
};

export const getSignedUrl = async (bucket: string, path: string, expiresIn: number = 3600) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        logger.error('Get Signed URL Error:', error);
        throw error;
    }
    return data.signedUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        logger.error('Delete File Error:', error);
        throw error;
    }
    return data;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const extractDocumentData = async (
    fileBuffer: Buffer,
    mimeType: string,
    promptType: 'invoice' | 'rfi' | 'general' = 'general'
) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key missing for OCR');
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const part = {
            inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType
            }
        };

        const prompts = {
            invoice: 'Extract data from this invoice: vendor name, invoice date, amount due, and line items. Return JSON.',
            rfi: 'Extract data from this RFI document: subject, question, assigned to, and due date. Return JSON.',
            general: 'Extract the most important structured data from this construction document. Return JSON.'
        };

        const result = await model.generateContent([prompts[promptType], part]);
        const response = await result.response;
        const text = response.text();

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { text };
    } catch (error) {
        logger.error('OCR Extraction Error:', error);
    }
};

// ============================================
// COMPANY-SPECIFIC STORAGE MANAGEMENT
// ============================================

import { getDb } from '../database.js';

const STORAGE_ROOT = process.env.STORAGE_ROOT || './storage';

export interface CompanyStorageStats {
    companyId: string;
    bucketPath: string;
    storageUsed: number;
    storageQuota: number;
    usagePercentage: number;
    fileCount: number;
}

/**
 * Create a dedicated storage bucket for a company
 */
export const createCompanyBucket = async (companyId: string, quotaGB: number = 10): Promise<string> => {
    const bucketPath = path.join(STORAGE_ROOT, `company-${companyId}`);
    const quotaBytes = quotaGB * 1024 * 1024 * 1024;

    try {
        // Create main bucket directory
        if (!fs.existsSync(bucketPath)) {
            fs.mkdirSync(bucketPath, { recursive: true });
        }

        // Create subdirectories for organization
        const subdirs = ['projects', 'documents', 'invoices', 'images', 'uploads', 'uploads/temp'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(bucketPath, subdir);
            if (!fs.existsSync(subdirPath)) {
                fs.mkdirSync(subdirPath, { recursive: true });
            }
        }

        // Record in database
        const db = getDb();
        await db.run(
            `INSERT INTO company_storage (id, companyId, bucketName, bucketType, storageQuota, storageUsed, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                `storage-${companyId}`,
                companyId,
                bucketPath,
                'local',
                quotaBytes,
                0,
                new Date().toISOString()
            ]
        );

        logger.info(`Storage bucket created for company ${companyId}: ${bucketPath}`);
        return bucketPath;
    } catch (error) {
        logger.error(`Failed to create storage bucket for company ${companyId}:`, error);
        throw error;
    }
};

/**
 * Get the bucket path for a company
 */
export const getCompanyBucketPath = (companyId: string): string => {
    return path.join(STORAGE_ROOT, `company-${companyId}`);
};

/**
 * Calculate directory size recursively
 */
const calculateDirectorySize = (dirPath: string): number => {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            totalSize += calculateDirectorySize(filePath);
        } else {
            totalSize += stats.size;
        }
    }

    return totalSize;
};

/**
 * Count files in directory recursively
 */
const countFiles = (dirPath: string): number => {
    let count = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            count += countFiles(filePath);
        } else {
            count++;
        }
    }

    return count;
};

/**
 * Get storage statistics for a company
 */
export const getCompanyStorageStats = async (companyId: string): Promise<CompanyStorageStats> => {
    const db = getDb();
    const bucketPath = getCompanyBucketPath(companyId);

    const storageRecord = await db.get(
        'SELECT * FROM company_storage WHERE companyId = ?',
        [companyId]
    );

    if (!storageRecord) {
        throw new Error(`No storage bucket found for company ${companyId}`);
    }

    const actualUsage = calculateDirectorySize(bucketPath);
    const fileCount = countFiles(bucketPath);

    // Update database with actual usage
    await db.run(
        'UPDATE company_storage SET storageUsed = ? WHERE companyId = ?',
        [actualUsage, companyId]
    );

    return {
        companyId,
        bucketPath: storageRecord.bucketName,
        storageUsed: actualUsage,
        storageQuota: storageRecord.storageQuota,
        usagePercentage: (actualUsage / storageRecord.storageQuota) * 100,
        fileCount
    };
};

/**
 * Check if company has available storage for upload
 */
export const hasAvailableStorage = async (companyId: string, requiredBytes: number): Promise<boolean> => {
    const stats = await getCompanyStorageStats(companyId);
    return (stats.storageUsed + requiredBytes) <= stats.storageQuota;
};

/**
 * Save file to company bucket
 */
export const saveToCompanyBucket = async (
    companyId: string,
    file: Buffer,
    destinationPath: string
): Promise<string> => {
    const bucketPath = getCompanyBucketPath(companyId);
    const fullPath = path.join(bucketPath, destinationPath);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Check storage quota
    const hasSpace = await hasAvailableStorage(companyId, file.length);

    if (!hasSpace) {
        throw new Error('Storage quota exceeded for company');
    }

    // Write file
    fs.writeFileSync(fullPath, file);

    logger.info(`File saved to company ${companyId} bucket: ${destinationPath}`);
    return destinationPath;
};

/**
 * Delete file from company bucket
 */
export const deleteFromCompanyBucket = async (companyId: string, filePath: string): Promise<void> => {
    const bucketPath = getCompanyBucketPath(companyId);
    const fullPath = path.join(bucketPath, filePath);

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`File deleted from company ${companyId} bucket: ${filePath}`);
    }
};

/**
 * Delete entire company bucket
 */
export const deleteCompanyBucket = async (companyId: string): Promise<void> => {
    const bucketPath = getCompanyBucketPath(companyId);

    try {
        if (fs.existsSync(bucketPath)) {
            fs.rmSync(bucketPath, { recursive: true, force: true });
        }

        const db = getDb();
        await db.run('DELETE FROM company_storage WHERE companyId = ?', [companyId]);

        logger.info(`Storage bucket deleted for company ${companyId}`);
    } catch (error) {
        logger.error(`Failed to delete storage bucket for company ${companyId}:`, error);
        throw error;
    }
};

/**
 * Update storage quota for a company
 */
export const updateCompanyStorageQuota = async (companyId: string, quotaGB: number): Promise<void> => {
    const quotaBytes = quotaGB * 1024 * 1024 * 1024;
    const db = getDb();

    await db.run(
        'UPDATE company_storage SET storageQuota = ? WHERE companyId = ?',
        [quotaBytes, companyId]
    );

    logger.info(`Storage quota updated for company ${companyId}: ${quotaGB}GB`);
};

