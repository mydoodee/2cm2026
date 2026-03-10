// routes/ActualRoutes.js
const express = require('express');
const router = express.Router();
const actualController = require('../controllers/actualController');
const authenticateToken = require('../middleware/authenticateToken');

// ใช้ auth ทุก route
router.use(authenticateToken);

// =============================================
// ROOT LEVEL
// =============================================
router.get('/actual/roots/:projectId', actualController.getRootsByProject);
router.post('/actual/roots', actualController.createRoot);
router.put('/actual/roots/:rootId', actualController.updateRoot);
router.delete('/actual/roots/:rootId', actualController.deleteRoot);

// =============================================
// CATEGORY LEVEL
// =============================================
router.get('/actual/categories/:rootId', actualController.getCategoriesByRoot);
router.post('/actual/categories', actualController.createCategory);
router.put('/actual/categories/:categoryId', actualController.updateCategory);
router.delete('/actual/categories/:categoryId', actualController.deleteCategory);

// =============================================
// TYPE LEVEL
// =============================================
router.get('/actual/types/:categoryId', actualController.getTypesByCategory);
router.post('/actual/types', actualController.createType);
router.put('/actual/types/:typeId', actualController.updateType);
router.delete('/actual/types/:typeId', actualController.deleteType);

// =============================================
// SUBTYPE LEVEL
// =============================================
router.get('/actual/subtypes/:typeId', actualController.getSubtypesByType);
router.post('/actual/subtypes', actualController.createSubtype);
router.put('/actual/subtypes/:subtypeId', actualController.updateSubtype);
router.delete('/actual/subtypes/:subtypeId', actualController.deleteSubtype);

// =============================================
// SUB-SUBTYPE LEVEL (เพิ่มใหม่ - Level 4)
// =============================================
router.get('/actual/subsubtypes/:subtypeId', actualController.getSubsubtypesBySubtype);
router.post('/actual/subsubtypes', actualController.createSubsubtype);
router.put('/actual/subsubtypes/:subsubtypeId', actualController.updateSubsubtype);
router.delete('/actual/subsubtypes/:subsubtypeId', actualController.deleteSubsubtype);

// =============================================
// TREE VIEW
// =============================================
router.get('/actual/tree/:projectId', actualController.getFullTree);

// =============================================
// ACTUAL PROGRESS TRACKING
// =============================================

// อัปเดตความคืบหน้า (รองรับการแนบหลายรูป)
router.post('/actual/update-progress',
  actualController.uploadPhotosMiddleware,
  actualController.updateActualProgress
);

// ดึงข้อมูล Tree พร้อม Actual Progress
router.get('/actual/tree-with-actual/:projectId', actualController.getFullTreeWithActual);

// ⚠️ สำคัญ: ประกาศ route ที่เฉพาะเจาะจงก่อน route ที่ใช้ parameter
// เพื่อป้องกัน route conflict

// ลบประวัติทั้งหมดของ item เดียว - ต้องอยู่ก่อน /actual/history/:projectId
router.delete('/actual/delete-all-history/:projectId', actualController.deleteAllHistoryByItem);

// ลบประวัติการอัปเดตเดียว - ✅ ใช้ path ที่ชัดเจน
router.delete('/actual/history-item/:historyId', actualController.deleteActualHistory);

// ดึงประวัติการอัปเดตความคืบหน้า
router.get('/actual/history/:projectId', actualController.getActualHistory);

// ดึงข้อมูล Actual Progress ของรายการเดียว
router.get('/actual/progress/:projectId', actualController.getActualProgress);

// ลบข้อมูล Actual Progress (Soft delete)
router.delete('/actual/progress/:actualId', actualController.deleteActualProgress);

// =============================================
// BULK OPERATIONS
// =============================================
router.post('/actual/bulk-update-progress', actualController.bulkUpdateProgress);

// =============================================
// STATISTICS & REPORTS
// =============================================
// สถิติความคืบหน้ารวมของโครงการ
router.get('/actual/statistics/:projectId', actualController.getProjectStatistics);

// เปรียบเทียบ Plan vs Actual
router.get('/actual/comparison/:projectId', actualController.getPlanVsActualComparison);

// รายงานรายการที่ล่าช้า (Overdue items)
router.get('/actual/overdue/:projectId', actualController.getOverdueItems);

// =============================================
// HEALTH CHECK
// =============================================
router.get('/actual/health', (req, res) => {
  res.json({
    success: true,
    message: 'Actual routes are healthy',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;