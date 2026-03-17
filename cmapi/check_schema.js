const { getConnection } = require('./src/config/db');

async function checkSchema() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Checking folder_permissions schema...');
        
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Available tables:');
        console.table(tables);

        for (const tableObj of tables) {
            const tableName = Object.values(tableObj)[0];
            console.log(`\nSchema for table: ${tableName}`);
            const [rows] = await connection.execute(`DESCRIBE ${tableName}`);
            console.table(rows);
        }

    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

checkSchema();
