// routes/scurveRoutes.js
const express = require('express');
const router = express.Router();
const scurveController = require('../controllers/scurveController');
const authenticateToken = require('../middleware/authenticateToken');

// ใช้ authenticateToken สำหรับทุก route
router.use(authenticateToken);

// =====================================
// S-CURVE ROUTES
// =====================================

// 📊 Get all root categories for a project
router.get('/project/:projectId/scurve/roots', 
  scurveController.getRootCategories
);

// 📋 Get root details with categories
router.get('/project/:projectId/scurve/root/:rootId', 
  scurveController.getRootDetails
);

// 📂 Get categories and types for a root
router.get('/project/:projectId/scurve/root/:rootId/categories', 
  scurveController.getCategoriesWithTypes
);

// 📈 Get category details with types
router.get('/project/:projectId/scurve/category/:categoryId', 
  scurveController.getCategoryDetails
);

// 📊 Get type details with subtypes
router.get('/project/:projectId/scurve/type/:typeId', 
  scurveController.getTypeDetails
);

// 🔍 Get all S-Curve data for a project (complete hierarchy)
router.get('/project/:projectId/scurve/complete', 
  scurveController.getCompleteSCurveData
);

// 📊 Get S-Curve chart data (optimized for chart rendering)
router.get('/project/:projectId/scurve/chart-data', 
  scurveController.getChartData
);

// 📗 Get S-Curve data for Excel (Live Connection)
router.get('/project/:projectId/scurve/excel-data', 
  scurveController.getSCurveExcelData
);

// 📊 Get S-Curve summary for Excel Charting
router.get('/project/:projectId/scurve/excel-summary', 
  scurveController.getSCurveExcelSummary
);

// 📅 Get S-Curve time-phased data for Excel Gantt-style
router.get('/project/:projectId/scurve/excel-timephased', 
  scurveController.getSCurveExcelTimePhased
);

// =====================================
// CRUD OPERATIONS (Optional - for future)
// =====================================

// Create new root
router.post('/project/:projectId/scurve/root', 
  scurveController.createRoot
);

// Update root
router.put('/project/:projectId/scurve/root/:rootId', 
  scurveController.updateRoot
);

// Delete root
router.delete('/project/:projectId/scurve/root/:rootId', 
  scurveController.deleteRoot
);

// Create new category
router.post('/project/:projectId/scurve/category', 
  scurveController.createCategory
);

// Update category
router.put('/project/:projectId/scurve/category/:categoryId', 
  scurveController.updateCategory
);

// Delete category
router.delete('/project/:projectId/scurve/category/:categoryId', 
  scurveController.deleteCategory
);

// Create new type
router.post('/project/:projectId/scurve/type', 
  scurveController.createType
);

// Update type
router.put('/project/:projectId/scurve/type/:typeId', 
  scurveController.updateType
);

// Delete type
router.delete('/project/:projectId/scurve/type/:typeId', 
  scurveController.deleteType
);

// =====================================
// HEALTH CHECK FOR S-CURVE ROUTES
// =====================================
router.get('/scurve/health', (req, res) => {
  res.json({
    success: true,
    message: 'S-Curve routes are working',
    user: {
      id: req.user.user_id,
      email: req.user.email
    },
    timestamp: new Date().toISOString(),
    features: [
      'Root Categories Management',
      'Category with Types',
      'Type with Subtypes',
      'Complete Hierarchy Data',
      'Optimized Chart Data',
      'S-Curve Planning',
      'CRUD Operations',
      'Soft Delete Support'
    ]
  });
});

module.exports = router;