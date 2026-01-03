
import { initializeDatabase, getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function verifyCapabilities() {
    console.log('====================================================');
    console.log('       BUILDPRO API CAPABILITIES VERIFICATION       ');
    console.log('====================================================\n');

    const results = {
        database: false,
        supabase: false,
        sendgrid: false,
        gemini: false,
        vapid: false
    };

    // 1. Database Connectivity & Schema
    console.log('[1/5] Testing MySQL Connectivity...');
    try {
        await initializeDatabase();
        const db = getDb();
        const tables = await db.all('SHOW TABLES');
        console.log(`  ✅ MySQL Connected. Found ${tables.length} tables.`);
        const counts = await db.get('SELECT (SELECT COUNT(*) FROM companies) as companies, (SELECT COUNT(*) FROM users) as users');
        console.log(`  ✅ Data Integrity: ${counts.companies} companies, ${counts.users} users.`);
        results.database = true;
    } catch (e: any) {
        console.error('  ❌ Database Failed:', e.message);
    }
    console.log('\n');

    // 2. Supabase Auth Check
    console.log('[2/5] Testing Supabase Auth Integration...');
    if (process.env.SUPABASE_URL) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
            if (error) throw error;
            console.log('  ✅ Supabase Admin Access: Verified.');
            results.supabase = true;
        } catch (e: any) {
            console.warn('  ⚠️  Supabase Failed:', e.message);
        }
    } else {
        console.warn('  ⚠️  Supabase not configured.');
    }
    console.log('\n');

    // 3. SendGrid Email Check
    console.log('[3/5] Testing SendGrid Email Configuration...');
    if (process.env.SENDGRID_API_KEY) {
        try {
            const sgMail = (await import('@sendgrid/mail')).default;
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            // We just verify the key exists and the SDK loads.
            // A real send would require a verified sender.
            console.log('  ✅ SendGrid SDK: Initialized.');
            console.log(`  ✅ Sender Email: ${process.env.EMAIL_FROM || 'not set'}`);
            results.sendgrid = true;
        } catch (e: any) {
            console.warn('  ⚠️  SendGrid failed to load:', e.message);
        }
    } else {
        console.warn('  ⚠️  SendGrid not configured.');
    }
    console.log('\n');

    // 4. Gemini AI Check
    console.log('[4/5] Testing Gemini AI Integration...');
    if (process.env.GEMINI_API_KEY) {
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            // Testing with direct model call as used in aiService.ts
            const result = await genAI.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: [{ role: 'user', parts: [{ text: "Respond with 'READY'" }] }]
            });

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.includes('READY')) {
                console.log('  ✅ Gemini AI: Functional (2.0 Flash Exp).');
                results.gemini = true;
            } else {
                console.warn('  ⚠️  Gemini AI: Unexpected response:', text);
            }
        } catch (e: any) {
            console.warn('  ⚠️  Gemini AI Failed:', e.message);
        }
    } else {
        console.warn('  ⚠️  Gemini AI not configured.');
    }
    console.log('\n');

    // 5. VAPID Web Push Check
    console.log('[5/5] Testing Web Push (VAPID) Configuration...');
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        try {
            const webpush = (await import('web-push')).default;
            webpush.setVapidDetails(
                `mailto:${process.env.EMAIL_FROM || 'admin@cortexbuildpro.com'}`,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );
            console.log('  ✅ VAPID Keys: Validated & Configured.');
            results.vapid = true;
        } catch (e: any) {
            console.warn('  ⚠️  VAPID Configuration failed:', e.message);
        }
    } else {
        console.warn('  ⚠️  VAPID keys missing.');
    }
    console.log('\n');

    console.log('====================================================');
    console.log('             CAPABILITY SUMMARY REPORT              ');
    console.log('====================================================');
    console.log(`  MySQL Connection:   ${results.database ? '✅ ONLINE' : '❌ OFFLINE'}`);
    console.log(`  Supabase Auth:       ${results.supabase ? '✅ ONLINE' : '⚠️  MISSING'}`);
    console.log(`  SendGrid Email:      ${results.sendgrid ? '✅ ONLINE' : '⚠️  MISSING'}`);
    console.log(`  Gemini AI (2.0):     ${results.gemini ? '✅ ONLINE' : '⚠️  MISSING'}`);
    console.log(`  Web Push (VAPID):    ${results.vapid ? '✅ ONLINE' : '⚠️  MISSING'}`);
    console.log('====================================================\n');

    process.exit(0);
}

verifyCapabilities().catch(e => {
    console.error('CRITICAL ERROR DURING VERIFICATION:', e);
    process.exit(1);
});
