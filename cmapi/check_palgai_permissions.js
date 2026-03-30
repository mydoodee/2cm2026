const { getConnection } = require('./src/config/db');

async function checkDuplicates() {
    let connection;
    try {
        connection = await getConnection();
        
        // 0. Check users table schema
        console.log('--- Checking users table schema ---');
        const [columns] = await connection.execute('SHOW COLUMNS FROM users');
        console.table(columns);
        
        const idColumn = 'user_id';
        const nameColumn = 'username';
        const firstNameColumn = 'first_name';
        const lastNameColumn = 'last_name';

        console.log(`Detected columns - ID: ${idColumn}, Username: ${nameColumn}, Name: ${firstNameColumn} ${lastNameColumn}`);

        // 1. Find the user 'Palgai'
        console.log(`--- Searching for User: Palgai ---`);
        const [users] = await connection.execute(
            `SELECT ${idColumn}, ${nameColumn}, ${firstNameColumn}, ${lastNameColumn} FROM users WHERE ${nameColumn} LIKE ? OR ${firstNameColumn} LIKE ? OR ${lastNameColumn} LIKE ?`, 
            ['%Palgai%', '%Palgai%', '%Palgai%']
        );
        console.table(users);

        if (users.length === 0) {
            console.log('User Palgai not found.');
            return;
        }

        const userId = users[0][idColumn];
        console.log(`Found User ID: ${userId}`);

        // 2. Check for duplicate project permissions
        console.log('\n--- Checking project_permissions duplicates ---');
        const [projectPerms] = await connection.execute(`
            SELECT project_id, user_id, COUNT(*) as count 
            FROM project_permissions 
            WHERE user_id = ? 
            GROUP BY project_id, user_id 
            HAVING count > 1
        `, [userId]);
        
        if (projectPerms.length > 0) {
            console.log('Duplicate project permissions found:');
            console.table(projectPerms);
            
            for (const dp of projectPerms) {
                const [details] = await connection.execute(
                    'SELECT id, project_id, role_id FROM project_permissions WHERE project_id = ? AND user_id = ?',
                    [dp.project_id, userId]
                );
                console.log(`Details for project_id ${dp.project_id}:`);
                console.table(details);
            }
        } else {
            console.log('No duplicate project permissions found.');
        }

        // 3. Check for duplicate folder permissions
        console.log('\n--- Checking folder_permissions duplicates ---');
        // Let's first see what columns are in folder_permissions to be sure
        const [folderColumns] = await connection.execute('SHOW COLUMNS FROM folder_permissions');
        const hasProjectId = folderColumns.some(c => c.Field === 'project_id');
        
        const folderPermsQuery = `
            SELECT folder_id, user_id, ${hasProjectId ? 'project_id,' : ''} COUNT(*) as count 
            FROM folder_permissions 
            WHERE user_id = ? 
            GROUP BY folder_id, user_id ${hasProjectId ? ', project_id' : ''}
            HAVING count > 1
        `;
        
        const [folderPerms] = await connection.execute(folderPermsQuery, [userId]);
        
        if (folderPerms.length > 0) {
            console.log('Duplicate folder permissions found:');
            console.table(folderPerms);

            for (const df of folderPerms) {
                const [details] = await connection.execute(
                    `SELECT id, folder_id ${hasProjectId ? ', project_id' : ''}, can_read, can_write, can_delete FROM folder_permissions WHERE folder_id = ? AND user_id = ?`,
                    [df.folder_id, userId]
                );
                console.log(`Details for folder_id ${df.folder_id}:`);
                console.table(details);
            }
        } else {
            console.log('No duplicate folder permissions found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

checkDuplicates();
