const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { verifyToken, checkAdmin } = require('../middleware/authMiddleware');

// เส้นทางสำหรับดึง Progress Summary ล่าสุดของโครงการ
router.get('/project/:project_id/progress', verifyToken, progressController.getLatestProgressSummary);

// เส้นทางสำหรับสร้าง Progress Summary ใหม่ (เฉพาะแอดมิน)
router.post('/project/:project_id/progress', verifyToken, checkAdmin, progressController.createProgressSummary);

// เส้นทางสำหรับอัปเดต Progress Summary (เฉพาะแอดมิน)
router.put('/progress/:summary_id', verifyToken, checkAdmin, progressController.updateProgressSummary);

// เส้นทางสำหรับลบ Progress Summary (เฉพาะแอดมิน)
router.delete('/progress/:summary_id', verifyToken, checkAdmin, progressController.deleteProgressSummary);

module.exports = router;