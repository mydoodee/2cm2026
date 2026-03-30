const { getConnection } = require('./src/config/db');

async function migrate() {
    let connection;
    try {
        connection = await getConnection();
        
        console.log('--- Starting Index Migration ---');

        // 1. Update folder_permissions
        console.log('\nUpdating folder_permissions indexes...');
        // Drop old non-unique index if exists (already checked earlier, it has 'folder_id' and 'user_id' separately as MUL)
        // Drop the faulty unique index
        try {
            await connection.execute('ALTER TABLE folder_permissions DROP INDEX unique_folder_user_type');
            console.log('  Dropped index unique_folder_user_type');
        } catch (e) {
            console.log('  Index unique_folder_user_type not found or already dropped.');
        }

        // Add new strict unique index (changed back to allow multiple types for same user)
        try {
            await connection.execute('ALTER TABLE folder_permissions DROP INDEX unique_folder_user');
        } catch (e) {}

        try {
            await connection.execute('CREATE UNIQUE INDEX unique_folder_user_type ON folder_permissions (folder_id, user_id, permission_type)');
            console.log('  Created unique index unique_folder_user_type (folder_id, user_id, permission_type)');
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                console.error('  ❌ Error: Cannot create unique index. Duplicate entries still exist!');
            } else {
                console.error('  Error creating index:', e.message);
            }
        }

        // 2. Update project_user_roles
        console.log('\nUpdating project_user_roles indexes...');
        // The current PK is (project_id, user_id, role_id). We want it to be (project_id, user_id) OR add a UNIQUE constraint.
        // Let's add a UNIQUE index first, as changing PK might be more disruptive if other tables FK to it (though unlikely for these junction tables).
        try {
            await connection.execute('CREATE UNIQUE INDEX unique_project_user ON project_user_roles (project_id, user_id)');
            console.log('  Created unique index unique_project_user (project_id, user_id)');
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                console.error('  ❌ Error: Cannot create unique index. Duplicate entries still exist!');
            } else {
                console.error('  Error creating index:', e.message);
            }
        }

        console.log('\n--- Migration Complete ---');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

migrate();
