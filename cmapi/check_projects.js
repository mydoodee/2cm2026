const { getConnection } = require('./src/config/db');
const { pool } = require('./src/config/db');
async function checkProjects() {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('DESCRIBE users');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    if (connection) await connection.release();
    await pool.end();
    process.exit();
  }
}
checkProjects();
