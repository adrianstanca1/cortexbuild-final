import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory explicitly
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Supabase Connection Verification ---');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? 'Present (Hidden)' : 'MISSING'}`);

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verify() {
    try {
        console.log('Attempting to list users...');
        const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (error) {
            console.error('FAILED:', error);
            console.error('Stack:', error.stack);
        } else {
            console.log('SUCCESS: Connected to Supabase Auth.');
            console.log(`Found ${data.users.length} users in page 1.`);
        }

    } catch (e) {
        console.error('EXCEPTION:', e);
    }
}

verify();
