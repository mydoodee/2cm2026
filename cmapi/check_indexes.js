const { getConnection } = require('./src/config/db');

async function checkIndexes() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Checking folder_permissions indexes...');

        const [rows] = await connection.execute('SHOW INDEX FROM folder_permissions');
        console.table(rows);

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

checkIndexes();
