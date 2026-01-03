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

const commands = [
    'cd domains/cortexbuildpro.com/public_html',
    'echo "🧹 Cleaning up public_html (preserving api/.htaccess)..."',
    // Use find to delete everything EXCEPT 'api', '.htaccess', 'debug.php', and the current directory
    'find . -maxdepth 1 ! -name "api" ! -name ".htaccess" ! -name "debug.php" ! -name "." ! -name ".." -exec rm -rf {} +',
    'echo "✅ Cleanup complete."'
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