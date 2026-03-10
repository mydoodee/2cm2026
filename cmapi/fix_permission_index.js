const { getConnection } = require('./src/config/db');

async function migrate() {
    let connection;
    try {
        connection = await getConnection();
        console.log('🚀 Starting migration: Fix folder_permissions index');

        // Check if index exists
        const [indexes] = await connection.execute('SHOW INDEX FROM folder_permissions WHERE Key_name = "unique_folder_user"');

        if (indexes.length > 0) {
            console.log('🗑️ Dropping old index: unique_folder_user');
            await connection.execute('ALTER TABLE folder_permissions DROP INDEX unique_folder_user');
        } else {
            console.log('ℹ️ Old index unique_folder_user not found or already dropped.');
        }

        // Add new unique index
        console.log('🏗️ Adding new unique index: unique_folder_user_type (folder_id, user_id, permission_type)');
        await connection.execute('ALTER TABLE folder_permissions ADD UNIQUE INDEX unique_folder_user_type (folder_id, user_id, permission_type)');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.release();
        process.exit(0);
    }
}

migrate();
