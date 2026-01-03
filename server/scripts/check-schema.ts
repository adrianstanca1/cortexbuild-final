import mysql from 'mysql2/promise';

const config = {
    host: 'auth-db2112.hstgr.io',
    user: 'u875310796_admin',
    password: 'Cumparavinde1.',
    database: 'u875310796_cortexbuildpro',
    port: 3306
};

async function checkSchema() {
    let connection;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected\n');

        // Check all tables
        console.log('=== ALL TABLES ===');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(tables);

        // Check projects table structure
        console.log('\n=== PROJECTS TABLE STRUCTURE ===');
        const [projectsColumns] = await connection.query('DESCRIBE projects');
        console.log(projectsColumns);

        // Check if project_members exists
        console.log('\n=== CHECKING PROJECT_MEMBERS ===');
        try {
            const [membersColumns] = await connection.query('DESCRIBE project_members');
            console.log('✅ Table exists:');
            console.log(membersColumns);
        } catch (e: any) {
            if (e.code === 'ER_NO_SUCH_TABLE') {
                console.log('❌ Table does NOT exist - needs to be created');
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSchema();
