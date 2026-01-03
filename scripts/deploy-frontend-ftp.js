#!/usr/bin/env node

import ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

async function deployToHostinger() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log('🚀 Connecting to Hostinger FTP...');

        await client.access({
            host: 'srv1374.hstgr.io',
            user: 'u875310796',
            password: 'Cumparavinde1@',
            port: 65002,
            secure: true,
            secureOptions: {
                rejectUnauthorized: false
            }
        });

        console.log('✅ Connected successfully!');

        const remotePath = '/domains/cortexbuildpro.com/public_html';
        const localPath = path.join(__dirname, '..', 'dist');

        console.log(`📂 Local path: ${localPath}`);
        console.log(`📂 Remote path: ${remotePath}`);

        // Ensure we're in the right directory
        await client.cd(remotePath);

        console.log('🗑️  Clearing old files (keeping .htaccess)...');
        const files = await client.list();
        for (const file of files) {
            if (file.name !== '.htaccess' && file.name !== '.' && file.name !== '..') {
                try {
                    if (file.isDirectory) {
                        await client.removeDir(file.name);
                        console.log(`   Removed directory: ${file.name}`);
                    } else {
                        await client.remove(file.name);
                        console.log(`   Removed file: ${file.name}`);
                    }
                } catch (e) {
                    console.warn(`   Warning: Could not remove ${file.name}: ${e.message}`);
                }
            }
        }

        console.log('📤 Uploading new files...');
        await client.uploadFromDir(localPath);

        console.log('✅ Deployment complete!');
        console.log('🌐 Visit https://cortexbuildpro.com to verify');

    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deployToHostinger();