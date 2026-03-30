const { getConnection } = require('./src/config/db');

async function addPhaseProgressColumns() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Database: Connection acquired');

    const columnsToAdd = [
      { name: 'bidding_progress', type: 'INT DEFAULT 0' },
      { name: 'design_progress', type: 'INT DEFAULT 0' },
      { name: 'pre_construction_progress', type: 'INT DEFAULT 0' },
      { name: 'construction_progress', type: 'INT DEFAULT 0' },
      { name: 'precast_progress', type: 'INT DEFAULT 0' },
      { name: 'cm_progress', type: 'INT DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.execute(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${col.name}`);
        } else {
          throw err;
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database: Connection closed');
    }
    process.exit();
  }
}

addPhaseProgressColumns();
