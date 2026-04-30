require('dotenv').config();
const mysql = require('mysql2/promise');

async function addColumn() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await conn.execute("SHOW COLUMNS FROM projects LIKE 'is_hidden'");
    if (rows.length > 0) {
      console.log('Column is_hidden already exists - skipping');
    } else {
      await conn.execute("ALTER TABLE projects ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER is_job_created");
      console.log('SUCCESS: Column is_hidden added to projects table');
    }
  } finally {
    await conn.end();
  }
}

addColumn().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
