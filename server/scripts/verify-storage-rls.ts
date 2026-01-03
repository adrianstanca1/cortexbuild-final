import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// We need a client that acts as a user
const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '');

async function verifyStorageRLS() {
    console.log('🔒 Verifying Storage RLS Policies...');

    const timestamp = Date.now();
    const email = `storage-test-${timestamp}@buildpro.app`;
    const password = 'password123';

    console.log(`   Creating test user: ${email}`);

    // 1. Create Auth User
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: user, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: 'Storage Test User' }
    });

    if (createError) {
        console.error('❌ Failed to create test user:', createError.message);
        return;
    }

    const userId = user.user!.id;

    try {
        // 2. Setup Membership (c1)
        // Ensure public user exists (Trigger might have done it)
        const { error: upsertError } = await adminClient.from('users').upsert({
            id: userId,
            email,
            name: 'Storage Test User',
            role: 'admin',
            companyid: 'c1',
            createdat: new Date().toISOString()
        });

        const { error: memError } = await adminClient.from('memberships').upsert({
            id: `mem_${userId}_c1`,
            userid: userId,
            companyid: 'c1',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
        });

        if (upsertError || memError) {
            throw new Error(`Failed to setup user data: ${upsertError?.message || memError?.message}`);
        }
        console.log('   ✅ User and membership setup complete.');

        // 3. Sign in
        const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError || !session) {
            throw new Error(`Login failed: ${loginError?.message}`);
        }
        console.log(`   ✅ Logged in.`);

        const authClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${session.access_token}` } }
        });

        // 4. Test AUTHORIZED Upload
        const validPath = `c1/project-test-${timestamp}/test.txt`;
        const fileBody = new Blob(['Hello World'], { type: 'text/plain' });

        process.stdout.write(`   Test 1: Upload to OWN company (c1)... `);
        const { error: uploadError } = await authClient.storage
            .from('project-files')
            .upload(validPath, fileBody);

        if (uploadError) {
            console.log(`❌ Failed: ${uploadError.message}`);
        } else {
            console.log(`✅ Success`);
        }

        // 5. Test UNAUTHORIZED Upload
        const invalidPath = `c2/project-test-${timestamp}/test.txt`;
        process.stdout.write(`   Test 2: Upload to OTHER company (c2)... `);

        const { error: failError } = await authClient.storage
            .from('project-files')
            .upload(invalidPath, fileBody);

        if (failError) {
            console.log(`✅ Blocked (Expected): ${failError.message}`);
        } else {
            console.log(`❌ Succeeded (Unexpected! RLS failure)`);
        }

        // Cleanup File
        if (!uploadError) {
            await adminClient.storage.from('project-files').remove([validPath]);
        }

    } catch (err: any) {
        console.error('❌ Verification failed:', err.message);
    } finally {
        // Cleanup User
        console.log('   Cleaning up test user...');
        await adminClient.auth.admin.deleteUser(userId);
    }
}

verifyStorageRLS();
