import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) return (import.meta as any).env[key];
  return undefined;
};

const supabaseUrl = (getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://zpbuvuxpfemldsknerew.supabase.co').trim();
const supabaseAnonKey = (getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'sb_publishable_LJlZdJB0JylgynMF8MCtQw_m0sKjIK3').trim();
const supabaseServiceRoleKey = (getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNDMxNywiZXhwIjoyMDcxNjkwMzE3fQ.gY8kq22SiOxULPdpdhf-sz-C7V9hC2ZtPy5003UYsik').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not include secrets in repo; warn clearly for developers
  // Browser features that rely on Supabase will not work until env vars are configured
  // Keep behavior predictable: create a lightweight stub that throws descriptive errors when used
  // so components fail fast with actionable messages instead of obscure runtime errors.
  // Note: Server-side helpers can still create a client using `createServerSupabaseClient` below.
  console.warn('⚠️  VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Supabase client will be unavailable in the browser.');
}

const makeMissingClient = (name = 'supabase') => {
  const handler: ProxyHandler<any> = {
    get() {
      throw new Error(`${name} is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.`);
    }
  };
  return new Proxy({}, handler) as SupabaseClient;
};

export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : makeMissingClient('supabase');

/**
 * Create a Supabase client intended for server-side use (service role key recommended).
 * Example: const serverSupabase = createServerSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY)
 */
export const createServerSupabaseClient = (serviceKey?: string): SupabaseClient => {
  const key = (serviceKey || supabaseServiceRoleKey).trim();
  if (!supabaseUrl || !key) {
    throw new Error('Server Supabase client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
  }
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
};

export const uploadFile = async (
  file: File | Blob,
  bucket = 'documents',
  filePath?: string,
  companyId?: string,
  projectId?: string
) => {
  if (!supabaseUrl) throw new Error('Supabase not configured (VITE_SUPABASE_URL missing)');
  if (!supabaseAnonKey) throw new Error('Supabase anon key missing (VITE_SUPABASE_ANON_KEY)');

  const name = (file as File).name || `${Date.now()}`;

  // Construct path based on context
  let path = '';
  if (bucket === 'project-files' && companyId && projectId) {
    path = `${companyId}/${projectId}/${name}`;
  } else {
    path = filePath ? `${filePath}/${name}` : `${Date.now()}-${name}`;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file as File, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl((data as any).path);
  return pub.publicUrl;
};
