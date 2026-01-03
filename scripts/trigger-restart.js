import {
    Client
} from 'ssh2';
import path from 'path';

const config = {
    host: process.env.SSH_HOST || '194.11.154.108',
    port: 65002,
    username: process.env.SSH_USER || 'u875310796',
    password: process.env.SSH_PASSWORD || 'Cumparavinde1@',
    readyTimeout: 20000,
};

const remoteRestartDir = 'domains/cortexbuildpro.com/public_html/api/tmp';
const remoteRestartFile = `${remoteRestartDir}/restart.txt`;

console.log(`🔌 Connecting to ${config.host} for restart trigger...`);
const conn = new Client();

conn.on('ready', () => {
    console.log('🔌 Connected.');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        // Create directory just in case
        sftp.mkdir(remoteRestartDir, true, (err) => {
            // Ignore error if exists
        });

        const timestamp = new Date().toISOString();
        const buffer = Buffer.from(timestamp);

        console.log(`🔄 Touching ${remoteRestartFile}...`);
        sftp.writeFile(remoteRestartFile, buffer, (err) => {
            if (err) {
                console.error('❌ Restart trigger failed:', err);
                conn.end();
                process.exit(1);
            }
            console.log('✅ Restart triggered successfully!');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
}).connect(config);