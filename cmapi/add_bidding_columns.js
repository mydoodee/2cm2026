const { getConnection } = require('./src/config/db');

async function addBiddingColumns() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Adding columns to projects table...');

    // Add show_bidding
    try {
      await connection.execute(`
        ALTER TABLE projects 
        ADD COLUMN show_bidding TINYINT DEFAULT 1 AFTER show_cm
      `);
      console.log('Added show_bidding column.');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAMES') {
        console.log('show_bidding column already exists.');
      } else {
        throw e;
      }
    }

    // Add bidding_image
    try {
      await connection.execute(`
        ALTER TABLE projects 
        ADD COLUMN bidding_image VARCHAR(255) AFTER precast_image
      `);
      console.log('Added bidding_image column.');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAMES') {
        console.log('bidding_image column already exists.');
      } else {
        throw e;
      }
    }

    console.log('Database update complete.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    if (connection) {
      process.exit();
    }
  }
}

addBiddingColumns();
