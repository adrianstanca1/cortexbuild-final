import {
    Client
} from 'ssh2';
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

const localFile = path.join(__dirname, '../server/.htaccess');
const remoteFile = 'domains/cortexbuildpro.com/public_html/api/.htaccess';

console.log(`🔌 Connecting to ${config.host}...`);
const conn = new Client();

conn.on('ready', () => {
    console.log('🔌 Connected.');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        console.log(`📤 Uploading ${path.basename(localFile)}...`);
        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) {
                console.error('❌ Upload error:', err);
                conn.end();
            } else {
                console.log('✅ Upload successful.');
                conn.end();
            }
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err);
}).connect(config);