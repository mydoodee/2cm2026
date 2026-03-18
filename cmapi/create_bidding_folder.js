const { getConnection } = require('./src/config/db');

async function createBiddingFolder() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Database: Connection acquired');
    
    const projectId = 6;
    const folderName = 'Bidding';
    
    // Check if it exists first
    const [existing] = await connection.execute(
      'SELECT folder_id FROM folders WHERE project_id = ? AND folder_name = ? AND parent_folder_id IS NULL',
      [projectId, folderName]
    );
    
    if (existing.length > 0) {
      console.log(`Folder "${folderName}" already exists for project ${projectId} (ID: ${existing[0].folder_id})`);
    } else {
      const [result] = await connection.execute(
        'INSERT INTO folders (project_id, folder_name, parent_folder_id, created_by) VALUES (?, ?, NULL, ?)',
        [projectId, folderName, 1]
      );
      console.log(`Created "${folderName}" folder for project ${projectId} (ID: ${result.insertId})`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      process.exit();
    }
  }
}

createBiddingFolder();
