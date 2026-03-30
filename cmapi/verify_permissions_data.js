const { getConnection } = require('./src/config/db');

async function test() {
    let connection;
    try {
        connection = await getConnection();
        
        console.log('--- Table: project_permissions ---');
        const [pp] = await connection.execute('SELECT * FROM project_permissions LIMIT 10');
        console.table(pp);
        const [ppCount] = await connection.execute('SELECT COUNT(*) as count FROM project_permissions');
        console.log('Total project_permissions:', ppCount[0].count);

        console.log('\n--- Table: user_roles ---');
        const [ur] = await connection.execute('SELECT * FROM user_roles LIMIT 10');
        console.table(ur);
        const [urCount] = await connection.execute('SELECT COUNT(*) as count FROM user_roles');
        console.log('Total user_roles:', urCount[0].count);

        console.log('\n--- Table: project_user_roles ---');
        const [pur] = await connection.execute('SELECT * FROM project_user_roles LIMIT 10');
        console.table(pur);

        console.log('\n--- Table: roles ---');
        const [roles] = await connection.execute('SELECT * FROM roles');
        console.table(roles);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

test();
