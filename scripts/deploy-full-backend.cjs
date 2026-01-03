#!/usr/bin/env node

const {
    Client
} = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
    host: '194.11.154.108',
    port: 65002,
    username: 'u875310796',
    password: 'Cumparavinde1@'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Connected');

    // Upload the zip file
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            return;
        }

        const localZip = path.join(__dirname, '..', 'backend-full-deploy.zip');
        const remoteZip = 'domains/cortexbuildpro.com/public_html/api/backend-full-deploy.zip';

        console.log('📦 Uploading full backend deployment package...');
        console.log('   This may take a minute...');

        sftp.fastPut(localZip, remoteZip, (err) => {
            if (err) {
                console.error('❌ Upload failed:', err);
                conn.end();
                return;
            }

            console.log('✅ Upload complete');
            console.log('\n🔧 Extracting and restarting backend...');

            // Execute deployment commands
            const deployScript = `
cd domains/cortexbuildpro.com/public_html/api && \
unzip -o backend-full-deploy.zip && \
rm backend-full-deploy.zip && \
export PATH=$PATH:/opt/alt/alt-nodejs22/root/usr/bin && \
pm2 restart cortex-api && \
sleep 2 && \
pm2 logs cortex-api --lines 30
`;

            conn.exec(deployScript, (err, stream) => {
                if (err) {
                    console.error('❌ Deployment error:', err);
                    conn.end();
                    return;
                }

                let output = '';
                stream.on('data', (data) => {
                    output += data.toString();
                    process.stdout.write(data);
                });

                stream.stderr.on('data', (data) => {
                    output += data.toString();
                    process.stderr.write(data);
                });

                stream.on('close', (code) => {
                    console.log(`\n✅ Deployment complete (exit code: ${code})`);

                    // Verify deployment by checking PM2 status
                    console.log('\n📋 Verifying deployment...');
                    conn.exec('export PATH=$PATH:/opt/alt/alt-nodejs22/root/usr/bin && pm2 status', (err, stream) => {
                        if (err) {
                            console.error('❌ Verification failed:', err);
                            conn.end();
                            return;
                        }

                        stream.on('data', (data) => {
                            process.stdout.write(data);
                        });

                        stream.on('close', () => {
                            console.log('\n✅ Full backend deployment verified');
                            conn.end();
                        });
                    });
                });
            });
        });
    });
}).connect(config);

conn.on('error', (err) => {
    console.error('❌ SSH Connection Error:', err.message);
    process.exit(1);
});