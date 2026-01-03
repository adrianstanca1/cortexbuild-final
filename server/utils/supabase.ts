
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

/**
 * Returns a server-side Supabase client with admin privileges, or `null` if not configured.
 * Callers should handle the `null` case and provide fallbacks when appropriate.
 */
export const getSupabaseAdmin = (): ReturnType<typeof createClient> | null => {
    if (!supabaseUrl || !supabaseKey) {
        // Do not throw at module import time; allow callers to decide fallback behavior.
        console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; server Supabase client unavailable.');
        return null;
    }

    return createClient(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
};

// Convenience: exported instance if available
export const supabaseAdmin = getSupabaseAdmin();
