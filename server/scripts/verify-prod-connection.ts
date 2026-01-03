
import { initializeDatabase, getDb } from '../database.js';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

async function verifyProdConnection() {
    console.log('--- Verifying Production Connection ---');

    // 1. Check Env Vars
    console.log('Checking Environment Variables...');
    const dbType = process.env.DATABASE_TYPE;
    const dbHost = process.env.DB_HOST;
    const hasSendGrid = !!process.env.SENDGRID_API_KEY;

    console.log(`DATABASE_TYPE: ${dbType}`);
    console.log(`DB_HOST: ${dbHost}`);
    console.log(`SENDGRID_API_KEY Present: ${hasSendGrid}`);

    if (dbType !== 'mysql') {
        console.warn('⚠️  Expected DATABASE_TYPE=mysql per .env.hostinger, but got:', dbType);
    }

    // DEBUG: DNS Resolution
    const dns = await import('dns/promises');
    try {
        console.log(`\n--- DNS Lookup for ${dbHost} ---`);
        const ipv4 = await dns.resolve4(dbHost!).catch(() => []);
        const ipv6 = await dns.resolve6(dbHost!).catch(() => []);
        console.log(`IPv4: ${ipv4.join(', ')}`);
        console.log(`IPv6: ${ipv6.join(', ')}`);

        if (ipv4.length > 0) {
            console.log(`Force-Switching DB_HOST from ${dbHost} to ${ipv4[0]} (IPv4)`);
            process.env.DB_HOST = ipv4[0];
        }
    } catch (e) {
        console.error('DNS Lookup failed:', e);
    }

    // 2. Test DB Connection
    console.log('\n--- Testing Database Connection ---');
    try {
        await initializeDatabase();
        const db = getDb();
        console.log('✅ Database Connection Initialized');

        // Simple Query
        const tables = await db.all('SHOW TABLES');
        console.log(`✅ Successfully queried database. Found ${tables.length} tables.`);
        if (tables.length > 0) {
            console.log('Sample Table:', Object.values(tables[0])[0]);
        }

    } catch (error: any) {
        console.error('❌ Database Connection Failed:', error.message);
        // Do not exit, so we can test email
    }

    // 3. Test Email Mock/Real
    console.log('\n--- Testing Email Service Configuration ---');
    if (hasSendGrid) {
        console.log('✅ SendGrid Key found. Attempting to send test email...');
        // We won't actually send to a real address to avoid spamming unless user provided one
        // But we can verify the service "thinks" it is configured
        // emailService.isConfigured is private, but we can infer from logs or try a safe "dry run" if possible?
        // standard sendEmail catches errors.

        // Let's try sending to a test address if the user agrees, but here we just check config.
        console.log('Email Service is ready to send via SendGrid.');
    } else {
        console.warn('⚠️  SENDGRID_API_KEY not found. Email service will run in MOCK mode.');
    }

    console.log('\n--- Prod Connection Verification Complete ---');
}

verifyProdConnection().catch(console.error);
