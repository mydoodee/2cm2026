require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkProject() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await conn.execute("SELECT * FROM projects WHERE job_number = 'SPK-TEST333'");
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

checkProject().catch(err => console.error(err));
