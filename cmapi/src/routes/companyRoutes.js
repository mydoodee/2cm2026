// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middleware/authenticateToken');
const {
    getUserCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    addUserToCompany,
    removeUserFromCompany,
    getAvailableUsers
} = require('../controllers/companyController');

const upload = multer({ storage: multer.memoryStorage() });

// ดึงรายการบริษัทของ user (หรือทั้งหมดถ้าเป็น Super Admin)
router.get('/companies', authenticateToken, getUserCompanies);

// ดึงข้อมูลบริษัทเดียว + members
router.get('/companies/:id', authenticateToken, getCompanyById);

// สร้างบริษัทใหม่ (Admin Only)
router.post('/companies', authenticateToken, upload.single('company_logo'), createCompany);

// แก้ไขบริษัท (Owner/Admin)
router.put('/companies/:id', authenticateToken, upload.single('company_logo'), updateCompany);

// เพิ่ม user เข้าบริษัท
router.post('/companies/:id/users', authenticateToken, addUserToCompany);

// ลบ user ออกจากบริษัท
router.delete('/companies/:id/users/:userId', authenticateToken, removeUserFromCompany);

// ดึง users ที่ยังไม่อยู่ในบริษัท (สำหรับเลือกเพิ่ม)
router.get('/companies/:id/available-users', authenticateToken, getAvailableUsers);

module.exports = router;
