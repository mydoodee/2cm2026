//middleware/companyContext.js
/**
 * Middleware: ดึง company_id จาก header X-Company-Id
 * ถ้ามี → set req.companyId
 * ถ้าไม่มี → ไม่บังคับ (บาง route ไม่ต้องการ)
 */
const companyContext = (req, res, next) => {
    const companyId = req.headers['x-company-id'];
    if (companyId) {
        req.companyId = companyId;
    }
    next();
};

/**
 * Middleware: บังคับให้ต้องมี company_id
 * ใช้กับ routes ที่ต้องรู้ว่ากำลังทำงานในบริษัทไหน
 */
const requireCompany = (req, res, next) => {
    // รับทั้งจาก header โดยตรง หรือจาก req.companyId ที่ companyContext set ไว้
    const companyId = req.companyId || req.headers['x-company-id'];
    // กรองค่าที่ไม่ถูกต้อง เช่น string "null", "undefined", หรือ empty string
    if (!companyId || companyId === 'null' || companyId === 'undefined' || companyId.trim() === '') {
        return res.status(400).json({ message: 'กรุณาเลือกบริษัทก่อน (X-Company-Id header required)' });
    }
    req.companyId = companyId;
    next();
};

module.exports = { companyContext, requireCompany };
