const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve('c:/Users/it/Desktop/WEB-MENU2GO/SPK/CM 2026/cmapi/.env') });

async function checkSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT) || 3306,
    });

    try {
      const [columns] = await connection.execute('DESCRIBE users');
      console.table(columns);
    } catch (error) {
      console.error('Query Error:', error);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Connection Error:', error);
  }
}

checkSchema();
