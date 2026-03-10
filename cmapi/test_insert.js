const { getConnection } = require('./src/config/db');

async function testInsert() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Testing bulk insert with execute...');

        const folderId = 1; // dummy
        const values = [[folderId, 1, 'read'], [folderId, 1, 'write']];
        const placeholders = values.map(() => '(?, ?, ?)').join(', ');
        const sql = `INSERT INTO folder_permissions (folder_id, user_id, permission_type) VALUES ${placeholders}`;

        console.log('SQL:', sql);
        console.log('Params:', values.flat());

        try {
            await connection.execute(sql, values.flat());
            console.log('Success with execute!');
        } catch (err) {
            console.error('Failed with execute:', err.message);

            try {
                await connection.query(sql, values.flat());
                console.log('Success with query!');
            } catch (err2) {
                console.error('Failed with query:', err2.message);
            }
        }

    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        if (connection) {
            // Cleanup dummy data if needed, but let's just see if it runs
            await connection.release();
        }
        process.exit();
    }
}

testInsert();
