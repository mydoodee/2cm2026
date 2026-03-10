const { getConnection } = require('./src/config/db');

async function checkSchema() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Checking folder_permissions schema...');
        
        try {
            const [rows] = await connection.execute('DESCRIBE folder_permissions');
            console.log('Table folder_permissions schema:');
            console.table(rows);
        } catch (err) {
            console.error('Error describing folder_permissions:', err.message);
            
            const [tables] = await connection.execute('SHOW TABLES');
            console.log('Available tables:');
            console.table(tables);
        }

    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

checkSchema();
