import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { auditService } from '../services/auditService.js';
import { IDatabase } from '../database.js';

/**
 * FileBucket - Tenant-scoped file storage abstraction
 * Implements path namespacing: /tenants/{tenantId}/projects/{projectId}/...
 * Prevents cross-tenant file access
 */

export interface FileMetadata {
    filename: string;
    size: number;
    mimeType: string;
    uploadedBy: string;
    uploadedAt: string;
}

export interface UploadOptions {
    projectId?: string;
    category?: string; // documents, photos, attachments, etc.
    metadata?: Record<string, any>;
}

export class FileBucket {
    private baseStoragePath: string;

    constructor(baseStoragePath?: string) {
        // Default to uploads directory
        this.baseStoragePath = baseStoragePath || path.join(process.cwd(), 'uploads');
    }

    /**
     * Generate namespaced path for tenant file
     * Pattern: /tenants/{tenantId}/projects/{projectId}/{category}/{filename}
     */
    getPath(
        tenantId: string,
        filename: string,
        options?: UploadOptions
    ): string {
        const parts = ['tenants', tenantId];

        if (options?.projectId) {
            parts.push('projects', options.projectId);
        }

        if (options?.category) {
            parts.push(options.category);
        }

        parts.push(filename);

        return path.join(this.baseStoragePath, ...parts);
    }

    /**
     * Get directory path for tenant
     */
    getDirectoryPath(tenantId: string, options?: UploadOptions): string {
        const parts = ['tenants', tenantId];

        if (options?.projectId) {
            parts.push('projects', options.projectId);
        }

        if (options?.category) {
            parts.push(options.category);
        }

        return path.join(this.baseStoragePath, ...parts);
    }

    /**
     * Ensure directory exists
     */
    private async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    }

    /**
     * Validate tenant access to file
     */
    private validatePath(tenantId: string, filePath: string): boolean {
        const normalizedPath = path.normalize(filePath);
        const tenantPath = path.join(this.baseStoragePath, 'tenants', tenantId);

        // Ensure path is within tenant directory (prevent path traversal)
        return normalizedPath.startsWith(tenantPath);
    }

    /**
     * Upload file with tenant namespacing
     */
    async upload(
        tenantId: string,
        filename: string,
        content: Buffer | string,
        userId: string,
        options?: UploadOptions,
        db?: IDatabase
    ): Promise<{ path: string; url: string }> {
        // Sanitize filename
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

        const filePath = this.getPath(tenantId, sanitizedFilename, options);

        // Validate path is within tenant directory
        if (!this.validatePath(tenantId, filePath)) {
            throw new Error('Invalid file path - access denied');
        }

        // Ensure directory exists
        const dirPath = path.dirname(filePath);
        await this.ensureDirectory(dirPath);

        // Write file
        await fs.writeFile(filePath, content);

        // Generate URL (relative to storage root)
        const relativePath = path.relative(this.baseStoragePath, filePath);
        const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;

        // Audit log
        if (db) {
            await auditService.log(db, {
                userId,
                companyId: tenantId,
                action: 'upload',
                resource: 'files',
                resourceId: sanitizedFilename,
                metadata: {
                    path: relativePath,
                    size: Buffer.isBuffer(content) ? content.length : content.length,
                    projectId: options?.projectId,
                    category: options?.category,
                },
            });
        }

        return { path: filePath, url };
    }

    /**
     * Download file (validates tenant access)
     */
    async download(
        tenantId: string,
        filename: string,
        options?: UploadOptions
    ): Promise<Buffer> {
        const filePath = this.getPath(tenantId, filename, options);

        // Validate path is within tenant directory
        if (!this.validatePath(tenantId, filePath)) {
            throw new Error('Invalid file path - access denied');
        }

        try {
            return await fs.readFile(filePath);
        } catch (error) {
            throw new Error('File not found or access denied');
        }
    }

    /**
     * Delete file (validates tenant access)
     */
    async delete(
        tenantId: string,
        filename: string,
        userId: string,
        options?: UploadOptions,
        db?: IDatabase
    ): Promise<boolean> {
        const filePath = this.getPath(tenantId, filename, options);

        // Validate path is within tenant directory
        if (!this.validatePath(tenantId, filePath)) {
            throw new Error('Invalid file path - access denied');
        }

        try {
            await fs.unlink(filePath);

            // Audit log
            if (db) {
                await auditService.log(db, {
                    userId,
                    companyId: tenantId,
                    action: 'delete',
                    resource: 'files',
                    resourceId: filename,
                    metadata: {
                        path: path.relative(this.baseStoragePath, filePath),
                        projectId: options?.projectId,
                        category: options?.category,
                    },
                });
            }

            return true;
        } catch (error) {
            throw new Error('File not found or access denied');
        }
    }

    /**
     * List files in tenant directory
     */
    async list(
        tenantId: string,
        options?: UploadOptions
    ): Promise<string[]> {
        const dirPath = this.getDirectoryPath(tenantId, options);

        // Validate path is within tenant directory
        if (!this.validatePath(tenantId, dirPath)) {
            throw new Error('Invalid directory path - access denied');
        }

        try {
            const files = await fs.readdir(dirPath);
            return files;
        } catch (error) {
            // Directory doesn't exist yet
            return [];
        }
    }

    /**
     * Get file metadata
     */
    async getMetadata(
        tenantId: string,
        filename: string,
        options?: UploadOptions
    ): Promise<FileMetadata | null> {
        const filePath = this.getPath(tenantId, filename, options);

        // Validate path is within tenant directory
        if (!this.validatePath(tenantId, filePath)) {
            throw new Error('Invalid file path - access denied');
        }

        try {
            const stats = await fs.stat(filePath);

            return {
                filename,
                size: stats.size,
                mimeType: this.getMimeType(filename),
                uploadedBy: 'unknown', // Would need to track in DB
                uploadedAt: stats.birthtime.toISOString(),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Simple MIME type detection
     */
    private getMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Generate presigned URL using HMAC (local-friendly; swap for S3/GCS in prod)
     */
    async generatePresignedUrl(
        tenantId: string,
        filename: string,
        expiresIn: number = 3600,
        options?: UploadOptions
    ): Promise<string> {
        const filePath = this.getPath(tenantId, filename, options);
        const relativePath = path.relative(this.baseStoragePath, filePath);

        const expiresAt = Date.now() + expiresIn * 1000;
        const payload = `${tenantId}:${relativePath}:${expiresAt}`;
        const signature = crypto
            .createHmac('sha256', process.env.FILE_SIGNING_SECRET || 'local-dev-secret')
            .update(payload)
            .digest('hex');

        return `/uploads/${relativePath.replace(/\\/g, '/')}?expires=${expiresAt}&sig=${signature}`;
    }
}

// Singleton instance
export const fileBucket = new FileBucket();
