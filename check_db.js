const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/cmapi/.env' });

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    const [tables] = await conn.execute('SHOW TABLES');
    console.log(tables);
    
    await conn.end();
  } catch (err) {
    console.error(err);
  }
}
run();
