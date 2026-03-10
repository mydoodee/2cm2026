// routes/statusRoutes.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const authenticateToken = require('../middleware/authenticateToken');
const { getConnection } = require('../config/db');

// ใช้ authenticateToken สำหรับทุก route
router.use(authenticateToken);

// =====================================
// USER PROJECTS ENDPOINT
// =====================================
router.get('/user/projects', async (req, res) => {
  try {
    console.log('📂 [USER_PROJECTS] Request from user:', req.user.user_id);
    
    const db = getConnection();
    const userId = req.user.user_id;
    
    // ตรวจสอบว่า user มีอยู่จริง
    const [userCheck] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (userCheck.length === 0) {
      console.log('❌ [USER_PROJECTS] User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    console.log('✅ [USER_PROJECTS] User found:', userId);
    
    // ดึงโครงการที่ user มีสิทธิ์เข้าถึง
    const [projects] = await db.query(`
      SELECT DISTINCT 
        p.project_id,
        p.project_name,
        p.project_code,
        p.created_at,
        pur.role
      FROM projects p
      INNER JOIN project_user_roles pur ON p.project_id = pur.project_id
      WHERE pur.user_id = ? AND p.active = 1
      ORDER BY p.project_name
    `, [userId]);
    
    console.log(`✅ [USER_PROJECTS] Found ${projects.length} projects for user ${userId}`);
    
    res.json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error) {
    console.error('❌ [USER_PROJECTS] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =====================================
// FILE ACTIVITIES ENDPOINTS
// =====================================

// ดึงข้อมูล Activity ล่าสุด (ทุกโครงการ)
router.get('/file-activities/recent', statusController.getRecentFileActivities);

// ดึงข้อมูล Activity ตามโครงการ
router.get('/file-activities/project/:projectId', statusController.getFileActivitiesByProject);

// =====================================
// STATISTICS ENDPOINTS
// =====================================

// ดึงสถิติทั้งหมด
router.get('/file-statistics', statusController.getFileStatistics);

// ดึงสถิติตามโครงการ
router.get('/file-statistics/project/:projectId', statusController.getProjectStatistics);

// =====================================
// TOP RANKINGS ENDPOINTS
// =====================================

// ดึงข้อมูล Top Downloaded Files
router.get('/top-downloads', statusController.getTopDownloadedFiles);

// ดึงข้อมูล Top Uploaders
router.get('/top-uploaders', statusController.getTopUploaders);

// =====================================
// HEALTH CHECK FOR STATUS ROUTES
// =====================================
router.get('/status/health', (req, res) => {
  res.json({
    success: true,
    message: 'Status routes are working',
    user: {
      id: req.user.user_id,
      email: req.user.email
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;