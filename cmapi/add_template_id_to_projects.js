const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });

  try {
    const [cols] = await connection.execute('DESCRIBE projects');
    const fields = cols.map(c => c.Field);
    console.log('Fields in projects table:', fields);
    
    if (!fields.includes('template_id')) {
      console.log('Adding template_id column to projects table...');
      await connection.execute('ALTER TABLE projects ADD COLUMN template_id INT NULL AFTER company_id');
      console.log('✅ Column added successfully.');
    } else {
      console.log('✅ Column template_id already exists.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

run();
