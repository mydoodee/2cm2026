const { getConnection } = require('./src/config/db');

async function cleanup() {
    let connection;
    try {
        connection = await getConnection();
        const userId = 6; // Palgai

        console.log(`--- Starting Cleanup for User ID: ${userId} (Palgai) ---`);

        // 1. Handle folder_permissions duplicates
        console.log('\n--- Cleaning folder_permissions ---');
        const [folderDupes] = await connection.execute(`
            SELECT folder_id, COUNT(*) as count 
            FROM folder_permissions 
            WHERE user_id = ? 
            GROUP BY folder_id 
            HAVING count > 1
        `, [userId]);

        console.log(`Found ${folderDupes.length} folders with duplicate permissions.`);

        for (const dupe of folderDupes) {
            // Get all IDs for this folder/user pair
            const [rows] = await connection.execute(
                'SELECT permission_id, permission_type FROM folder_permissions WHERE folder_id = ? AND user_id = ? ORDER BY permission_id ASC',
                [dupe.folder_id, userId]
            );

            console.log(`Folder ID ${dupe.folder_id}: Found ${rows.length} entries.`);
            
            // Logic: Keep the highest permission_type if they differ, or just keep the first one if same.
            // Order of priority: admin > write > read
            const priority = { 'admin': 3, 'write': 2, 'read': 1 };
            rows.sort((a, b) => priority[b.permission_type] - priority[a.permission_type]);

            const keepId = rows[0].permission_id;
            const deleteIds = rows.slice(1).map(r => r.permission_id);

            if (deleteIds.length > 0) {
                console.log(`  Keeping permission_id: ${keepId} (${rows[0].permission_type})`);
                console.log(`  Deleting permission_ids: ${deleteIds.join(', ')}`);
                
                await connection.execute(
                    `DELETE FROM folder_permissions WHERE permission_id IN (${deleteIds.map(() => '?').join(',')})`,
                    deleteIds
                );
            }
        }

        // 2. Handle project_permissions duplicates (just in case, though none found earlier)
        console.log('\n--- Cleaning project_permissions ---');
        const [projectDupes] = await connection.execute(`
            SELECT project_id, COUNT(*) as count 
            FROM project_permissions 
            WHERE user_id = ? 
            GROUP BY project_id 
            HAVING count > 1
        `, [userId]);

        console.log(`Found ${projectDupes.length} projects with duplicate permissions.`);

        for (const dupe of projectDupes) {
            const [rows] = await connection.execute(
                'SELECT permission_id, permission_type FROM project_permissions WHERE project_id = ? AND user_id = ? ORDER BY permission_id ASC',
                [dupe.project_id, userId]
            );

            const priority = { 'admin': 3, 'write': 2, 'read': 1 };
            rows.sort((a, b) => priority[b.permission_type] - priority[a.permission_type]);

            const keepId = rows[0].permission_id;
            const deleteIds = rows.slice(1).map(r => r.permission_id);

            if (deleteIds.length > 0) {
                console.log(`  Keeping permission_id: ${keepId} (${rows[0].permission_type})`);
                await connection.execute(
                    `DELETE FROM project_permissions WHERE permission_id IN (${deleteIds.map(() => '?').join(',')})`,
                    deleteIds
                );
            }
        }

        console.log('\n--- Cleanup Complete ---');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

cleanup();
