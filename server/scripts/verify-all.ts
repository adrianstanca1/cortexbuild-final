
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

async function verifyAll() {
    console.log('====================================================');
    console.log('        BUILDPRO SYSTEM COMPREHENSIVE CHECK         ');
    console.log('====================================================\n');

    const results = {
        env: false,
        dependencies: false,
        database: false,
        supabase: false,
        sendgrid: false
    };

    // 1. Environment Variables
    console.log('[1/5] Checking Environment Variables...');
    const requiredVars = [
        'DATABASE_TYPE',
        'DB_HOST',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SENDGRID_API_KEY'
    ];

    let missingVars = 0;
    requiredVars.forEach(v => {
        if (!process.env[v]) {
            console.warn(`  ⚠️  Missing: ${v}`);
            missingVars++;
        } else {
            const val = process.env[v];
            const masked = val!.length > 8 ? val!.substring(0, 4) + '...' + val!.substring(val!.length - 4) : '****';
            console.log(`  ✅ ${v}: ${masked}`);
        }
    });
    results.env = missingVars === 0;
    console.log(results.env ? '  OK: All critical vars found.\n' : '  WARN: Some variables are missing. Some features may fail.\n');

    // 2. Dependencies Check
    console.log('[2/5] Checking Dependencies...');
    try {
        const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8'));
        const serverPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
        console.log(`  ✅ Root package.json found (v${rootPkg.version})`);
        console.log(`  ✅ Server package.json found (v${serverPkg.version})`);
        
        if (fs.existsSync(path.resolve(__dirname, '..', '..', 'node_modules')) && 
            fs.existsSync(path.resolve(__dirname, '..', 'node_modules'))) {
            console.log('  ✅ node_modules detected in both directories.');
            results.dependencies = true;
        } else {
            console.warn('  ⚠️  Missing node_modules. Run npm install.');
        }
    } catch (e: any) {
        console.error('  ❌ Failed to read package.json:', e.message);
    }
    console.log('\n');

    // 3. Database Connectivity & Schema
    console.log('[3/5] Testing Database Connectivity & Schema...');
    try {
        await initializeDatabase();
        const db = getDb();
        console.log('  ✅ Database connection initialized.');

        const dbType = process.env.DATABASE_TYPE || 'postgres';
        if (dbType === 'mysql') {
            const tables = await db.all('SHOW TABLES');
            console.log(`  ✅ MySQL Connected. Found ${tables.length} tables.`);
            
            const coreTables = ['companies', 'users', 'projects', 'tasks', 'memberships'];
            for (const table of coreTables) {
                const exists = await db.get(`SELECT COUNT(*) as count FROM ${table}`).catch(() => null);
                if (exists !== null) {
                    console.log(`     - Table '${table}': ✅ Found (${exists.count} records)`);
                } else {
                    console.warn(`     - Table '${table}': ❌ MISSING`);
                }
            }
        } else if (dbType === 'sqlite') {
            const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
            console.log(`  ✅ SQLite Connected. Found ${tables.length} tables.`);
        }
        results.database = true;
    } catch (e: any) {
        console.error('  ❌ Database Verification Failed:', e.message);
    }
    console.log('\n');

    // 4. Supabase Auth Check
    console.log('[4/5] Checking Supabase Connectivity...');
    if (process.env.SUPABASE_URL) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
            if (error) throw error;
            console.log('  ✅ Supabase Admin access verified.');
            results.supabase = true;
        } catch (e: any) {
            console.warn('  ⚠️  Supabase Connectivity failed:', e.message);
        }
    } else {
        console.warn('  ⚠️  Supabase URL not configured.');
    }
    console.log('\n');

    // 5. External Services (SendGrid)
    console.log('[5/5] Checking External Services...');
    if (process.env.SENDGRID_API_KEY) {
        console.log('  ✅ SendGrid API Key present.');
        results.sendgrid = true;
    } else {
        console.warn('  ⚠️  SendGrid not configured.');
    }
    console.log('\n');

    console.log('====================================================');
    console.log('                FINAL VERIFICATION REPORT            ');
    console.log('====================================================');
    console.log(`  Environment:    ${results.env ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`  Dependencies:   ${results.dependencies ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Database:       ${results.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Supabase:       ${results.supabase ? '✅ PASS' : '⚠️  FAIL'}`);
    console.log(`  SendGrid:       ${results.sendgrid ? '✅ PASS' : '⚠️  FAIL'}`);
    console.log('====================================================\n');

    if (results.database && results.dependencies) {
        console.log('  🚀 SYSTEM IS READY FOR OPERATION');
    } else {
        console.log('  🚧 SYSTEM HAS CRITICAL ISSUES THAT NEED ATTENTION');
    }
}

verifyAll().catch(console.error);
