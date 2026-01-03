#!/usr/bin/env node

import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadDirectory(sftp, localDir, remoteDir) {
    const files = fs.readdirSync(localDir);

    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = `${remoteDir}/${file}`;
        const stat = fs.statSync(localPath);

        if (stat.isDirectory()) {
            try {
                await sftp.mkdir(remotePath, true);
                console.log(`   Created directory: ${file}`);
            } catch (e) {
                // Directory might already exist
            }
            await uploadDirectory(sftp, localPath, remotePath);
        } else {
            await sftp.put(localPath, remotePath);
            console.log(`   Uploaded: ${file}`);
        }
    }
}

async function deployToHostinger() {
    const sftp = new SftpClient();

    try {
        console.log('🚀 Connecting to Hostinger SFTP...');

        await sftp.connect({
            host: process.env.SFTP_HOST || '194.11.154.108',
            port: Number(process.env.SFTP_PORT) || 65002,
            username: process.env.SFTP_USER || 'u875310796',
            password: process.env.SFTP_PASSWORD || 'Cumparavinde1@'
        });

        console.log('✅ Connected successfully!');

        const remotePath = '/home/u875310796/domains/cortexbuildpro.com/public_html';
        const localPath = path.join(__dirname, '..', 'dist');

        console.log(`📂 Local path: ${localPath}`);
        console.log(`📂 Remote path: ${remotePath}`);

        console.log('🗑️  Clearing old files (keeping .htaccess)...');
        const files = await sftp.list(remotePath);
        for (const file of files) {
            if (file.name !== '.htaccess' && file.name !== '.' && file.name !== '..' && file.name !== 'api' && file.name !== 'debug.php') {
                const fullPath = `${remotePath}/${file.name}`;
                try {
                    if (file.type === 'd') {
                        await sftp.rmdir(fullPath, true);
                        console.log(`   Removed directory: ${file.name}`);
                    } else {
                        await sftp.delete(fullPath);
                        console.log(`   Removed file: ${file.name}`);
                    }
                } catch (e) {
                    console.warn(`   Warning: Could not remove ${file.name}: ${e.message}`);
                }
            }
        }

        console.log('📤 Uploading new files...');
        await uploadDirectory(sftp, localPath, remotePath);

        console.log('✅ Deployment complete!');
        console.log('🌐 Visit https://cortexbuildpro.com to verify');

    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    } finally {
        await sftp.end();
    }
}

deployToHostinger();