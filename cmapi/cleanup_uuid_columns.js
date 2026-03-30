const { getConnection } = require('./src/config/db');

async function cleanup() {
    let connection;
    try {
        connection = await getConnection();

        const tables = [
            'daily_stats', 'folders', 'payment_installments', 'payments', 'phases',
            'progress_summaries', 'project_images', 'project_permissions', 'project_phases',
            'project_tasks', 'project_user_invitations', 'project_user_roles',
            's_curve_actual', 's_curve_root', 'share_links', 'tasks'
        ];

        for (const table of tables) {
            const [desc] = await connection.execute(`DESCRIBE ${table}`);
            const hasProjectUuid = desc.some(c => c.Field === 'project_uuid');
            if (hasProjectUuid) {
                console.log(`Dropping project_uuid from ${table}...`);
                await connection.execute(`ALTER TABLE ${table} DROP COLUMN project_uuid`);
            } else {
                console.log(`${table}: no project_uuid column, skipping.`);
            }
        }

        console.log('--- Cleanup Completed ---');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
