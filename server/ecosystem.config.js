module.exports = {
    apps: [{
        name: 'cortexbuild-backend',
        script: './dist/index.js',
        cwd: '/home/u875310796/domains/cortexbuildpro.com/public_html/api',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 8080,
            DATABASE_TYPE: 'mysql',
            DB_HOST: 'srv1374.hstgr.io',
            DB_PORT: 3306,
            DB_NAME: 'u875310796_cortexbuildpro',
            DB_USER: 'u875310796_admin',
            DB_PASSWORD: 'Cumparavinde1@'
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000
    }]
};