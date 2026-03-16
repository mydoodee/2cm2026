//authRoutes.js
const express = require('express');
const router = express.Router();
const {
  login,
  getUser,
  updateUser,
  getAllUsers,
  createUser,
  deleteUser,
  refreshToken,
  assignProjectRole,
  deleteProjectUserRole,
  resetPassword,
  confirmPassword,
  copyUserPermissions,
} = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาดไฟล์ 5MB
  fileFilter: (req, file, cb) => {
    console.log('Multer: Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    if (!file.mimetype.startsWith('image/')) {
      console.error('Multer: Invalid file type:', file.mimetype);
      return cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพ'));
    }
    cb(null, true);
  },
});

// Middleware สำหรับจัดการข้อผิดพลาดจาก multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'ไฟล์มีขนาดใหญ่เกิน 5MB' });
    }
    return res.status(400).json({ message: `ข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: `ข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}` });
  }
  next();
};

// Rate limiter สำหรับ reset-password
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 requests ต่อ IP
  message: 'ร้องขอรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ในภายหลัง',
});

// Rate limiter สำหรับ confirm-password
const confirmPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 requests ต่อ IP
  message: 'ร้องขอตั้งรหัสผ่านใหม่มากเกินไป กรุณาลองใหม่ในภายหลัง',
});

// Middleware สำหรับล็อกข้อมูลคำขอ
router.use((req, res, next) => {
  console.log(`AuthRoutes: Handling ${req.method} request to ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    console.log('AuthRoutes: Request body:', req.body);
    if (req.file) {
      console.log('AuthRoutes: Request file:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    }
  }
  next();
});

// Route: ล็อกอิน
router.post('/login', login);

// Route: รีเซ็ตรหัสผ่าน
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// Route: ตั้งรหัสผ่านใหม่
router.post('/confirm-password', confirmPasswordLimiter, confirmPassword);

// Route: ดึงข้อมูลผู้ใช้ที่ล็อกอิน
router.get('/user', authenticateToken, getUser);

// Route: อัปเดตข้อมูลผู้ใช้
router.put('/user/:id', authenticateToken, upload.single('profile_image'), multerErrorHandler, updateUser);

// Route: ดึงรายการผู้ใช้ทั้งหมด
router.get('/users', authenticateToken, getAllUsers);

// Route: สร้างผู้ใช้ใหม่
router.post('/user', authenticateToken, upload.single('profile_image'), multerErrorHandler, createUser);

// Route: ลบผู้ใช้
router.delete('/user/:id', authenticateToken, deleteUser);

// Route: คัดลอกสิทธิ์ผู้ใช้
router.post('/users/copy-permissions', authenticateToken, copyUserPermissions);

// Route: รีเฟรช token
router.post('/refresh-token', refreshToken);

// Route: กำหนดบทบาทในโครงการ
router.post('/project-user-roles', authenticateToken, assignProjectRole);

// Route: ลบสิทธิ์การเข้าใช้งานโครงการ
router.delete('/project-user-roles', authenticateToken, deleteProjectUserRole);

module.exports = router;