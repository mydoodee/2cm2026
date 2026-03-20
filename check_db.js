const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from cmapi
dotenv.config({ path: path.resolve('c:/Users/it/Desktop/WEB-MENU2GO/SPK/CM 2026/cmapi/.env') });

async function check() {
  console.log('Connecting to:', process.env.DB_HOST, 'Database:', process.env.DB_NAME);
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT) || 3306,
    });

    try {
      const [folders] = await connection.execute('SELECT * FROM folders');
      console.log(`Total folders in table: ${folders.length}`);
      
      const [activeFolders] = await connection.execute('SELECT * FROM folders WHERE active = 1');
      console.log(`Total active folders: ${activeFolders.length}`);

      const [projects] = await connection.execute('SELECT project_id, project_name FROM projects WHERE active = 1');
      console.log(`Total active projects: ${projects.length}`);
      
      console.log('\n--- Project Folder Counts ---');
      for (const project of projects) {
          const [projectFolders] = await connection.execute('SELECT count(*) as count FROM folders WHERE project_id = ? AND active = 1', [project.project_id]);
          if (projectFolders[0].count > 0) {
            console.log(`Project: ${project.project_name} (ID: ${project.project_id}) - Folders: ${projectFolders[0].count}`);
          }
      }

      console.log('\n--- Recent Folders ---');
      const [recent] = await connection.execute('SELECT folder_id, folder_name, project_id, active, created_at FROM folders ORDER BY created_at DESC LIMIT 10');
      console.table(recent);

    } catch (error) {
      console.error('Query Error:', error);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Connection Error:', error);
  }
}

check();
