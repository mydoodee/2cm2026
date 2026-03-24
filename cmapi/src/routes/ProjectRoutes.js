//ProjectRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  uploadProjectImage,
  deleteProject,
  getAllRoles,
  getProjectUsers,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/projectController');
const {
  getJobStatusDetails,
  updateJobStatusDetails,
} = require('../controllers/jobStatusController');
const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getFiles,
  uploadFile,
  deleteFile,
  updateFolderPermissions,
} = require('../controllers/folderController');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getConnection } = require('../config/db');

const folderUpload = require('../middleware/multerConfig');

const projectStorage = multer.memoryStorage();
const projectUpload = multer({
  storage: projectStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพ'));
    }
    cb(null, true);
  },
});

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: `ไฟล์มีขนาดใหญ่เกิน ${req.file ? '20MB' : '100MB'}` });
    }
    return res.status(400).json({ message: `ข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Project Routes
router.get('/projects', authenticateToken, getProjects);
router.get('/project/:id', authenticateToken, getProjectById);
router.get('/project/:projectId/users', authenticateToken, getProjectUsers);
router.get('/roles', authenticateToken, getAllRoles);
router.post('/project/upload-image', authenticateToken, projectUpload.single('projectImage'), multerErrorHandler, uploadProjectImage);
router.post(
  '/project',
  authenticateToken,
  projectUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'progress_summary_image', maxCount: 1 },
    { name: 'payment_image', maxCount: 1 },
    { name: 'design_image', maxCount: 1 },
    { name: 'pre_construction_image', maxCount: 1 },
    { name: 'construction_image', maxCount: 1 },
    { name: 'cm_image', maxCount: 1 },
    { name: 'precast_image', maxCount: 1 },
    { name: 'bidding_image', maxCount: 1 },
    { name: 'job_status_image', maxCount: 1 },
  ]),
  multerErrorHandler,
  createProject
);
router.put(
  '/project/:id',
  authenticateToken,
  projectUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'progress_summary_image', maxCount: 1 },
    { name: 'payment_image', maxCount: 1 },
    { name: 'design_image', maxCount: 1 },
    { name: 'pre_construction_image', maxCount: 1 },
    { name: 'construction_image', maxCount: 1 },
    { name: 'cm_image', maxCount: 1 },
    { name: 'precast_image', maxCount: 1 },
    { name: 'bidding_image', maxCount: 1 },
    { name: 'job_status_image', maxCount: 1 },
  ]),
  multerErrorHandler,
  updateProject
);
router.delete('/project/:id', authenticateToken, deleteProject);

// Job Status Details Routes
router.get('/project/:id/job-status-details', authenticateToken, getJobStatusDetails);
router.post('/project/:id/job-status-details', authenticateToken, updateJobStatusDetails);

// Role Management Routes
router.post('/role', authenticateToken, createRole);
router.put('/role/:id', authenticateToken, updateRole);
router.delete('/role/:id', authenticateToken, deleteRole);

// PUBLIC SHARE ROUTES
router.post('/project/:projectId/enable-public', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const { expiresInDays = 7 } = req.body;

    connection = await getConnection();

    const [permissions] = await connection.query(
      `SELECT permission_type FROM project_permissions 
       WHERE project_id = ? AND user_id = ? AND permission_type IN ('admin', 'write')`,
      [projectId, req.user.user_id]
    );

    if (permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เปิด public share สำหรับโปรเจกต์นี้',
      });
    }

    const shareCode = crypto.randomBytes(16).toString('hex').slice(0, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await connection.query(
      `UPDATE projects 
       SET is_public = 1, share_code = ?, share_expires_at = ? 
       WHERE project_id = ? AND active = 1`,
      [shareCode, expiresAt, projectId]
    );

    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/cm/viewer/${projectId}?public=true`;

    res.json({
      success: true,
      message: 'เปิดใช้งาน public share สำเร็จ',
      data: { 
        shareCode, 
        expiresAt, 
        shareUrl 
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปิด public share',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/project/:projectId/disable-public', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;

    connection = await getConnection();

    const [permissions] = await connection.query(
      `SELECT permission_type FROM project_permissions 
       WHERE project_id = ? AND user_id = ? AND permission_type IN ('admin', 'write')`,
      [projectId, req.user.user_id]
    );

    if (permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ปิด public share',
      });
    }

    await connection.query(
      `UPDATE projects 
       SET is_public = 0, share_code = NULL, share_expires_at = NULL 
       WHERE project_id = ? AND active = 1`,
      [projectId]
    );

    res.json({
      success: true,
      message: 'ปิด public share สำเร็จ',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Folder & File Management Routes
router.get('/project/:projectId/folders', authenticateToken, getFolders);
router.post('/project/:projectId/folder', authenticateToken, createFolder);
router.put('/project/:projectId/folder/:id', authenticateToken, updateFolder);
router.put('/project/:projectId/folder/:id/permissions', authenticateToken, updateFolderPermissions);
router.delete('/project/:projectId/folder/:id', authenticateToken, deleteFolder);
router.get('/project/:projectId/folder/:folderId/files', authenticateToken, getFiles);
router.post(
  '/project/:projectId/folder/:folderId/upload',
  authenticateToken,
  folderUpload.single('file'),
  multerErrorHandler,
  uploadFile
);
router.delete('/project/:projectId/file/:id', authenticateToken, deleteFile);

module.exports = router;