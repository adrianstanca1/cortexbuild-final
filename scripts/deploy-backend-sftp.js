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
const ROOT_DIR = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const HOSTINGER_API_PATH = '/home/u875310796/domains/cortexbuildpro.com/public_html/api';

async function uploadDirectory(sftp, localDir, remoteDir) {
    if (!fs.existsSync(localDir)) {
        console.warn(`Local directory not found: ${localDir}`);
        return;
    }
    const files = fs.readdirSync(localDir);

    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = `${remoteDir}/${file}`;
        const stat = fs.statSync(localPath);

        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git') continue;
            try {
                await sftp.mkdir(remotePath, true);
                console.log(`   Created directory: ${file}`);
            } catch (e) {
                // Ignore if exists
            }
            await uploadDirectory(sftp, localPath, remotePath);
        } else {
            await sftp.put(localPath, remotePath);
            console.log(`   Uploaded: ${file}`);
        }
    }
}

async function deployBackend() {
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

        // Create API directory if not exists
        try {
            await sftp.mkdir(HOSTINGER_API_PATH, true);
        } catch (e) { }

        console.log(`📤 Uploading Backend Files to ${HOSTINGER_API_PATH}...`);

        // 1. Upload package.json (modified for production)
        console.log('   Uploading package.json...');
        const packageJsonPath = path.join(SERVER_DIR, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.main = 'dist/index.js'; // Fix entry point for Hostinger

        // Create temp file
        const tempPackageJsonPath = path.join(__dirname, 'package.prod.json');
        fs.writeFileSync(tempPackageJsonPath, JSON.stringify(packageJson, null, 2));

        await sftp.put(tempPackageJsonPath, `${HOSTINGER_API_PATH}/package.json`);
        fs.unlinkSync(tempPackageJsonPath); // Cleanup

        // 2. Upload .env.hostinger as .env
        console.log('   Uploading .env...');
        await sftp.put(path.join(SERVER_DIR, '.env.hostinger'), `${HOSTINGER_API_PATH}/.env`);

        // 3. Upload .htaccess
        if (fs.existsSync(path.join(SERVER_DIR, '.htaccess'))) {
            console.log('   Uploading .htaccess...');
            await sftp.put(path.join(SERVER_DIR, '.htaccess'), `${HOSTINGER_API_PATH}/.htaccess`);
        }

        // 3.1. Upload Diagnostic Scripts
        const diagnostics = ['log_reader.php', 'debug.php'];
        for (const file of diagnostics) {
            const localPath = path.join(SERVER_DIR, file);
            if (fs.existsSync(localPath)) {
                console.log(`   Uploading ${file}...`);
                await sftp.put(localPath, `${HOSTINGER_API_PATH}/${file}`);
            }
        }

        // 4. Upload dist folder
        console.log('   Uploading dist folder...');
        const remoteDist = `${HOSTINGER_API_PATH}/dist`;
        try {
            await sftp.mkdir(remoteDist, true);
        } catch (e) { }

        await uploadDirectory(sftp, path.join(SERVER_DIR, 'dist'), remoteDist);

        // 5. Trigger Restart (tmp/restart.txt)
        console.log('   Triggering restart...');
        const restartDir = `${HOSTINGER_API_PATH}/tmp`;
        try {
            await sftp.mkdir(restartDir, true);
        } catch (e) { }

        const restartFileLocal = path.join(__dirname, 'restart.txt');
        fs.writeFileSync(restartFileLocal, new Date().toISOString());
        await sftp.put(restartFileLocal, `${restartDir}/restart.txt`);
        fs.unlinkSync(restartFileLocal);

        console.log('✅ Backend files uploaded successfully!');
        console.log('⚠️  NEXT STEPS:');
        console.log('1. SSH into server or use Hostinger Node.js Manager');
        console.log('2. Navigate to domains/cortexbuildpro.com/public_html/api');
        console.log('3. Run "npm install --production"');
        console.log('4. Restart the Node.js application');

    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    } finally {
        await sftp.end();
    }
}

deployBackend();