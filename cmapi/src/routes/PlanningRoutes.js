// routes/PlanningRoutes.js
const express = require('express');
const router = express.Router();
const planningController = require('../controllers/PlanningController');
const authenticateToken = require('../middleware/authenticateToken');

// ใช้ authenticateToken สำหรับทุก route
router.use(authenticateToken);

// =============================================
// ROOT LEVEL ROUTES
// =============================================
router.get('/planning/roots/:projectId', planningController.getRootsByProject);
router.post('/planning/roots', planningController.createRoot);
router.put('/planning/roots/:rootId', planningController.updateRoot);
router.delete('/planning/roots/:rootId', planningController.deleteRoot);

// =============================================
// ROOT UPDATE ROUTES
// =============================================
router.post('/planning/update-root-data/:projectId', planningController.updateRootDataByProject);

// =============================================
// CATEGORY LEVEL ROUTES
// =============================================
router.get('/planning/categories/:rootId', planningController.getCategoriesByRoot);
router.post('/planning/categories', planningController.createCategory);
router.put('/planning/categories/:categoryId', planningController.updateCategory);
router.delete('/planning/categories/:categoryId', planningController.deleteCategory);

// =============================================
// TYPE LEVEL ROUTES (WITH FILE UPLOAD)
// =============================================
router.get('/planning/types/:categoryId', planningController.getTypesByCategory);
router.post('/planning/types',
  planningController.uploadMiddleware,
  planningController.createType
);
router.put('/planning/types/:typeId',
  planningController.uploadMiddleware,
  planningController.updateType
);
router.delete('/planning/types/:typeId', planningController.deleteType);

// =============================================
// SUBTYPE LEVEL ROUTES (WITH FILE UPLOAD)
// =============================================
router.get('/planning/subtypes/:typeId', planningController.getSubtypesByType);
router.post('/planning/subtypes',
  planningController.uploadMiddleware,
  planningController.createSubtype
);
router.put('/planning/subtypes/:subtypeId',
  planningController.uploadMiddleware,
  planningController.updateSubtype
);
router.delete('/planning/subtypes/:subtypeId', planningController.deleteSubtype);

// =============================================
// TREE VIEW ROUTE
// =============================================
router.get('/planning/tree/:projectId', planningController.getFullTree);

// =============================================
// IFC VIEWER DOWNLOAD ROUTE
// =============================================
router.get('/planning/file/download/:type/:id', planningController.downloadPlanningIfc);

// =============================================
// HEALTH CHECK
// =============================================
router.get('/planning/health', (req, res) => {
  res.json({
    success: true,
    message: 'Planning routes are working',
    user: {
      id: req.user.user_id,
      email: req.user.email
    },
    timestamp: new Date().toISOString(),
    features: [
      'Root Level Management',
      'Category Level Management',
      'Type Level Management (with File Upload)',
      'Subtype Level Management (with File Upload)',
      'Full Tree Structure',
      'S-Curve Planning',
      'File Upload Support (Images & PDF)',
      'Auto Root Total Price Calculation',
      'Auto Root Date Sync'
    ]
  });
});

module.exports = router;