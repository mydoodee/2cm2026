const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticateToken = require('../middleware/authenticateToken');
const { companyContext } = require('../middleware/companyContext');

// Apply auth middleware to all AI routes
router.use(authenticateToken);
router.use(companyContext);

// Chat & Analysis routes
router.post('/chat', aiController.handleChat);
router.post('/analyze/:projectId', aiController.handleAnalyzeProject);
router.post('/report/:projectId', aiController.handleGenerateReport);
router.post('/query', aiController.handleQueryERP);

// Management & history routes
router.get('/health', aiController.getHealth);
router.get('/conversations', aiController.getConversations);
router.get('/conversation/:id', aiController.getConversationById);
router.post('/conversations', aiController.saveConversation);
router.delete('/conversation/:id', aiController.deleteConversation);

module.exports = router;
