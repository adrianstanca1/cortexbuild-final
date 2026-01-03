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

const conn = new Client();
conn.on('ready', () => {
    // List logs first to be sure of names
    const cmd = 'ls -F /home/u875310796/.pm2/logs/ && echo "---" && tail -n 50 /home/u875310796/.pm2/logs/cortex-api-out.log && echo "---" && tail -n 50 /home/u875310796/.pm2/logs/cortex-api-error.log';

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', (data) => process.stdout.write(data))
            .stderr.on('data', (data) => process.stderr.write(data));
    });
}).on('error', (err) => {
    console.error('❌', err);
    process.exit(1);
}).connect(config);