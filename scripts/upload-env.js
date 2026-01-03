import {
    Client
} from 'ssh2';
import fs from 'fs';
import path from 'path';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    host: process.env.SSH_HOST || '194.11.154.108',
    port: 65002,
    username: process.env.SSH_USER || 'u875310796',
    password: process.env.SSH_PASSWORD || 'Cumparavinde1@',
    readyTimeout: 20000,
};

const localEnvPath = path.join(__dirname, '../server/.env.production');
const remoteEnvPath = 'domains/cortexbuildpro.com/public_html/api/.env';

console.log(`🔌 Connecting to ${config.host}:${config.port} as ${config.username}...`);

const conn = new Client();

conn.on('ready', () => {
    console.log('🔌 Connected via SSH');

    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        console.log(`📤 Uploading .env.production to ${remoteEnvPath}...`);
        sftp.fastPut(localEnvPath, remoteEnvPath, (err) => {
            if (err) {
                console.error('❌ Upload error:', err);
                conn.end();
                process.exit(1);
            }
            console.log('✅ .env uploaded successfully.');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
}).connect(config);