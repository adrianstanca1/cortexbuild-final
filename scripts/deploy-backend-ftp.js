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
const ROOT_DIR = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const HOSTINGER_API_PATH = '/domains/cortexbuildpro.com/public_html/api';

async function uploadDirectory(client, localDir, remoteDir) {
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
                await client.ensureDir(remotePath);
                console.log(`   Created directory: ${file}`);
            } catch (e) {
                // Ignore if exists or error
            }
            await uploadDirectory(client, localPath, remotePath);
        } else {
            await client.uploadFrom(localPath, remotePath);
            console.log(`   Uploaded: ${file}`);
        }
    }
}

async function deployBackend() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        console.log('🚀 Connecting to Hostinger FTP...');
        await client.access({
            host: process.env.FTP_HOST || '194.11.154.108',
            user: process.env.FTP_USER || 'u875310796',
            password: process.env.FTP_PASSWORD || 'Cumparavinde1@',
            secure: false // Explicit auth usually implies explicit TLS but could be plain FTP. Trying standard first.
        });
        console.log('✅ Connected successfully!');

        // Ensure API directory exists
        await client.ensureDir(HOSTINGER_API_PATH);

        console.log(`📤 Uploading Backend Files to ${HOSTINGER_API_PATH}...`);

        // 1. Upload package.json (modified for production)
        console.log('   Uploading package.json...');
        const packageJsonPath = path.join(SERVER_DIR, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageJson.main = 'dist/index.js'; // Fix entry point for Hostinger

        // Create temp file
        const tempPackageJsonPath = path.join(__dirname, 'package.prod.json');
        fs.writeFileSync(tempPackageJsonPath, JSON.stringify(packageJson, null, 2));

        await client.uploadFrom(tempPackageJsonPath, `${HOSTINGER_API_PATH}/package.json`);
        fs.unlinkSync(tempPackageJsonPath); // Cleanup

        // 2. Upload .env.hostinger as .env
        console.log('   Uploading .env...');
        if (fs.existsSync(path.join(SERVER_DIR, '.env.hostinger'))) {
            await client.uploadFrom(path.join(SERVER_DIR, '.env.hostinger'), `${HOSTINGER_API_PATH}/.env`);
        } else {
            console.warn('   ⚠️ .env.hostinger not found! Skipping.');
        }

        // 3. Upload .htaccess
        if (fs.existsSync(path.join(SERVER_DIR, '.htaccess'))) {
            console.log('   Uploading .htaccess...');
            await client.uploadFrom(path.join(SERVER_DIR, '.htaccess'), `${HOSTINGER_API_PATH}/.htaccess`);
        }

        // 3.1. Upload Diagnostic Scripts
        const diagnostics = ['log_reader.php', 'debug.php'];
        for (const file of diagnostics) {
            const localPath = path.join(SERVER_DIR, file);
            if (fs.existsSync(localPath)) {
                console.log(`   Uploading ${file}...`);
                await client.uploadFrom(localPath, `${HOSTINGER_API_PATH}/${file}`);
            }
        }

        // 4. Upload dist folder
        console.log('   Uploading dist folder...');
        const remoteDist = `${HOSTINGER_API_PATH}/dist`;
        await client.ensureDir(remoteDist);
        await uploadDirectory(client, path.join(SERVER_DIR, 'dist'), remoteDist);

        // 5. Trigger Restart (tmp/restart.txt)
        console.log('   Triggering restart...');
        const restartDir = `${HOSTINGER_API_PATH}/tmp`;
        await client.ensureDir(restartDir);

        const restartFileLocal = path.join(__dirname, 'restart.txt');
        fs.writeFileSync(restartFileLocal, new Date().toISOString());
        await client.uploadFrom(restartFileLocal, `${restartDir}/restart.txt`);
        fs.unlinkSync(restartFileLocal);

        console.log('✅ Backend files uploaded successfully!');
        console.log('⚠️  NEXT STEPS:');
        console.log('1. SSH into server or use Hostinger Node.js Manager');
        console.log('2. Navigate to domains/cortexbuildpro.com/public_html/api');
        console.log('3. Run "npm install --production"');
        console.log('4. Restart the Node.js application');

    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deployBackend();