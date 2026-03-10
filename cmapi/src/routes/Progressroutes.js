// Progressroutes.js
const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authenticateToken = require('../middleware/authenticateToken');

// เส้นทางสำหรับ Progress Summary
router.get('/project/:id/progress', authenticateToken, progressController.getProgressSummary);
router.post('/project/:id/progress', authenticateToken, progressController.createProgressSummary);
router.put('/project/:id/progress/:summary_id', authenticateToken, progressController.updateProgressSummary);
router.delete('/project/:id/progress/:summary_id', authenticateToken, progressController.deleteProgressSummary);
router.get('/project/:id/progress-history', authenticateToken, progressController.getProgressHistory);

// เส้นทางสำหรับ Payment
router.get('/project/:id/payment', authenticateToken, progressController.getPayment);
router.post('/project/:id/payment', authenticateToken, progressController.createPayment);
router.put('/project/:id/payment/:payment_id', authenticateToken, progressController.updatePayment);
router.delete('/project/:id/payment/:payment_id', authenticateToken, progressController.deletePayment);
router.get('/project/:id/payment-history', authenticateToken, progressController.getPaymentHistory);
router.get('/project/:id/payment-detailed', authenticateToken, progressController.getDetailedPaymentHistory); // ← เพิ่ม route นี้

module.exports = router;