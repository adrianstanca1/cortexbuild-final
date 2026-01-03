import mysql from 'mysql2/promise';

const config = {
    host: 'auth-db2112.hstgr.io',
    user: 'u875310796_admin',
    password: 'Cumparavinde1.',
    database: 'u875310796_cortexbuildpro',
    port: 3306
};

async function verifyDatabase() {
    let connection;

    try {
        console.log('🔍 Comprehensive Database Verification\n');
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully\n');

        // 1. Count all tables
        console.log('=== TABLE COUNT ===');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`Total tables: ${tables.length}\n`);

        // 2. Verify critical tables exist
        console.log('=== CRITICAL TABLES ===');
        const criticalTables = [
            'companies', 'users', 'memberships', 'projects', 'tasks',
            'documents', 'audit_logs', 'notifications', 'invitations'
        ];

        for (const table of criticalTables) {
            const [result] = await connection.query(`SHOW TABLES LIKE '${table}'`);
            const status = result.length > 0 ? '✅' : '❌';
            console.log(`${status} ${table}`);
        }

        // 3. Check row counts for key tables
        console.log('\n=== ROW COUNTS ===');
        const tablesToCount = ['companies', 'users', 'memberships', 'projects', 'tasks'];

        for (const table of tablesToCount) {
            try {
                const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = (rows as any)[0].count;
                console.log(`${table}: ${count} rows`);
            } catch (e) {
                console.log(`${table}: ERROR`);
            }
        }

        // 4. Test foreign key constraints
        console.log('\n=== FOREIGN KEY CONSTRAINTS ===');
        const [fkInfo] = await connection.query(`
            SELECT 
                TABLE_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = 'u875310796_cortexbuildpro'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 10
        `);
        console.log(`Total foreign keys: ${(fkInfo as any[]).length}`);
        console.log('Sample constraints:');
        (fkInfo as any[]).slice(0, 5).forEach((fk: any) => {
            console.log(`  ${fk.TABLE_NAME} -> ${fk.REFERENCED_TABLE_NAME}`);
        });

        // 5. Check indexes
        console.log('\n=== INDEXES ===');
        const [indexes] = await connection.query(`
            SELECT 
                TABLE_NAME,
                INDEX_NAME,
                COLUMN_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = 'u875310796_cortexbuildpro'
            AND TABLE_NAME IN ('companies', 'projects', 'tasks')
            ORDER BY TABLE_NAME, INDEX_NAME
        `);
        console.log(`Total indexes on key tables: ${(indexes as any[]).length}`);

        console.log('\n✅ Database verification complete!');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

verifyDatabase();
