//foldersRoutes.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/multerConfig');

// ✅ เพิ่มตรงนี้ - Project Users Route (ต้องอยู่ก่อน Folder Routes)
router.get('/projects/:projectId/users', authenticateToken, folderController.getProjectUsers);

// Folder Management Routes
router.get('/folders', authenticateToken, folderController.getFolders);
router.post('/folder', authenticateToken, folderController.createFolder);
router.put('/folder/:id', authenticateToken, folderController.updateFolder);
router.delete('/folder/:id', authenticateToken, folderController.deleteFolder);
router.put('/folder/:id/permissions', authenticateToken, folderController.updateFolderPermissions);
router.post('/folders/copy-structure', authenticateToken, folderController.copyFolderStructure);

// File Management Routes
router.get('/folder/:folderId/files', authenticateToken, folderController.getFiles);

router.post(
  '/folder/:folderId/upload', 
  authenticateToken, 
  upload.single('file'), 
  folderController.uploadFile
);

router.delete('/file/:id', authenticateToken, folderController.deleteFile);

module.exports = router;