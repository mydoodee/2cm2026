const { getConnection } = require('./src/config/db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        console.log('--- Starting Project ID to UUID Migration ---');

        const tables = [
            'daily_stats', 'folders', 'payment_installments', 'payments', 'phases',
            'progress_summaries', 'project_images', 'project_permissions', 'project_phases',
            'project_tasks', 'project_user_invitations', 'project_user_roles',
            's_curve_actual', 's_curve_root', 'share_links', 'tasks'
        ];

        // 1. Add uuid column to projects if not exists
        console.log('Ensure uuid column exists in projects...');
        try {
            await connection.execute('ALTER TABLE projects ADD COLUMN uuid CHAR(36) AFTER project_id');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        // 2. Generate UUIDs for projects where uuid is null
        console.log('Generating UUIDs for existing projects...');
        const [projects] = await connection.execute('SELECT project_id, uuid FROM projects');
        let uuidGenerated = 0;
        for (const project of projects) {
            if (!project.uuid) {
                await connection.execute('UPDATE projects SET uuid = ? WHERE project_id = ?', [uuidv4(), project.project_id]);
                uuidGenerated++;
            }
        }
        console.log(`Generated ${uuidGenerated} UUIDs.`);

        // 3. Add project_uuid column to referencing tables
        for (const table of tables) {
            try {
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN project_uuid CHAR(36) AFTER project_id`);
            } catch (e) {
                 if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
            }
            
            console.log(`Mapping UUIDs to ${table}...`);
            // Check if project_id exists before joining
            const [desc] = await connection.execute(`DESCRIBE ${table}`);
            if (desc.some(c => c.Field === 'project_id' && c.Type.includes('int'))) {
                 await connection.execute(`
                    UPDATE ${table} t
                    JOIN projects p ON t.project_id = p.project_id
                    SET t.project_uuid = p.uuid
                    WHERE t.project_uuid IS NULL
                `);
            }
        }

        // 4. Drop Foreign Keys explicitly
        console.log('Dropping Foreign Keys...');
        const [fkResults] = await connection.execute(`
            SELECT TABLE_NAME, CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_NAME = 'projects' AND TABLE_SCHEMA = 'spk_cm2025'
        `);

        for (const fk of fkResults) {
            if (fk.CONSTRAINT_NAME !== 'PRIMARY' && fk.CONSTRAINT_NAME !== 'share_code') {
                try {
                    await connection.execute(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                    console.log(`Dropped FK ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
                } catch(e) {
                    if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
                }
            }
        }

        // 5. Drop Unique Constraints and Indices involving project_id
        console.log('Dropping indices and unique constraints...');
        const dropIndexSafe = async (table, index) => {
            try {
                await connection.execute(`ALTER TABLE ${table} DROP INDEX ${index}`);
                console.log(`Dropped index ${index} from ${table}`);
            } catch (e) {
                if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
            }
        };

        // Composite indices
        await dropIndexSafe('folders', 'unique_folder_name_per_project_parent');
        await dropIndexSafe('progress_summaries', 'unique_project_installment');
        await dropIndexSafe('project_user_roles', 'unique_project_user');

        // Single column unique indices
        await dropIndexSafe('payment_installments', 'project_id');
        await dropIndexSafe('project_permissions', 'project_id');

        // Other indices
        await dropIndexSafe('progress_summaries', 'idx_progress_summaries_project_id');
        await dropIndexSafe('project_images', 'project_id');
        await dropIndexSafe('project_phases', 'project_id');
        await dropIndexSafe('project_tasks', 'idx_project_id');
        await dropIndexSafe('project_user_invitations', 'project_id');
        await dropIndexSafe('s_curve_actual', 'idx_project');
        await dropIndexSafe('s_curve_root', 'idx_project_id');
        await dropIndexSafe('share_links', 'project_id');
        await dropIndexSafe('tasks', 'project_id');

        // DROP PRIMARY KEYS WHERE RELEVANT
        // project_user_roles has a composite PK (project_id, user_id, role_id)
        try {
            await connection.execute('ALTER TABLE project_user_roles DROP PRIMARY KEY');
            console.log('Dropped PRIMARY KEY from project_user_roles');
        } catch (e) {
            if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
        }

        // 6. Swap project_id in projects
        console.log('Updating projects primary key...');
        const [projDesc] = await connection.execute('DESCRIBE projects');
        const projIdCol = projDesc.find(c => c.Field === 'project_id');
        
        // Only do this if project_id is still an INT
        if (projIdCol && projIdCol.Type.includes('int')) {
            await connection.execute('ALTER TABLE projects MODIFY COLUMN project_id INT'); // Remove AUTO_INCREMENT
            await connection.execute('ALTER TABLE projects DROP PRIMARY KEY');
            await connection.execute('ALTER TABLE projects DROP COLUMN project_id');
            await connection.execute('ALTER TABLE projects CHANGE COLUMN uuid project_id CHAR(36)');
            await connection.execute('ALTER TABLE projects ADD PRIMARY KEY (project_id)');
        } else {
             console.log('projects table already has CHAR(36) project_id.');
        }

        // 7. Swap project_id in referencing tables
        for (const table of tables) {
            console.log(`Swapping project_id in ${table}...`);
            const [desc] = await connection.execute(`DESCRIBE ${table}`);
            const pIdCol = desc.find(c => c.Field === 'project_id');
            const pUuidCol = desc.find(c => c.Field === 'project_uuid');
            
            if (pIdCol && pIdCol.Type.includes('int')) {
                await connection.execute(`ALTER TABLE ${table} DROP COLUMN project_id`);
                if (pUuidCol) {
                    await connection.execute(`ALTER TABLE ${table} CHANGE COLUMN project_uuid project_id CHAR(36) NOT NULL`);
                }
            } else if (!pUuidCol && pIdCol && pIdCol.Type.includes('char(36)')) {
                 console.log(`${table} already swapped.`);
            }
        }

        // 8. Re-create Primary Keys, Foreign Keys & Constraints
        console.log('Re-creating constraints and foreign keys...');
        
        const addIndexSafe = async (query) => {
            try {
                await connection.execute(query);
            } catch (e) {
                if (e.code !== 'ER_DUP_KEYNAME' && e.code !== 'ER_MULTIPLE_PRI_KEY') throw e;
            }
        };

        // Recreate dropped PKs
        await addIndexSafe('ALTER TABLE project_user_roles ADD PRIMARY KEY (project_id, user_id, role_id)');

        await addIndexSafe('ALTER TABLE progress_summaries ADD UNIQUE KEY unique_project_installment (project_id, installment)');
        await addIndexSafe('ALTER TABLE project_user_roles ADD UNIQUE KEY unique_project_user (project_id, user_id)');

        for (const table of tables) {
            try {
                await connection.execute(`
                    ALTER TABLE ${table} 
                    ADD CONSTRAINT fk_${table}_project 
                    FOREIGN KEY (project_id) REFERENCES projects(project_id)
                    ON DELETE CASCADE
                `);
                console.log(`Added FK fk_${table}_project to ${table}`);
            } catch (e) {
                if (e.code !== 'ER_DUP_KEYNAME') {
                   console.error(`Failed to add FK for ${table}:`, e.message);
                }
            }
        }

        await connection.commit();
        console.log('--- Migration Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
