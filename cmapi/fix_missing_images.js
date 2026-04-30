require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;

async function fixMissingImages() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const uploadDir = path.join(process.cwd(), 'Uploads');
  const defaultImageMap = {
    progress_summary_image: 'progress_summary.jpg',
    payment_image: 'payment.jpg',
    design_image: 'Design.jpg',
    pre_construction_image: 'pre_construction.png',
    construction_image: 'construction.jpg',
    precast_image: 'precast.jpg',
    cm_image: 'cm.jpg',
    bidding_image: 'bidding.jpg',
    job_status_image: 'job_status.jpg'
  };

  try {
    const [projects] = await conn.execute("SELECT * FROM projects");
    
    for (const project of projects) {
      const updates = {};
      const values = [];
      
      for (const [key, defaultFileName] of Object.entries(defaultImageMap)) {
        if (!project[key]) {
          const defaultSrcPath = path.join(uploadDir, 'Defaults', defaultFileName);
          try {
            await fs.access(defaultSrcPath);
            const fileName = `${key}-${project.project_id}-default${path.extname(defaultFileName)}`;
            const destPath = path.join(uploadDir, fileName);
            
            await fs.copyFile(defaultSrcPath, destPath);
            updates[key] = `Uploads/${fileName}`;
            values.push(`Uploads/${fileName}`);
          } catch (err) {
            // Default file not found, skip
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        await conn.execute(
          `UPDATE projects SET ${fields} WHERE project_id = ?`,
          [...values, project.project_id]
        );
        console.log(`✅ Fixed images for project: ${project.job_number || project.project_id}`);
      }
    }
  } finally {
    await conn.end();
  }
}

fixMissingImages().catch(err => console.error(err));
