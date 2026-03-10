// controllers/statusController.js
const { getConnection } = require('../config/db');

// ⭐ Helper function สำหรับ emit WebSocket events
// ⭐ Helper function สำหรับ emit WebSocket events
function emitFileActivity(projectId, activityData) {
  if (global.io) {
    // Emit to specific project room
    global.io.to(`project:${projectId}`).emit('file-activity', {
      ...activityData,
      project_id: projectId,
      timestamp: new Date()
    });
    
    // Emit to all users (for "all projects" view)
    global.io.emit('file-activity-global', {
      ...activityData,
      project_id: projectId,
      timestamp: new Date()
    });
  } else {
  }
}

// =====================================
// บันทึก Upload Activity และ Emit WebSocket
// =====================================
exports.recordUploadActivity = async (fileId) => {
  let db;
  try {
    db = await getConnection();
    
    // ดึงข้อมูลไฟล์ที่เพิ่งอัพโหลด
    const [fileData] = await db.query(`
      SELECT 
        f.file_id,
        f.file_name,
        f.file_type,
        f.file_size,
        f.created_at,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        fo.folder_id,
        fo.folder_name,
        pr.project_name,
        pr.project_id
      FROM files f
      INNER JOIN users u ON f.uploaded_by = u.user_id
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects pr ON fo.project_id = pr.project_id
      WHERE f.file_id = ? AND f.active = 1
    `, [fileId]);

    if (fileData.length === 0) {
      return;
    }

    const file = fileData[0];
    
    // Emit WebSocket event
    emitFileActivity(file.project_id, {
      activity_type: 'upload',
      file_id: file.file_id,
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
      file_size_mb: (file.file_size / (1024 * 1024)).toFixed(2),
      activity_time: file.created_at,
      user_id: file.user_id,
      first_name: file.first_name || 'Unknown',
      last_name: file.last_name || '',
      email: file.email || '',
      profile_image: file.profile_image || null,
      folder_id: file.folder_id,
      folder_name: file.folder_name,
      project_name: file.project_name
    });
  } catch (error) {
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};
// =====================================
// บันทึก Download Activity และ Emit WebSocket
exports.recordDownloadActivity = async (fileId, userId) => {
  let db;
  try {
    db = await getConnection();
    
    // บันทึกการดาวน์โหลดในฐานข้อมูล
    await db.query(`
      INSERT INTO file_downloads (file_id, user_id, downloaded_at)
      VALUES (?, ?, NOW())
    `, [fileId, userId]);
    
    // ดึงข้อมูลไฟล์ และ user ที่ download
    const [fileData] = await db.query(`
      SELECT 
        f.file_id,
        f.file_name,
        f.file_type,
        f.file_size,
        NOW() as downloaded_at,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        fo.folder_id,
        fo.folder_name,
        pr.project_name,
        pr.project_id
      FROM files f
      INNER JOIN users u ON u.user_id = ?
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects pr ON fo.project_id = pr.project_id
      WHERE f.file_id = ? AND f.active = 1
    `, [userId, fileId]);

    if (fileData.length === 0) {
      return;
    }

    const file = fileData[0];
    
    // Emit WebSocket event
    emitFileActivity(file.project_id, {
      activity_type: 'download',
      file_id: file.file_id,
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
      file_size_mb: (file.file_size / (1024 * 1024)).toFixed(2),
      activity_time: file.downloaded_at,
      user_id: file.user_id,
      first_name: file.first_name || 'Unknown',
      last_name: file.last_name || '',
      email: file.email || '',
      profile_image: file.profile_image || null,
      folder_id: file.folder_id,
      folder_name: file.folder_name,
      project_name: file.project_name
    });
  } catch (error) {
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};
// =====================================
// ดึงข้อมูล Activity ล่าสุด (Upload & Download)
// =====================================
exports.getRecentFileActivities = async (req, res) => {
  let db;
  try {
    // ตรวจสอบ user object
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
      });
    }
    
    // ดึง database connection
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const { limit = 20 } = req.query;
    const userId = req.user.user_id;

    // ตรวจสอบโครงการที่ user เข้าถึงได้
    const [userProjects] = await db.query(`
      SELECT DISTINCT project_id 
      FROM project_user_roles 
      WHERE user_id = ?
    `, [userId]);

    const projectIds = userProjects.map(p => p.project_id);
    
    if (projectIds.length === 0) {
      return res.json({ success: true, activities: [] });
    }

    const placeholders = projectIds.map(() => '?').join(',');

    // รวม Upload และ Download Activities
    const query = `
      (
        SELECT 
          'upload' as activity_type,
          f.file_id,
          f.file_name,
          f.file_type,
          f.file_size,
          f.created_at as activity_time,
          u.user_id,
          u.first_name,
          u.last_name,
          u.profile_image,
          fo.folder_name,
          pr.project_name,
          pr.project_id
        FROM files f
        INNER JOIN users u ON f.uploaded_by = u.user_id
        INNER JOIN folders fo ON f.folder_id = fo.folder_id
        INNER JOIN projects pr ON fo.project_id = pr.project_id
        WHERE f.active = 1 
          AND pr.project_id IN (${placeholders})
      )
      UNION ALL
      (
        SELECT 
          'download' as activity_type,
          f.file_id,
          f.file_name,
          f.file_type,
          f.file_size,
          fd.downloaded_at as activity_time,
          u.user_id,
          u.first_name,
          u.last_name,
          u.profile_image,
          fo.folder_name,
          pr.project_name,
          pr.project_id
        FROM file_downloads fd
        INNER JOIN files f ON fd.file_id = f.file_id
        INNER JOIN users u ON fd.user_id = u.user_id
        INNER JOIN folders fo ON f.folder_id = fo.folder_id
        INNER JOIN projects pr ON fo.project_id = pr.project_id
        WHERE f.active = 1 
          AND pr.project_id IN (${placeholders})
      )
      ORDER BY activity_time DESC
      LIMIT ?
    `;

    const [activities] = await db.query(query, [...projectIds, ...projectIds, parseInt(limit)]);

    res.json({
      success: true,
      activities: activities.map(a => ({
        ...a,
        file_size_mb: (a.file_size / (1024 * 1024)).toFixed(2)
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Activity',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState
      } : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// =====================================
// ดึงสถิติการใช้งานไฟล์ (ทั้งหมด)
// =====================================
exports.getFileStatistics = async (req, res) => {
  let db;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
      });
    }
    
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const userId = req.user.user_id;

    const [userProjects] = await db.query(`
      SELECT DISTINCT project_id 
      FROM project_user_roles 
      WHERE user_id = ?
    `, [userId]);

    const projectIds = userProjects.map(p => p.project_id);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        statistics: {
          totalFiles: 0,
          totalDownloads: 0,
          totalSize: 0,
          totalSizeGB: '0.00',
          recentUploads: 0
        }
      });
    }

    const placeholders = projectIds.map(() => '?').join(',');

    const [fileCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 AND fo.project_id IN (${placeholders})
    `, projectIds);

    const [downloadCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM file_downloads fd
      INNER JOIN files f ON fd.file_id = f.file_id
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 AND fo.project_id IN (${placeholders})
    `, projectIds);

    const [totalSize] = await db.query(`
      SELECT COALESCE(SUM(f.file_size), 0) as total_size
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 AND fo.project_id IN (${placeholders})
    `, projectIds);

    const [recentUploads] = await db.query(`
      SELECT COUNT(*) as count
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 
        AND fo.project_id IN (${placeholders})
        AND f.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, projectIds);

    const result = {
      success: true,
      statistics: {
        totalFiles: fileCount[0].count,
        totalDownloads: downloadCount[0].count,
        totalSize: totalSize[0].total_size,
        totalSizeGB: (totalSize[0].total_size / (1024 * 1024 * 1024)).toFixed(2),
        recentUploads: recentUploads[0].count
      }
    };
    
    res.json(result);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState
      } : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// =====================================
// ดึงข้อมูล Activity ตามโครงการ
// =====================================
exports.getFileActivitiesByProject = async (req, res) => {
  let db;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const { projectId } = req.params;
    const { limit = 20, activityType } = req.query;
    const userId = req.user.user_id;

    const [access] = await db.query(`
      SELECT 1 FROM project_user_roles 
      WHERE user_id = ? AND project_id = ?
    `, [userId, projectId]);

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงโครงการนี้'
      });
    }

    let query = '';
    let params = [];

    if (!activityType || activityType === 'all') {
      query = `
        (
          SELECT 
            'upload' as activity_type,
            f.file_id,
            f.file_name,
            f.file_type,
            f.file_size,
            f.created_at as activity_time,
            u.user_id,
            u.first_name,
            u.last_name,
            u.profile_image,
            fo.folder_name
          FROM files f
          INNER JOIN users u ON f.uploaded_by = u.user_id
          INNER JOIN folders fo ON f.folder_id = fo.folder_id
          WHERE f.active = 1 AND fo.project_id = ?
        )
        UNION ALL
        (
          SELECT 
            'download' as activity_type,
            f.file_id,
            f.file_name,
            f.file_type,
            f.file_size,
            fd.downloaded_at as activity_time,
            u.user_id,
            u.first_name,
            u.last_name,
            u.profile_image,
            fo.folder_name
          FROM file_downloads fd
          INNER JOIN files f ON fd.file_id = f.file_id
          INNER JOIN users u ON fd.user_id = u.user_id
          INNER JOIN folders fo ON f.folder_id = fo.folder_id
          WHERE f.active = 1 AND fo.project_id = ?
        )
        ORDER BY activity_time DESC
        LIMIT ?
      `;
      params = [projectId, projectId, parseInt(limit)];
    } else if (activityType === 'upload') {
      query = `
        SELECT 
          'upload' as activity_type,
          f.file_id,
          f.file_name,
          f.file_type,
          f.file_size,
          f.created_at as activity_time,
          u.user_id,
          u.first_name,
          u.last_name,
          u.profile_image,
          fo.folder_name
        FROM files f
        INNER JOIN users u ON f.uploaded_by = u.user_id
        INNER JOIN folders fo ON f.folder_id = fo.folder_id
        WHERE f.active = 1 AND fo.project_id = ?
        ORDER BY f.created_at DESC
        LIMIT ?
      `;
      params = [projectId, parseInt(limit)];
    } else if (activityType === 'download') {
      query = `
        SELECT 
          'download' as activity_type,
          f.file_id,
          f.file_name,
          f.file_type,
          f.file_size,
          fd.downloaded_at as activity_time,
          u.user_id,
          u.first_name,
          u.last_name,
          u.profile_image,
          fo.folder_name
        FROM file_downloads fd
        INNER JOIN files f ON fd.file_id = f.file_id
        INNER JOIN users u ON fd.user_id = u.user_id
        INNER JOIN folders fo ON f.folder_id = fo.folder_id
        WHERE f.active = 1 AND fo.project_id = ?
        ORDER BY fd.downloaded_at DESC
        LIMIT ?
      `;
      params = [projectId, parseInt(limit)];
    }

    const [activities] = await db.query(query, params);

    res.json({
      success: true,
      projectId,
      activities: activities.map(a => ({
        ...a,
        file_size_mb: (a.file_size / (1024 * 1024)).toFixed(2)
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// =====================================
// ดึงสถิติตามโครงการ
// =====================================
exports.getProjectStatistics = async (req, res) => {
  let db;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const { projectId } = req.params;
    const userId = req.user.user_id;

    const [access] = await db.query(`
      SELECT 1 FROM project_user_roles 
      WHERE user_id = ? AND project_id = ?
    `, [userId, projectId]);

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงโครงการนี้'
      });
    }

    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT f.file_id) as total_files,
        COALESCE(SUM(f.file_size), 0) as total_size,
        COUNT(DISTINCT fd.download_id) as total_downloads,
        COUNT(DISTINCT f.uploaded_by) as unique_uploaders
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      LEFT JOIN file_downloads fd ON f.file_id = fd.file_id
      WHERE f.active = 1 AND fo.project_id = ?
    `, [projectId]);

    const [fileTypes] = await db.query(`
      SELECT 
        f.file_type,
        COUNT(*) as count
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 AND fo.project_id = ?
      GROUP BY f.file_type
      ORDER BY count DESC
      LIMIT 10
    `, [projectId]);

    const [recentUploads] = await db.query(`
      SELECT COUNT(*) as count
      FROM files f
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      WHERE f.active = 1 
        AND fo.project_id = ?
        AND f.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [projectId]);

    res.json({
      success: true,
      projectId,
      statistics: {
        totalFiles: stats[0].total_files,
        totalDownloads: stats[0].total_downloads,
        totalSize: stats[0].total_size,
        totalSizeGB: (stats[0].total_size / (1024 * 1024 * 1024)).toFixed(2),
        recentUploads: recentUploads[0].count,
        uniqueUploaders: stats[0].unique_uploaders,
        fileTypeBreakdown: fileTypes
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติโครงการ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// =====================================
// ไฟล์ที่ถูกดาวน์โหลดมากที่สุด
// =====================================
exports.getTopDownloadedFiles = async (req, res) => {
  let db;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const { limit = 10, projectId } = req.query;
    const userId = req.user.user_id;

    let query = `
      SELECT 
        f.file_id,
        f.file_name,
        f.file_type,
        f.file_size,
        COUNT(fd.download_id) as download_count,
        pr.project_name,
        pr.project_id
      FROM files f
      INNER JOIN file_downloads fd ON f.file_id = fd.file_id
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects pr ON fo.project_id = pr.project_id
      INNER JOIN project_user_roles pur ON pr.project_id = pur.project_id
      WHERE f.active = 1 AND pur.user_id = ?
    `;

    const params = [userId];

    if (projectId) {
      query += ` AND pr.project_id = ?`;
      params.push(projectId);
    }

    query += `
      GROUP BY f.file_id, pr.project_id, pr.project_name, f.file_name, f.file_type, f.file_size
      ORDER BY download_count DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [files] = await db.query(query, params);

    res.json({
      success: true,
      topFiles: files.map(f => ({
        ...f,
        file_size_mb: (f.file_size / (1024 * 1024)).toFixed(2)
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// =====================================
// ผู้ใช้ที่อัพโหลดไฟล์มากที่สุด
// =====================================
exports.getTopUploaders = async (req, res) => {
  let db;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    db = await getConnection();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
      });
    }
    
    const { limit = 10, projectId } = req.query;
    const userId = req.user.user_id;

    let query = `
      SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.profile_image,
        COUNT(DISTINCT f.file_id) as upload_count,
        COALESCE(SUM(f.file_size), 0) as total_size
      FROM users u
      INNER JOIN files f ON u.user_id = f.uploaded_by
      INNER JOIN folders fo ON f.folder_id = fo.folder_id
      INNER JOIN projects pr ON fo.project_id = pr.project_id
      INNER JOIN project_user_roles pur ON pr.project_id = pur.project_id
      WHERE f.active = 1 AND pur.user_id = ?
    `;

    const params = [userId];

    if (projectId) {
      query += ` AND pr.project_id = ?`;
      params.push(projectId);
    }

    query += `
      GROUP BY u.user_id, u.first_name, u.last_name, u.profile_image
      ORDER BY upload_count DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [uploaders] = await db.query(query, params);

    res.json({
      success: true,
      topUploaders: uploaders.map(u => ({
        ...u,
        total_size_gb: (u.total_size / (1024 * 1024 * 1024)).toFixed(2)
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db && db.release) {
      db.release();
    }
  }
};

// Export ฟังก์ชันเพิ่มเติมสำหรับ WebSocket
module.exports.emitFileActivity = emitFileActivity;