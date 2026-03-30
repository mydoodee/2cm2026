/* DashboardRoutes.js */
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { sendEmailNotification } = require('../controllers/sendemail_noti');
const authenticateToken = require('../middleware/authenticateToken');
const { requireCompany } = require('../middleware/companyContext');
const upload = require('../middleware/multerConfig');

router.use(requireCompany);

// ===================================
// Project Details
// ===================================
router.get('/dashboard/project/:id', authenticateToken, DashboardController.getProjectDetails);

// ===================================
// Folders Management
// ===================================
// Get all folders in project
router.get('/dashboard/project/:id/folders', authenticateToken, DashboardController.getProjectFolders);

// Create new folder
router.post('/dashboard/project/:id/folder', authenticateToken, DashboardController.createFolder);

// ✅ Rename folder (เพิ่มใหม่)
router.put('/dashboard/project/:id/folder/:folderId/rename', authenticateToken, DashboardController.renameFolder);

// Delete folder
router.delete('/dashboard/project/:id/folder/:folderId', authenticateToken, DashboardController.deleteFolder);

// Save metadata (folder structure from drag-and-drop)
router.post('/dashboard/project/:id/folder/:folderId/metadata', authenticateToken, DashboardController.saveMetadata);

// ===================================
// Files Management
// ===================================
// Get files in folder
router.get('/dashboard/project/:id/folder/:folderId/files', authenticateToken, DashboardController.getFolderFiles);

// Upload file to folder
router.post('/dashboard/project/:id/folder/:folderId/upload', authenticateToken, upload.single('file'), DashboardController.uploadFile);

// Download file
router.get('/dashboard/project/:id/file/:fileId/download', authenticateToken, DashboardController.downloadProjectFile);

// Rename file
router.put('/dashboard/project/:id/file/:fileId/rename', authenticateToken, DashboardController.renameFile);

// Delete file
router.delete('/dashboard/project/:id/file/:fileId', authenticateToken, DashboardController.deleteFile);

// ===================================
// Email Notification
// ===================================
router.post('/dashboard/project/:id/notify', authenticateToken, sendEmailNotification);

// ===================================
// Users Management
// ===================================
router.get('/dashboard/project/:id/users', authenticateToken, DashboardController.getProjectUsers);

module.exports = router;