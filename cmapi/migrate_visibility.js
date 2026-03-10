const { getConnection } = require('./src/config/db');

async function migrate() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Migrating database...');

        const columnsToAdd = [
            'show_design TINYINT DEFAULT 1',
            'show_pre_construction TINYINT DEFAULT 1',
            'show_construction TINYINT DEFAULT 1',
            'show_precast TINYINT DEFAULT 1',
            'show_cm TINYINT DEFAULT 1'
        ];

        for (const column of columnsToAdd) {
            const columnName = column.split(' ')[0];
            const [check] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = ?
      `, [columnName]);

            if (check[0].count === 0) {
                console.log(`Adding column ${columnName}...`);
                await connection.execute(`ALTER TABLE projects ADD COLUMN ${column}`);
            } else {
                console.log(`Column ${columnName} already exists.`);
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

migrate();
