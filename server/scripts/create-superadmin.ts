import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zpbuvuxpfemldsknerew.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNDMxNywiZXhwIjoyMDcxNjkwMzE3fQ.gY8kq22SiOxULPdpdhf-sz-C7V9hC2ZtPy5003UYsik';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function updateSuperAdmin() {
    const email = 'adrian.stanca1@gmail.com';
    const password = 'Cumparavinde1@';

    console.log(`Updating user to SUPERADMIN: ${email}`);

    try {
        // First, sign in to get the user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            console.log('Sign in failed:', signInError.message);
            console.log('Creating new user instead...');

            // Delete and recreate
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: 'Adrian Stanca',
                    role: 'SUPERADMIN',
                    companyId: 'platform-admin'
                }
            });

            if (createError) {
                console.error('Create error:', createError.message);
                return;
            }

            console.log('✅ User created with SUPERADMIN role');
            console.log('   ID:', createData.user?.id);
            return;
        }

        console.log('User found, ID:', signInData.user?.id);

        // Now update the user's metadata using admin API
        const { data, error } = await supabase.auth.admin.updateUserById(
            signInData.user!.id,
            {
                user_metadata: {
                    full_name: 'Adrian Stanca',
                    role: 'SUPERADMIN',
                    companyId: 'platform-admin'
                }
            }
        );

        if (error) {
            console.error('Error updating user:', error.message);
            return;
        }

        console.log('✅ User updated to SUPERADMIN successfully!');
        console.log('   Email:', data.user?.email);
        console.log('   ID:', data.user?.id);
        console.log('   Role:', data.user?.user_metadata?.role);
        console.log('   Company:', data.user?.user_metadata?.companyId);

    } catch (e) {
        console.error('Failed:', e);
    }
}

updateSuperAdmin();
