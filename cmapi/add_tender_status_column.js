const { getConnection } = require('./src/config/db');

async function addTenderStatusColumn() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Adding tender_status column to projects table...');

    try {
      await connection.execute(`
        ALTER TABLE projects 
        ADD COLUMN tender_status VARCHAR(50) DEFAULT 'tender_in_progress' AFTER status
      `);
      console.log('Added tender_status column.');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAMES') {
        console.log('tender_status column already exists.');
      } else {
        throw e;
      }
    }

    console.log('Database update complete.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    if (connection) {
      await connection.release();
      process.exit();
    }
  }
}

addTenderStatusColumn();
