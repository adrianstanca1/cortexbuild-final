
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://zpbuvuxpfemldsknerew.supabase.co';
// Key from services/supabaseClient.ts (Hardcoded fallback)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTQzMTcsImV4cCI6MjA3MTY5MDMxN30.4wb8_qMaJ0hpkLEv51EWh0pRtVXD3GWWOsuCmZsOx6A';
const API_URL = 'http://localhost:8080';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFunctionalLogin() {
    console.log('Testing End-to-End Functional Flow (Key: ...Ox6A)...');

    // 1. Login
    console.log('1. Attempting Login (adrian.stanca1@gmail.com)...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'adrian.stanca1@gmail.com',
        password: 'Cumparavinde1@'
    });

    if (error) {
        console.error('❌ Login Failed:', error.message);
        process.exit(1);
    }

    if (!data.session) {
        console.error('❌ No Session Returned');
        process.exit(1);
    }

    console.log('✅ Login Successful');
    const token = data.session.access_token;

    // 2. Test Protected API
    console.log('2. Fetching Protected Data (/api/projects)...');

    const response = await fetch(`${API_URL}/api/projects`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-company-id': 'c1'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ API Request Failed: ${response.status}`, text);
    } else {
        const projects = await response.json();
        console.log(`✅ API Access Successful. Found ${Array.isArray(projects) ? projects.length : 0} projects.`);
        // console.log(projects);
    }

    console.log('Functional Verification Complete.');
}

testFunctionalLogin();
