const mysql = require('mysql2/promise');
require('dotenv').config();

// ตัวแปรควบคุมการ log จาก environment variable
const isLoggingEnabled = process.env.LOGGING_ENABLED === 'true';

// ฟังก์ชันสำหรับ log
const log = (...args) => {
  if (isLoggingEnabled) console.log(...args);
};

const logError = (...args) => {
  if (isLoggingEnabled) console.error(...args);
};

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
};

const pool = mysql.createPool(dbConfig);

const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    log('Database: Connection acquired from pool');
    return connection;
  } catch (error) {
    logError('Database: Error acquiring connection:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
    throw error;
  }
};

// ปิด pool เมื่อแอปพลิเคชันหยุด
process.on('SIGTERM', async () => {
  log('Database: Closing connection pool');
  try {
    await pool.end();
    log('Database: Connection pool closed successfully');
  } catch (error) {
    logError('Database: Error closing connection pool:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  }
});

module.exports = { getConnection, pool };