// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authenticateToken = require('../middleware/authenticateToken');

// Apply authentication to all routes
router.use(authenticateToken);

// =============================================
// TASKS ROUTES
// =============================================
// GET: Get all tasks by project
router.get('/schedule/tasks/:projectId', scheduleController.getTasksByProject);

// GET: Get single task by ID
router.get('/schedule/task/:taskId', scheduleController.getTaskById);

// POST: Create new task
router.post('/schedule/tasks', scheduleController.createTask);

// PUT: Update task
router.put('/schedule/tasks/:taskId', scheduleController.updateTask);

// DELETE: Delete task
router.delete('/schedule/tasks/:taskId', scheduleController.deleteTask);

// =============================================
// MILESTONES ROUTES
// =============================================
// GET: Get milestones by project
router.get('/schedule/milestones/:projectId', scheduleController.getMilestonesByProject);

// POST: Create milestone
router.post('/schedule/milestones', scheduleController.createMilestone);

// PUT: Update milestone
router.put('/schedule/milestones/:milestoneId', scheduleController.updateMilestone);

// DELETE: Delete milestone
router.delete('/schedule/milestones/:milestoneId', scheduleController.deleteMilestone);

// =============================================
// HOLIDAYS ROUTES
// =============================================
// GET: Get holidays (national + project-specific)
router.get('/schedule/holidays', scheduleController.getHolidays);

// =============================================
// PROGRESS LOGS ROUTES
// =============================================
// GET: Get progress logs by task
router.get('/schedule/progress/:taskId', scheduleController.getProgressLogsByTask);

// POST: Create progress log
router.post('/schedule/progress', scheduleController.createProgressLog);

// =============================================
// HEALTH CHECK
// =============================================
router.get('/schedule/health', scheduleController.healthCheck);

module.exports = router;