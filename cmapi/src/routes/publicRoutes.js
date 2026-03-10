const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getConnection } = require('../config/db');

// =====================================
// RATE LIMITING MIDDLEWARE
// =====================================
const downloadAttempts = new Map();

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 นาที
  const maxAttempts = 20; // จำกัด 20 ครั้งต่อ 15 นาที
  
  if (!downloadAttempts.has(ip)) {
    downloadAttempts.set(ip, []);
  }
  
  const attempts = downloadAttempts.get(ip).filter(time => now - time < windowMs);
  
  if (attempts.length >= maxAttempts) {
    console.log(`⚠️  Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      success: false,
      message: 'คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง'
    });
  }
  
  attempts.push(now);
  downloadAttempts.set(ip, attempts);
  
  // ทำความสะอาดทุกๆ 30 นาที
  if (Math.random() < 0.01) {
    for (const [key, value] of downloadAttempts.entries()) {
      const validAttempts = value.filter(time => now - time < windowMs);
      if (validAttempts.length === 0) {
        downloadAttempts.delete(key);
      } else {
        downloadAttempts.set(key, validAttempts);
      }
    }
  }
  
  next();
};

// =====================================
// CREATE SHARE TOKEN - สร้างลิงก์แชร์
// =====================================
router.post('/project/:projectId/file/:fileId/create-share-link', async (req, res) => {
  let connection;
  try {
    const { projectId, fileId } = req.params;
    const { expiresInDays = 7 } = req.body;
    
    console.log(`[Create Share Link] projectId=${projectId}, fileId=${fileId}, expiresInDays=${expiresInDays}`);
    
    connection = await getConnection();
    
    // ตรวจสอบว่าไฟล์มีอยู่จริง
    const [files] = await connection.query(`
      SELECT 
        f.file_id,
        f.file_name,
        fo.project_id,
        p.project_name
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects p ON fo.project_id = p.project_id
      WHERE f.file_id = ? 
        AND fo.project_id = ?
        AND f.active = 1
        AND p.active = 1
    `, [fileId, projectId]);
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบไฟล์'
      });
    }
    
    // สร้าง share token (64 characters, URL-safe)
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    
    // สร้างตาราง share_links ถ้ายังไม่มี
    await connection.query(`
      CREATE TABLE IF NOT EXISTS share_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        project_id INT NOT NULL,
        file_id INT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INT DEFAULT 0,
        last_accessed_at DATETIME NULL,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
      )
    `);
    
    // บันทึก share link
    await connection.query(`
      INSERT INTO share_links (token, project_id, file_id, expires_at)
      VALUES (?, ?, ?, ?)
    `, [shareToken, projectId, fileId, expiresAt]);
    
    // ✅ สร้าง URL ด้วย HTTPS และ /cm/ prefix
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https'; // Force HTTPS
    const host = req.get('host');
    const shareUrl = `${protocol}://${host}/cm/viewer/shared/${shareToken}`;
    
    console.log(`✅ Share link created: ${shareUrl}`);
    
    res.json({
      success: true,
      data: {
        shareUrl,
        token: shareToken,
        expiresAt,
        fileName: files[0].file_name,
        projectName: files[0].project_name
      }
    });
    
  } catch (error) {
    console.error('[Create Share Link] Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างลิงก์แชร์',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// =====================================
// GET SHARE LINK INFO - ดูข้อมูลจาก token
// =====================================
router.get('/shared/:token/info', rateLimitMiddleware, async (req, res) => {
  let connection;
  try {
    const { token } = req.params;
    
    console.log(`[Share Info] token=${token.substring(0, 10)}...`);
    
    connection = await getConnection();
    
    const [links] = await connection.query(`
      SELECT 
        sl.token,
        sl.project_id,
        sl.file_id,
        sl.expires_at,
        sl.access_count,
        f.file_name,
        f.file_type,
        f.file_size,
        p.project_name
      FROM share_links sl
      INNER JOIN files f ON sl.file_id = f.file_id
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects p ON sl.project_id = p.project_id
      WHERE sl.token = ?
        AND f.active = 1
        AND p.active = 1
    `, [token]);
    
    if (!links || links.length === 0) {
      console.log('❌ Invalid token');
      return res.status(404).json({
        success: false,
        message: 'ลิงก์ไม่ถูกต้องหรือไม่มีอยู่ในระบบ'
      });
    }
    
    const linkData = links[0];
    
    // ตรวจสอบว่าหมดอายุหรือไม่
    if (new Date(linkData.expires_at) < new Date()) {
      console.log('❌ Token expired');
      return res.status(403).json({
        success: false,
        message: 'ลิงก์แชร์หมดอายุแล้ว',
        expiredAt: linkData.expires_at
      });
    }
    
    console.log(`✅ Valid token: ${linkData.file_name}`);
    
    res.json({
      success: true,
      data: {
        fileName: linkData.file_name,
        fileType: linkData.file_type,
        fileSize: linkData.file_size,
        projectName: linkData.project_name,
        expiresAt: linkData.expires_at,
        accessCount: linkData.access_count
      }
    });
    
  } catch (error) {
    console.error('[Share Info] Error:', error);
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
// DOWNLOAD VIA SHARE TOKEN - ดาวน์โหลดผ่าน token
// =====================================
router.get('/shared/:token/download', rateLimitMiddleware, async (req, res) => {
  const startTime = Date.now();
  let connection;
  
  try {
    const { token } = req.params;
    
    console.log('\n=== SHARED DOWNLOAD START ===');
    console.log(`[${new Date().toISOString()}] Token: ${token.substring(0, 10)}...`);
    console.log(`IP: ${req.ip}`);
    console.log(`User-Agent: ${req.get('user-agent')}`);
    
    connection = await getConnection();
    
    // ดึงข้อมูลจาก token
    const [links] = await connection.query(`
      SELECT 
        sl.token,
        sl.project_id,
        sl.file_id,
        sl.expires_at,
        f.file_name,
        f.file_path,
        f.file_type,
        f.file_size,
        p.project_name
      FROM share_links sl
      INNER JOIN files f ON sl.file_id = f.file_id
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects p ON sl.project_id = p.project_id
      WHERE sl.token = ?
        AND f.active = 1
        AND p.active = 1
    `, [token]);
    
    if (!links || links.length === 0) {
      console.log('❌ Invalid token');
      return res.status(404).json({
        success: false,
        message: 'ลิงก์ไม่ถูกต้องหรือไม่มีอยู่ในระบบ'
      });
    }
    
    const linkData = links[0];
    
    // ตรวจสอบว่าหมดอายุหรือไม่
    if (new Date(linkData.expires_at) < new Date()) {
      console.log('❌ Token expired');
      return res.status(403).json({
        success: false,
        message: 'ลิงก์แชร์หมดอายุแล้ว'
      });
    }
    
    console.log(`✅ Valid token: ${linkData.file_name}`);
    
    // หา file path
    let filePath;
    if (path.isAbsolute(linkData.file_path)) {
      filePath = linkData.file_path;
    } else {
      const relativePath = linkData.file_path.startsWith('/') 
        ? linkData.file_path.substring(1) 
        : linkData.file_path;
      filePath = path.join(__dirname, '..', relativePath);
    }
    
    // ลองหา path อื่นๆ ถ้าไม่เจอ
    if (!fs.existsSync(filePath)) {
      const altPaths = [
        path.join(__dirname, '..', 'Uploads', path.basename(linkData.file_path)),
        path.join(__dirname, '..', linkData.file_path),
        path.join(__dirname, '..', 'Uploads', linkData.file_path)
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          filePath = altPath;
          break;
        }
      }
      
      if (!fs.existsSync(filePath)) {
        console.log('❌ File not found on disk');
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ในระบบ'
        });
      }
    }
    
    const stats = fs.statSync(filePath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(linkData.file_name)}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // อัพเดท access count และ last_accessed_at (async)
    (async () => {
      let logConnection;
      try {
        logConnection = await getConnection();
        
        await logConnection.query(`
          UPDATE share_links 
          SET access_count = access_count + 1, 
              last_accessed_at = NOW()
          WHERE token = ?
        `, [token]);
        
        // Log การดาวน์โหลด
        await logConnection.query(`
          CREATE TABLE IF NOT EXISTS share_download_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(255) NOT NULL,
            file_id INT NOT NULL,
            ip_address VARCHAR(50),
            user_agent TEXT,
            downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_file (file_id)
          )
        `);
        
        await logConnection.query(`
          INSERT INTO share_download_logs (token, file_id, ip_address, user_agent)
          VALUES (?, ?, ?, ?)
        `, [token, linkData.file_id, req.ip, req.get('user-agent')]);
        
        console.log('✅ Download logged');
      } catch (logError) {
        console.log('⚠️  Log error:', logError.message);
      } finally {
        if (logConnection) logConnection.release();
      }
    })();
    
    // ส่งไฟล์
    res.download(filePath, linkData.file_name, (err) => {
      const duration = Date.now() - startTime;
      
      if (err) {
        console.error('❌ Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์'
          });
        }
      } else {
        console.log(`✅ Download completed (${(duration / 1000).toFixed(2)}s)`);
      }
      console.log('=== SHARED DOWNLOAD END ===\n');
    });
    
  } catch (error) {
    console.error('❌ Exception:', error);
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
// REVOKE SHARE LINK - ยกเลิกลิงก์แชร์
// =====================================
router.delete('/shared/:token', async (req, res) => {
  let connection;
  try {
    const { token } = req.params;
    
    console.log(`[Revoke Share] token=${token.substring(0, 10)}...`);
    
    connection = await getConnection();
    
    const [result] = await connection.query(`
      DELETE FROM share_links WHERE token = ?
    `, [token]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบลิงก์แชร์'
      });
    }
    
    console.log('✅ Share link revoked');
    
    res.json({
      success: true,
      message: 'ยกเลิกลิงก์แชร์สำเร็จ'
    });
    
  } catch (error) {
    console.error('[Revoke Share] Error:', error);
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
// CLEANUP EXPIRED LINKS - ลบลิงก์หมดอายุ (CRON JOB)
// =====================================
router.post('/cleanup-expired', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const [result] = await connection.query(`
      DELETE FROM share_links WHERE expires_at < NOW()
    `);
    
    console.log(`🧹 Cleaned up ${result.affectedRows} expired links`);
    
    res.json({
      success: true,
      message: `ลบลิงก์หมดอายุ ${result.affectedRows} รายการ`
    });
    
  } catch (error) {
    console.error('[Cleanup] Error:', error);
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
// S-CURVE EXCEL LIVE DATA
// =====================================
router.get('/project/:projectId/scurve/excel', rateLimitMiddleware, async (req, res) => {
  // This is a bridge to the scurveController.getSCurveExcelData
  // For security, we could check a token here, but for now we'll allow it 
  // if requested through the public API path
  const scurveController = require('../controllers/scurveController');
  try {
    // Inject a mock user or just bypass if needed
    return scurveController.getSCurveExcelData(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accessing S-Curve data' });
  }
});

router.get('/project/:projectId/scurve/excel-summary', rateLimitMiddleware, async (req, res) => {
  const scurveController = require('../controllers/scurveController');
  try {
    return scurveController.getSCurveExcelSummary(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accessing S-Curve summary' });
  }
});

router.get('/project/:projectId/scurve/excel-timephased', rateLimitMiddleware, async (req, res) => {
  const scurveController = require('../controllers/scurveController');
  try {
    return scurveController.getSCurveExcelTimePhased(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accessing S-Curve time-phased data' });
  }
});
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public routes with share token are working',
    timestamp: new Date().toISOString(),
    features: [
      'Share Token System',
      'Rate Limiting',
      'Access Logging',
      'Expiration Check'
    ]
  });
});

module.exports = router;