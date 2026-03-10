//routes/public.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getConnection } = require('../config/db');

// =====================================
// PUBLIC FILE DOWNLOAD - ไม่ต้อง authenticate
// ✅ แก้ไข: ไม่เช็ค is_public = 1 แล้ว (แชร์ได้ทุก project)
// =====================================
router.get('/project/:projectId/file/:fileId/download', async (req, res) => {
  const startTime = Date.now();
  let connection;
  
  try {
    const { projectId, fileId } = req.params;
    
    console.log('\n=== PUBLIC DOWNLOAD START ===');
    console.log(`[${new Date().toISOString()}] ProjectID: ${projectId}, FileID: ${fileId}`);
    console.log(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`IP: ${req.ip}`);
    console.log(`User-Agent: ${req.get('user-agent')}`);
    
    connection = await getConnection();
    
    // ✅ แก้ไข: ลบเงื่อนไข p.is_public = 1 ออก
    const [files] = await connection.query(`
      SELECT 
        f.file_id,
        f.file_name,
        f.file_path,
        f.file_type,
        f.file_size,
        f.active,
        fo.folder_id,
        fo.folder_name,
        fo.project_id,
        p.project_name,
        p.active as project_active
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects p ON fo.project_id = p.project_id
      WHERE f.file_id = ? 
        AND fo.project_id = ?
        AND f.active = 1
        AND p.active = 1
    `, [fileId, projectId]);
    
    console.log(`Query took: ${Date.now() - startTime}ms`);
    
    if (!files || files.length === 0) {
      console.log('❌ File not found');
      console.log('=== PUBLIC DOWNLOAD END ===\n');
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบไฟล์' 
      });
    }
    
    const fileData = files[0];
    
    console.log('✅ File found in database:');
    console.log(JSON.stringify({
      file_id: fileData.file_id,
      file_name: fileData.file_name,
      file_path: fileData.file_path,
      file_size: fileData.file_size,
      project_name: fileData.project_name,
      folder_name: fileData.folder_name
    }, null, 2));
    
    // สร้าง absolute path ที่ถูกต้อง
    let filePath;
    
    if (path.isAbsolute(fileData.file_path)) {
      filePath = fileData.file_path;
      console.log('Path type: Absolute');
    } else {
      const relativePath = fileData.file_path.startsWith('/') 
        ? fileData.file_path.substring(1) 
        : fileData.file_path;
      
      filePath = path.join(__dirname, '..', relativePath);
      console.log('Path type: Relative');
    }
    
    console.log(`Full file path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found on disk');
      
      const altPath1 = path.join(__dirname, '..', 'Uploads', path.basename(fileData.file_path));
      const altPath2 = path.join(__dirname, '..', fileData.file_path);
      const altPath3 = path.join(__dirname, '..', 'Uploads', fileData.file_path);
      
      if (fs.existsSync(altPath1)) {
        filePath = altPath1;
      } else if (fs.existsSync(altPath2)) {
        filePath = altPath2;
      } else if (fs.existsSync(altPath3)) {
        filePath = altPath3;
      } else {
        return res.status(404).json({ 
          success: false,
          message: 'ไม่พบไฟล์ในระบบ'
        });
      }
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ 
        success: false,
        message: 'Path ไม่ใช่ไฟล์' 
      });
    }
    
    console.log(`File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.file_name)}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Log download (async - ไม่ blocking)
    (async () => {
      let logConnection;
      try {
        logConnection = await getConnection();
        await logConnection.query(`
          INSERT INTO download_logs (file_id, download_type, ip_address, user_agent)
          VALUES (?, 'public', ?, ?)
        `, [fileId, req.ip, req.get('user-agent')]);
        console.log('✅ Download log saved');
      } catch (logError) {
        console.log('⚠️  Log insert failed:', logError.message);
      } finally {
        if (logConnection) logConnection.release();
      }
    })();
    
    console.log(`Sending file: ${fileData.file_name}`);
    
    // Send file
    res.download(filePath, fileData.file_name, (err) => {
      const duration = Date.now() - startTime;
      
      if (err) {
        console.error('❌ Download error:', err);
        console.log(`Duration: ${duration}ms`);
        
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์'
          });
        }
      } else {
        console.log(`✅ Download completed successfully`);
        console.log(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
        console.log(`Speed: ${(stats.size / 1024 / 1024 / (duration / 1000)).toFixed(2)} MB/s`);
        console.log('=== PUBLIC DOWNLOAD END ===\n');
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Exception:', error);
    console.log(`Duration: ${duration}ms`);
    console.log('=== PUBLIC DOWNLOAD EXCEPTION ===\n');
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } finally {
    if (connection) connection.release();
  }
});

// =====================================
// PUBLIC PROJECT INFO
// ✅ แก้ไข: ไม่เช็ค is_public = 1 แล้ว
// =====================================
router.get('/project/:projectId', async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    
    console.log(`[Public Project] Getting project: ${projectId}`);
    
    connection = await getConnection();
    
    const [projects] = await connection.query(`
      SELECT 
        project_id,
        project_name,
        description,
        image,
        status,
        progress,
        job_number,
        start_date,
        end_date
      FROM projects 
      WHERE project_id = ? 
        AND active = 1
    `, [projectId]);
    
    if (!projects || projects.length === 0) {
      console.log('[Public Project] Project not found');
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบโปรเจกต์' 
      });
    }
    
    const project = projects[0];
    
    console.log('[Public Project] Project found:', project.project_name);
    
    res.json({
      success: true,
      data: project
    });
    
  } catch (error) {
    console.error('[Public Project] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// =====================================
// PUBLIC FILE INFO
// ✅ แก้ไข: ไม่เช็ค is_public = 1 แล้ว
// =====================================
router.get('/project/:projectId/file/:fileId', async (req, res) => {
  let connection;
  try {
    const { projectId, fileId } = req.params;
    
    console.log(`[Public File Info] Getting file info: projectId=${projectId}, fileId=${fileId}`);
    
    connection = await getConnection();
    
    const [files] = await connection.query(`
      SELECT 
        f.file_id,
        f.file_name,
        f.file_type,
        f.file_size,
        f.created_at,
        p.project_name,
        p.project_id,
        fo.folder_name
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects p ON fo.project_id = p.project_id
      WHERE f.file_id = ? 
        AND fo.project_id = ?
        AND f.active = 1
        AND p.active = 1
    `, [fileId, projectId]);
    
    if (!files || files.length === 0) {
      console.log('[Public File Info] File not found');
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบไฟล์' 
      });
    }
    
    const fileData = files[0];
    
    console.log('[Public File Info] File found:', fileData.file_name);
    
    res.json({
      success: true,
      data: fileData
    });
    
  } catch (error) {
    console.error('[Public File Info] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// =====================================
// HEALTH CHECK
// =====================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public routes are working (no is_public check)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;