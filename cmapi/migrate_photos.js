const { getConnection } = require('./src/config/db');

async function migrate() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Creating s_curve_actual_history_photos table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS s_curve_actual_history_photos (
                photo_id INT AUTO_INCREMENT PRIMARY KEY,
                history_id INT NOT NULL,
                photo_path VARCHAR(500) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (history_id),
                FOREIGN KEY (history_id) REFERENCES s_curve_actual_history(history_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await connection.execute(createTableQuery);
        console.log('Table s_curve_actual_history_photos created successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

migrate();
