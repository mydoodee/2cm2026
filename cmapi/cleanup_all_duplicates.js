const { getConnection } = require('./src/config/db');

async function cleanupAll() {
    let connection;
    try {
        connection = await getConnection();
        
        console.log('--- Starting Global Cleanup for Duplicate Permissions ---');

        // 1. Find ALL user-folder pairs with duplicates
        const [dupes] = await connection.execute(`
            SELECT user_id, folder_id, COUNT(*) as count 
            FROM folder_permissions 
            GROUP BY user_id, folder_id 
            HAVING count > 1
        `);

        console.log(`Found ${dupes.length} user-folder pairs with duplicates.`);

        const priority = { 'admin': 3, 'write': 2, 'read': 1 };

        for (const dupe of dupes) {
            const { user_id, folder_id } = dupe;
            
            // Get all entries for this specific pair
            const [rows] = await connection.execute(
                'SELECT permission_id, permission_type FROM folder_permissions WHERE folder_id = ? AND user_id = ?',
                [folder_id, user_id]
            );

            // Sort by priority (desc) then by ID (asc) to keep the "best" or "oldest" one
            rows.sort((a, b) => {
                if (priority[b.permission_type] !== priority[a.permission_type]) {
                    return priority[b.permission_type] - priority[a.permission_type];
                }
                return a.permission_id - b.permission_id;
            });

            const keepId = rows[0].permission_id;
            const deleteIds = rows.slice(1).map(r => r.permission_id);

            if (deleteIds.length > 0) {
                console.log(`User ${user_id}, Folder ${folder_id}: Keeping ${keepId} (${rows[0].permission_type}), Deleting [${deleteIds.join(', ')}]`);
                
                await connection.execute(
                    `DELETE FROM folder_permissions WHERE permission_id IN (${deleteIds.map(() => '?').join(',')})`,
                    deleteIds
                );
            }
        }

        // 2. Do the same for project_permissions (just to be safe)
        const [projDupes] = await connection.execute(`
            SELECT user_id, project_id, COUNT(*) as count 
            FROM project_permissions 
            GROUP BY user_id, project_id 
            HAVING count > 1
        `);

        console.log(`\nFound ${projDupes.length} user-project pairs with duplicates.`);

        for (const dupe of projDupes) {
            const { user_id, project_id } = dupe;
            const [rows] = await connection.execute(
                'SELECT permission_id, permission_type FROM project_permissions WHERE project_id = ? AND user_id = ?',
                [project_id, user_id]
            );

            rows.sort((a, b) => {
                if (priority[b.permission_type] !== priority[a.permission_type]) {
                    return priority[b.permission_type] - priority[a.permission_type];
                }
                return a.permission_id - b.permission_id;
            });

            const keepId = rows[0].permission_id;
            const deleteIds = rows.slice(1).map(r => r.permission_id);

            if (deleteIds.length > 0) {
                console.log(`User ${user_id}, Project ${project_id}: Keeping ${keepId} (${rows[0].permission_type}), Deleting [${deleteIds.join(', ')}]`);
                await connection.execute(
                    `DELETE FROM project_permissions WHERE permission_id IN (${deleteIds.map(() => '?').join(',')})`,
                    deleteIds
                );
            }
        }

        // 3. Handle project_user_roles duplicates
        console.log('\n--- Cleaning project_user_roles ---');
        const [purDupes] = await connection.execute(`
            SELECT user_id, project_id, COUNT(*) as count 
            FROM project_user_roles 
            GROUP BY user_id, project_id 
            HAVING count > 1
        `);

        console.log(`Found ${purDupes.length} user-project pairs with duplicate roles.`);

        for (const dupe of purDupes) {
            const { user_id, project_id } = dupe;
            const [rows] = await connection.execute(
                'SELECT project_id, user_id, role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
                [project_id, user_id]
            );

            // Sort by role priority (admin=1 is usually highest in this system but roles table should be checked)
            // For now, keep the one with role_id 1 if exists, otherwise the first one.
            rows.sort((a, b) => {
                if (a.role_id === 1) return -1;
                if (b.role_id === 1) return 1;
                return a.role_id - b.role_id;
            });

            const keep = rows[0];
            const toDelete = rows.slice(1);

            if (toDelete.length > 0) {
                console.log(`User ${user_id}, Project ${project_id}: Keeping role ${keep.role_id}, Deleting roles [${toDelete.map(r => r.role_id).join(', ')}]`);
                
                for (const row of toDelete) {
                    await connection.execute(
                        'DELETE FROM project_user_roles WHERE project_id = ? AND user_id = ? AND role_id = ?',
                        [project_id, user_id, row.role_id]
                    );
                }
            }
        }

        console.log('\n--- Global Cleanup Complete ---');

    } catch (error) {
        console.error('Error during global cleanup:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

cleanupAll();
