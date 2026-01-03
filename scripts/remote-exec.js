import {
    Client
} from 'ssh2';

const config = {
    host: process.env.SSH_HOST || '194.11.154.108',
    port: 65002,
    username: process.env.SSH_USER || 'u875310796',
    password: process.env.SSH_PASSWORD || 'Cumparavinde1@',
    readyTimeout: 20000,
};

// Explicitly set PATH to include Hostinger Node.js versions
const pathSetup = 'export PATH=$PATH:/opt/alt/alt-nodejs22/root/usr/bin:/opt/alt/alt-nodejs20/root/usr/bin:/opt/alt/alt-nodejs18/root/usr/bin';

const commands = [
    pathSetup,
    'cd domains/cortexbuildpro.com/public_html/api',
    'echo "🚀 Starting new process in background..."',
    'sh -c "export PATH=$PATH:/opt/alt/alt-nodejs22/root/usr/bin:/opt/alt/alt-nodejs20/root/usr/bin:/opt/alt/alt-nodejs18/root/usr/bin && (nohup node dist/index.js > start_output.log 2>&1 &) && sleep 2 && exit 0"',
    'echo "✅ Process started."'
];

console.log(`🔌 Connecting to ${config.host}:${config.port} as ${config.username}...`);

const conn = new Client();

conn.on('ready', () => {
    console.log('🔌 Connected via SSH');

    const cmdString = commands.join(' && ');

    conn.exec(cmdString, (err, stream) => {
        if (err) {
            console.error('❌ Exec error:', err);
            conn.end();
            process.exit(1);
        }

        stream.on('close', (code, signal) => {
            console.log(`\nCommand completed with code: ${code}`);
            conn.end();
            if (code !== 0) process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
}).connect(config);