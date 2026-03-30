const { getConnection } = require('./src/config/db');

async function findIndices() {
    let connection;
    try {
        connection = await getConnection();
        const tables = [
            'daily_stats', 'folders', 'payment_installments', 'payments', 'phases',
            'progress_summaries', 'project_images', 'project_permissions', 'project_phases',
            'project_tasks', 'project_user_invitations', 'project_user_roles',
            's_curve_actual', 's_curve_root', 'share_links', 'tasks'
        ];

        console.log('Searching for indices involving project_id...');
        
        const [results] = await connection.execute(`
            SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = 'spk_cm2025'
            AND TABLE_NAME IN (${tables.map(t => `'${t}'`).join(',')})
            AND COLUMN_NAME = 'project_id'
        `);

        console.table(results);

        // Also check if any unique constraints exist that are NOT necessarily in STATISTICS (though usually they are)
        const [constraints] = await connection.execute(`
            SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = 'spk_cm2025'
            AND TABLE_NAME IN (${tables.map(t => `'${t}'`).join(',')})
            AND CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
        `);
        console.log('Constraints:');
        console.table(constraints);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findIndices();
