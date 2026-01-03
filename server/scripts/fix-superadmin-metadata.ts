
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixMetadata() {
    const email = 'adrian.stanca1@gmail.com';
    console.log(`Recovering user ID for ${email} via generateLink workaround...`);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email
    });

    if (linkError) {
        console.error('Error recovering user ID:', linkError);
        return;
    }

    const user = linkData.user;
    if (!user) {
        console.error('User not found in Supabase recovery response');
        return;
    }

    console.log(`Recovered user ID: ${user.id}`);
    console.log('Current metadata:', user.user_metadata);

    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
            ...user.user_metadata,
            role: 'SUPERADMIN',
            companyId: 'platform-admin'
        }
    });

    if (updateError) {
        console.error('Error updating metadata:', updateError);
    } else {
        console.log('✅ Metadata updated successfully');
        console.log('New metadata:', data.user.user_metadata);
    }
}

fixMetadata().catch(console.error);
