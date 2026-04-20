const { getConnection } = require('./config/db');

async function migrate() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Connected to database.');

    const [columns] = await connection.execute('SHOW COLUMNS FROM projects');
    const existingColumns = columns.map(c => c.Field);

    const newColumns = [
      { name: 'tender_doc_date', type: 'DATE' },
      { name: 'tender_project_number', type: 'VARCHAR(100)' },
      { name: 'tender_announcement_number', type: 'VARCHAR(100)' },
      { name: 'tender_organization', type: 'VARCHAR(255)' },
      { name: 'tender_item_description', type: 'TEXT' }
    ];

    for (const col of newColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await connection.execute(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }
    console.log('✅ Migration successful.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('Note: Some columns might already exist.');
    }
  } finally {
    if (connection) await connection.release();
    process.exit();
  }
}

migrate();
