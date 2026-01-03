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

const frontendHtaccess = `
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

// Escape for echo
const command = `echo '${frontendHtaccess}' > domains/cortexbuildpro.com/public_html/.htaccess && echo "✅ Frontend .htaccess updated"`;

console.log(`🔌 Connecting to ${config.host}:${config.port} as ${config.username}...`);

const conn = new Client();

conn.on('ready', () => {
    console.log('🔌 Connected via SSH');

    conn.exec(command, (err, stream) => {
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