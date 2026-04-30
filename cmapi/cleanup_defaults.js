require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanupDefaults() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const fields = [
    'progress_summary_image', 'payment_image', 'design_image', 
    'pre_construction_image', 'construction_image', 'cm_image', 
    'precast_image', 'bidding_image', 'job_status_image'
  ];

  try {
    for (const field of fields) {
      const [result] = await conn.execute(
        `UPDATE projects SET ${field} = NULL WHERE ${field} LIKE '%-default.%'`
      );
      console.log(`🧹 Cleaned up ${field}: ${result.affectedRows} rows`);
    }
  } finally {
    await conn.end();
  }
}

cleanupDefaults().catch(err => console.error(err));
