
import mysql from 'mysql2/promise';

async function testConnection() {
    console.log('Testing connection to Hostinger DB...');
    try {
        const connection = await mysql.createConnection({
            host: 'auth-db2112.hstgr.io',
            user: 'u875310796_admin',
            password: 'Cumparavinde1.',
            database: 'u875310796_cortexbuildpro'
        });
        console.log('✅ Connection Successful!');
        await connection.end();
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Connection Failed:', err.message);
        process.exit(1);
    }
}

testConnection();
