#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from server/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://zpbuvuxpfemldsknerew.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNDMxNywiZXhwIjoyMDcxNjkwMzE3fQ.gY8kq22SiOxULPdpdhf-sz-C7V9hC2ZtPy5003UYsik';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testLogin() {
    const email = 'adrian.stanca1@gmail.com';
    const password = 'Cumparavinde1@';

    console.log('🔍 Testing Supabase Authentication...\n');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Email: ${email}\n`);

    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists in Supabase Auth...');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email
    });

    if (linkError) {
        console.error('❌ Error checking user:', linkError);
        return;
    }

    if (!linkData.user) {
        console.error('❌ User not found in Supabase Auth');
        return;
    }

    console.log('✅ User exists in Supabase');
    console.log(`   User ID: ${linkData.user.id}`);
    console.log(`   Email: ${linkData.user.email}`);
    console.log(`   Email Confirmed: ${linkData.user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   User Metadata:`, linkData.user.user_metadata);

    // Step 2: Try to sign in with password
    console.log('\nStep 2: Testing password authentication...');

    // Create a regular client (not admin) to test login
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTQzMTcsImV4cCI6MjA3MTY5MDMxN30.4wb8_qMaJ0hpkLEv51EWh0pRtVXD3GWWOsuCmZsOx6A';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error('❌ Login failed:', signInError.message);
        console.error('   Error details:', signInError);

        // Try to reset password
        console.log('\n🔧 Attempting to reset password...');
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            linkData.user.id,
            { password: password }
        );

        if (updateError) {
            console.error('❌ Failed to reset password:', updateError);
        } else {
            console.log('✅ Password reset successfully!');
            console.log('   Please try logging in again.');
        }
    } else {
        console.log('✅ Login successful!');
        console.log(`   Access Token: ${signInData.session?.access_token?.substring(0, 20)}...`);
        console.log(`   User:`, signInData.user?.email);
    }
}

testLogin().catch(console.error);
