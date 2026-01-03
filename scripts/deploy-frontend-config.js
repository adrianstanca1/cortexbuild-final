import ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    host: process.env.FTP_HOST || '194.11.154.108',
    user: process.env.FTP_USER || 'u875310796',
    password: process.env.FTP_PASSWORD || 'Cumparavinde1@',
    secure: false
};

const localFile = path.join(__dirname, '../dist/.htaccess');
const remoteFile = '/domains/cortexbuildpro.com/public_html/.htaccess';

async function uploadConfig() {
    const client = new ftp.Client();
    try {
        console.log(`🔌 Connecting to ${config.host} as ${config.user}...`);
        await client.access(config);
        console.log('✅ Connected.');

        console.log(`📤 Uploading ${localFile} to ${remoteFile}...`);
        await client.uploadFrom(localFile, remoteFile);

        console.log('✅ Frontend .htaccess uploaded successfully.');
    } catch (err) {
        console.error('❌ Upload failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

uploadConfig();