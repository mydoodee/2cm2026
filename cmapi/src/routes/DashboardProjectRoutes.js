// routes/DashboardProjectRoutes.js - เส้นทาง API สำหรับ Dashboard โครงการ
const express = require('express');
const router = express.Router();
const DashboardProjectController = require('../controllers/DashboardProjectController');
const authenticateToken = require('../middleware/authenticateToken');
const { requireCompany } = require('../middleware/companyContext');

router.use(requireCompany);

// ===================================
// Dashboard Projects API Routes
// Path: /api/dashboard/*
// ===================================

// GET /api/dashboard/overall-stats - ดึงภาพรวมทั้งหมด
router.get('/dashboard/overall-stats', authenticateToken, DashboardProjectController.getOverallStats);

// GET /api/dashboard/project-stats - ดึงรายละเอียดโครงการทั้งหมด
router.get('/dashboard/project-stats', authenticateToken, DashboardProjectController.getProjectStats);

// GET /api/dashboard/project/:projectId - ดึงรายละเอียดโครงการเฉพาะ
router.get('/dashboard/project/:projectId', authenticateToken, DashboardProjectController.getProjectDetails);

// GET /api/dashboard/financial-stats - ดึงสถิติการเงินตามช่วงเวลา
router.get('/dashboard/financial-stats', authenticateToken, DashboardProjectController.getFinancialStatsByPeriod);

// POST /api/dashboard/project/:projectId/installment - เพิ่มงวดชำระเงิน
router.post('/dashboard/project/:projectId/installment', authenticateToken, DashboardProjectController.addInstallment);

// PUT /api/dashboard/project/:projectId/installment/:installmentId - อัพเดทสถานะงวดชำระ
router.put('/dashboard/project/:projectId/installment/:installmentId', authenticateToken, DashboardProjectController.updateInstallmentStatus);

module.exports = router;