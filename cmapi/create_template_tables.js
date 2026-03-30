const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cm_new',
    port: parseInt(process.env.DB_PORT) || 3306
  });

  try {
    console.log('🚀 Starting migration: Create Folder Template Tables');

    // 1. Create folder_templates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS folder_templates (
        template_id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "folder_templates" created or already exists.');

    // 2. Create folder_template_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS folder_template_items (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        folder_name VARCHAR(255) NOT NULL,
        parent_item_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES folder_templates(template_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "folder_template_items" created or already exists.');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
