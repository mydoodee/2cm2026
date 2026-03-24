const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306,
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');

        // Check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "is_pm"');
        
        if (columns.length === 0) {
            await connection.query('ALTER TABLE users ADD COLUMN is_pm TINYINT(1) DEFAULT 0 AFTER active');
            console.log('Column is_pm added to users table.');
        } else {
            console.log('Column is_pm already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
