const { getConnection } = require('./src/config/db');

async function analyzeSchema() {
  let connection;
  try {
    connection = await getConnection();
    const [results] = await connection.execute(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE (REFERENCED_TABLE_NAME = 'projects' AND TABLE_SCHEMA = 'spk_cm2025')
         OR (TABLE_NAME = 'projects' AND TABLE_SCHEMA = 'spk_cm2025')
    `);
    
    console.log('Project related foreign keys:');
    console.table(results);

    // Also get columns that might not have FKs but are named similarly
    const [allCols] = await connection.execute(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%project_id%'
      AND TABLE_SCHEMA = 'spk_cm2025'
    `);
    console.log('\nPotential project_id columns (heuristics):');
    console.table(allCols);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeSchema();
