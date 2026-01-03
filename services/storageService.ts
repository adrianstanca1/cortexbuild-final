import { supabase } from './supabaseClient';

export type StorageBucket = 'documents' | 'images' | 'avatars' | 'videos';

export interface UploadResult {
    path: string;
    publicUrl: string;
    id?: string;
}

export const storageService = {
    /**
     * Upload a file to Supabase Storage
     * @param file The file object to upload
     * @param bucket The target bucket (must be created in Supabase Dashboard)
     * @param folder Optional folder path within the bucket
     */
    async upload(file: File, bucket: StorageBucket, folder: string = ''): Promise<UploadResult> {
        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = folder ? `${folder}/${timestamp}-${cleanName}` : `${timestamp}-${cleanName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return {
            path: data.path,
            publicUrl,
            id: data.id
        };
    },

    /**
     * Delete a file from storage
     */
    async delete(path: string, bucket: StorageBucket): Promise<void> {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('Storage Delete Error:', error);
            throw new Error(`Delete failed: ${error.message}`);
        }
    },

    /**
     * Get a temporary signed URL (for private buckets)
     */
    async getSignedUrl(path: string, bucket: StorageBucket, expiresIn = 60): Promise<string | null> {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            console.error('Storage Signed URL Error:', error);
            return null;
        }

        return data.signedUrl;
    }
};
