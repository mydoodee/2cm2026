const { getConnection } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ แก้ไข path ให้ชี้ไปที่ src/Uploads/payments
const uploadsDir = path.join(__dirname, '../../Uploads/payments');

// ✅ สร้าง folder ถ้ายังไม่มี
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating Uploads/payments directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Directory created at:', uploadsDir);
}

// ✅ Multer setup สำหรับ payments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์ .jpg, .jpeg, .png, .pdf เท่านั้น'));
    }
  }
}).array('payment_files', 3);

// ฟังก์ชันสำหรับ Progress Summary
const getProgressSummary = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;
    const [rows] = await db.query(
      'SELECT * FROM progress_summaries WHERE project_id = ? ORDER BY summary_date DESC LIMIT 1',
      [projectId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลความคืบหน้าสำหรับโครงการนี้' });
    }
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลความคืบหน้า' });
  } finally {
    if (db) await db.release();
  }
};

const getProgressHistory = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;

    const [projects] = await db.query(
      'SELECT start_date, end_date FROM projects WHERE project_id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการที่ระบุ' });
    }

    const project = projects[0];
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const [rows] = await db.query(
      `SELECT 
        summary_id, 
        project_id, 
        installment, 
        summary_date, 
        planned_progress, 
        actual_progress, 
        progress_ahead, 
        progress_behind,
        notes,
        created_at,
        updated_at
       FROM progress_summaries 
       WHERE project_id = ? 
       ORDER BY summary_date DESC`,
      [projectId]
    );

    const enrichedRows = rows.map(row => {
      const summaryDate = new Date(row.summary_date);
      const daysWorked = Math.ceil((summaryDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const remainingDays = Math.ceil((endDate - summaryDate) / (1000 * 60 * 60 * 24));

      return {
        ...row,
        contract_start_date: project.start_date,
        contract_end_date: project.end_date,
        total_contract_days: totalDays,
        days_worked: Math.max(0, daysWorked),
        remaining_days: remainingDays
      };
    });

    res.json({ data: enrichedRows });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงประวัติความคืบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};

const createProgressSummary = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;
    const {
      installment,
      planned_progress,
      actual_progress,
      summary_date,
      notes
    } = req.body;

    // ✅ คำนวณความแตกต่างอัตโนมัติบน Server เพื่อความถูกต้อง
    const planned = Number(planned_progress || 0);
    const actual = Number(actual_progress || 0);
    const diff = actual - planned;
    const progress_ahead = diff > 0 ? Number(diff.toFixed(2)) : 0;
    const progress_behind = diff < 0 ? Number(Math.abs(diff).toFixed(2)) : 0;

    if (
      !installment ||
      planned_progress === undefined ||
      actual_progress === undefined ||
      !summary_date
    ) {
      return res.status(400).json({
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (installment, planned_progress, actual_progress, summary_date)'
      });
    }

    const [projectRows] = await db.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการที่ระบุ' });
    }

    const [existingInstallment] = await db.query(
      'SELECT * FROM progress_summaries WHERE project_id = ? AND installment = ?',
      [projectId, installment]
    );
    if (existingInstallment.length > 0) {
      return res.status(400).json({ message: 'งวดนี้มีอยู่แล้ว กรุณาเลือกงวดอื่น' });
    }

    await db.query(
      `INSERT INTO progress_summaries 
       (project_id, installment, summary_date, planned_progress, actual_progress, progress_ahead, progress_behind, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        projectId,
        installment,
        summary_date,
        planned_progress,
        actual_progress,
        progress_ahead,
        progress_behind,
        notes || null
      ]
    );

    res.json({ message: 'บันทึกข้อมูลความคืบหน้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลความคืบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};

const updateProgressSummary = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const { id: projectId, summary_id } = req.params;
    const {
      installment,
      planned_progress,
      actual_progress,
      summary_date,
      notes
    } = req.body;

    // ✅ คำนวณความแตกต่างอัตโนมัติบน Server เพื่อความถูกต้อง
    const planned = Number(planned_progress || 0);
    const actual = Number(actual_progress || 0);
    const diff = actual - planned;
    const progress_ahead = diff > 0 ? Number(diff.toFixed(2)) : 0;
    const progress_behind = diff < 0 ? Number(Math.abs(diff).toFixed(2)) : 0;

    if (
      !installment ||
      planned_progress === undefined ||
      actual_progress === undefined ||
      !summary_date
    ) {
      return res.status(400).json({
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (installment, planned_progress, actual_progress, summary_date)'
      });
    }

    const [projectRows] = await db.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการที่ระบุ' });
    }

    const [summaryRows] = await db.query(
      'SELECT * FROM progress_summaries WHERE summary_id = ? AND project_id = ?',
      [summary_id, projectId]
    );
    if (summaryRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลความคืบหน้าที่ระบุ' });
    }

    const [existingInstallment] = await db.query(
      'SELECT * FROM progress_summaries WHERE project_id = ? AND installment = ? AND summary_id != ?',
      [projectId, installment, summary_id]
    );
    if (existingInstallment.length > 0) {
      return res.status(400).json({ message: 'งวดนี้มีอยู่แล้ว กรุณาเลือกงวดอื่น' });
    }

    const [result] = await db.query(
      `UPDATE progress_summaries
       SET installment = ?,
           planned_progress = ?,
           actual_progress = ?,
           progress_ahead = ?,
           progress_behind = ?,
           summary_date = ?,
           notes = ?,
           updated_at = NOW()
       WHERE summary_id = ? AND project_id = ?`,
      [
        installment,
        planned_progress,
        actual_progress,
        progress_ahead,
        progress_behind,
        summary_date,
        notes || null,
        summary_id,
        projectId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่สามารถอัปเดตข้อมูลความคืบหน้าได้' });
    }

    res.json({ message: 'อัปเดตข้อมูลความคืบหน้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลความคืบหน้า',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};

const deleteProgressSummary = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const { id: projectId, summary_id } = req.params;

    const [summaryRows] = await db.query('SELECT * FROM progress_summaries WHERE summary_id = ? AND project_id = ?', [
      summary_id,
      projectId,
    ]);
    if (summaryRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลความคืบหน้าที่ระบุ' });
    }

    const [result] = await db.query('DELETE FROM progress_summaries WHERE summary_id = ? AND project_id = ?', [
      summary_id,
      projectId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่สามารถลบข้อมูลความคืบหน้าได้' });
    }

    res.json({ message: 'ลบข้อมูลความคืบหน้าสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลความคืบหน้า' });
  } finally {
    if (db) await db.release();
  }
};

// ฟังก์ชันสำหรับ Payment
const getPayment = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;

    console.log('📥 getPayment called for project:', projectId);

    const [rows] = await db.query(
      'SELECT * FROM payments WHERE project_id = ? ORDER BY payment_date DESC LIMIT 1',
      [projectId]
    );

    console.log('📊 Payment query result:', {
      rowCount: rows.length,
      data: rows[0] || null
    });

    // ✅ ส่ง 200 พร้อมข้อมูลว่าง แทน 404
    if (rows.length === 0) {
      console.log('⚠️ No payment data found, sending empty object with status 200');
      return res.status(200).json({
        success: true,
        data: {
          total_installments: 0,
          total_amount: 0,
          submitted_installments: 0,
          submitted_amount: 0,
          current_installment: 0,
          current_installment_amount: 0
        },
        message: 'ยังไม่มีข้อมูลการชำระเงิน'
      });
    }

    console.log('✅ Sending payment data:', rows[0]);
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('❌ Error in getPayment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};


const getPaymentHistory = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;

    // ✅ รวมฟิลด์ใหม่ทั้งหมด
    const [rows] = await db.query(
      `SELECT 
        payment_id,
        project_id,
        payment_date,
        total_installments,
        total_amount,
        submitted_installments,
        submitted_amount,
        current_installment,
        current_installment_amount,
        payment_status,
        payment_method,
        payment_note,
        approved_by,
        approved_date,
        file1,
        file2,
        file3,
        created_at,
        updated_at
       FROM payments 
       WHERE project_id = ? 
       ORDER BY payment_date DESC`,
      [projectId]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('Error in getPaymentHistory:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};

const createPayment = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
    } else if (err) {
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
    }
    let db;
    try {
      db = await getConnection();
      const projectId = req.params.id;
      const {
        payment_date,
        total_installments,
        total_amount,
        submitted_installments,
        submitted_amount,
        current_installment,
        current_installment_amount,
        payment_status,      // ✅ เพิ่ม
        payment_method,      // ✅ เพิ่ม
        payment_note,        // ✅ เพิ่ม
        approved_by,         // ✅ เพิ่ม
      } = req.body;

      // Validation
      if (
        !payment_date ||
        !total_installments ||
        !total_amount ||
        submitted_installments === undefined ||
        submitted_amount === undefined ||
        !current_installment ||
        current_installment_amount === undefined
      ) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      }

      const [projectRows] = await db.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);
      if (projectRows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบโครงการที่ระบุ' });
      }

      // จัดการไฟล์
      let file1 = null, file2 = null, file3 = null;
      if (req.files) {
        if (req.files[0]) file1 = 'Uploads/payments/' + path.basename(req.files[0].path);
        if (req.files[1]) file2 = 'Uploads/payments/' + path.basename(req.files[1].path);
        if (req.files[2]) file3 = 'Uploads/payments/' + path.basename(req.files[2].path);
      }

      // ✅ ถ้าสถานะเป็น paid ให้ตั้ง approved_date เป็นเวลาปัจจุบัน
      const approvedDate = (payment_status === 'paid' && approved_by) ? new Date() : null;

      // ✅ Insert รวมฟิลด์ใหม่
      await db.query(
        `INSERT INTO payments 
         (project_id, payment_date, total_installments, total_amount, 
          submitted_installments, submitted_amount, current_installment, 
          current_installment_amount, payment_status, payment_method, 
          payment_note, approved_by, approved_date, file1, file2, file3, 
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          projectId,
          payment_date,
          total_installments,
          total_amount,
          submitted_installments,
          submitted_amount,
          current_installment,
          current_installment_amount,
          payment_status || 'pending',  // ✅ ค่าเริ่มต้น pending
          payment_method || null,
          payment_note || null,
          approved_by || null,
          approvedDate,
          file1,
          file2,
          file3,
        ]
      );

      res.json({ message: 'บันทึกข้อมูลการชำระเงินสำเร็จ' });
    } catch (error) {
      console.error('Error in createPayment:', error);
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (db) await db.release();
    }
  });
};

const updatePayment = async (req, res) => {
  upload(req, res, async function (err) {
    console.log('📝 Update Payment - Start');
    console.log('Uploads directory:', uploadsDir);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    if (err instanceof multer.MulterError) {
      console.error('❌ Multer Error:', err);
      return res.status(400).json({
        message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        error: err.message
      });
    } else if (err) {
      console.error('❌ Upload Error:', err);
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        error: err.message
      });
    }

    let db;
    try {
      db = await getConnection();
      const { id: projectId, payment_id } = req.params;
      const {
        payment_date,
        total_installments,
        total_amount,
        submitted_installments,
        submitted_amount,
        current_installment,
        current_installment_amount,
        payment_status,      // ✅ เพิ่ม
        payment_method,      // ✅ เพิ่ม
        payment_note,        // ✅ เพิ่ม
        approved_by,         // ✅ เพิ่ม
      } = req.body;

      console.log('Project ID:', projectId);
      console.log('Payment ID:', payment_id);

      // Validation
      if (!payment_date) {
        return res.status(400).json({ message: 'กรุณาระบุวันที่ชำระเงิน' });
      }
      if (!total_installments) {
        return res.status(400).json({ message: 'กรุณาระบุจำนวนงวดทั้งหมด' });
      }
      if (!total_amount) {
        return res.status(400).json({ message: 'กรุณาระบุยอดเงินทั้งหมด' });
      }
      if (submitted_installments === undefined) {
        return res.status(400).json({ message: 'กรุณาระบุจำนวนงวดที่ส่งแล้ว' });
      }
      if (submitted_amount === undefined) {
        return res.status(400).json({ message: 'กรุณาระบุยอดเงินที่ส่งแล้ว' });
      }
      if (!current_installment) {
        return res.status(400).json({ message: 'กรุณาระบุงวดปัจจุบัน' });
      }
      if (current_installment_amount === undefined) {
        return res.status(400).json({ message: 'กรุณาระบุยอดเงินงวดปัจจุบัน' });
      }

      const [projectRows] = await db.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);
      if (projectRows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบโครงการที่ระบุ' });
      }

      const [paymentRows] = await db.query('SELECT * FROM payments WHERE payment_id = ? AND project_id = ?', [
        payment_id,
        projectId,
      ]);
      if (paymentRows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลการชำระเงินที่ระบุ' });
      }

      // จัดการไฟล์
      let file1 = paymentRows[0].file1;
      let file2 = paymentRows[0].file2;
      let file3 = paymentRows[0].file3;

      if (req.files && req.files.length > 0) {
        console.log('📎 New files uploaded:', req.files.length);
        if (req.files[0]) {
          file1 = 'Uploads/payments/' + path.basename(req.files[0].path);
          console.log('File 1:', file1);
        }
        if (req.files[1]) {
          file2 = 'Uploads/payments/' + path.basename(req.files[1].path);
          console.log('File 2:', file2);
        }
        if (req.files[2]) {
          file3 = 'Uploads/payments/' + path.basename(req.files[2].path);
          console.log('File 3:', file3);
        }
      } else {
        console.log('📎 No new files, keeping existing files');
      }

      // ✅ ถ้าเปลี่ยนสถานะเป็น paid และมี approved_by ให้อัปเดต approved_date
      const existingApprovedDate = paymentRows[0].approved_date;
      let approvedDate = existingApprovedDate;

      if (payment_status === 'paid' && approved_by && !existingApprovedDate) {
        approvedDate = new Date();
      } else if (payment_status !== 'paid') {
        approvedDate = null; // ถ้าเปลี่ยนเป็นสถานะอื่นให้ลบวันที่อนุมัติ
      }

      console.log('💾 Updating database...');

      // ✅ Update รวมฟิลด์ใหม่
      const [result] = await db.query(
        `UPDATE payments 
         SET payment_date = ?, 
             total_installments = ?, 
             total_amount = ?, 
             submitted_installments = ?, 
             submitted_amount = ?, 
             current_installment = ?, 
             current_installment_amount = ?,
             payment_status = ?,
             payment_method = ?,
             payment_note = ?,
             approved_by = ?,
             approved_date = ?,
             file1 = ?, 
             file2 = ?, 
             file3 = ?, 
             updated_at = NOW()
         WHERE payment_id = ? AND project_id = ?`,
        [
          payment_date,
          total_installments,
          total_amount,
          submitted_installments,
          submitted_amount,
          current_installment,
          current_installment_amount,
          payment_status || 'pending',  // ✅ เพิ่ม
          payment_method || null,       // ✅ เพิ่ม
          payment_note || null,         // ✅ เพิ่ม
          approved_by || null,          // ✅ เพิ่ม
          approvedDate,                 // ✅ เพิ่ม
          file1,
          file2,
          file3,
          payment_id,
          projectId,
        ]
      );

      console.log('Database update result:', result);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่สามารถอัปเดตข้อมูลการชำระเงินได้' });
      }

      console.log('✅ Update successful');
      res.json({ message: 'อัปเดตข้อมูลการชำระเงินสำเร็จ' });

    } catch (error) {
      console.error('❌ Database Error:', error);
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลการชำระเงิน',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (db) await db.release();
    }
  });
};

const deletePayment = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const { id: projectId, payment_id } = req.params;

    const [paymentRows] = await db.query('SELECT * FROM payments WHERE payment_id = ? AND project_id = ?', [
      payment_id,
      projectId,
    ]);
    if (paymentRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการชำระเงินที่ระบุ' });
    }

    const [result] = await db.query('DELETE FROM payments WHERE payment_id = ? AND project_id = ?', [
      payment_id,
      projectId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่สามารถลบข้อมูลการชำระเงินได้' });
    }

    res.json({ message: 'ลบข้อมูลการชำระเงินสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลการชำระเงิน' });
  } finally {
    if (db) await db.release();
  }
};

/**
 * ✅ ดึงประวัติการชำระเงินแบบละเอียด พร้อมคำนวณข้อมูลแต่ละงวด
 * พร้อมฟิลด์ใหม่: payment_status, payment_method, payment_note, approved_by, approved_date
 */
const getDetailedPaymentHistory = async (req, res) => {
  let db;
  try {
    db = await getConnection();
    const projectId = req.params.id;

    console.log('📥 getDetailedPaymentHistory called for project:', projectId);

    const [payments] = await db.query(
      `SELECT 
        payment_id,
        project_id,
        payment_date,
        total_installments,
        total_amount,
        submitted_installments,
        submitted_amount,
        current_installment,
        current_installment_amount,
        payment_status,
        payment_method,
        payment_note,
        approved_by,
        approved_date,
        file1,
        file2,
        file3,
        created_at,
        updated_at
       FROM payments 
       WHERE project_id = ? 
       ORDER BY current_installment ASC`,
      [projectId]
    );

    console.log('📊 Payment history query result:', {
      rowCount: payments.length,
      installments: payments.map(p => p.current_installment)
    });

    // ✅ ส่ง 200 พร้อม array ว่าง แทน 404
    if (payments.length === 0) {
      console.log('⚠️ No payment history found, sending empty array with status 200');
      return res.status(200).json({
        success: true,
        data: [],
        message: 'ยังไม่มีข้อมูลการชำระเงิน'
      });
    }

    // สร้างข้อมูลแต่ละงวด
    const totalInstallments = payments[0].total_installments;
    const totalAmount = Number(payments[0].total_amount);
    const installmentDetails = [];

    console.log('🔄 Creating detailed history for', totalInstallments, 'installments');

    // สร้าง map ของข้อมูลการชำระแต่ละงวด
    const paymentMap = new Map();
    payments.forEach(payment => {
      paymentMap.set(payment.current_installment, payment);
    });

    // สร้างข้อมูลทุกงวด
    let cumulativeSubmittedAmount = 0;

    for (let i = 1; i <= totalInstallments; i++) {
      const payment = paymentMap.get(i);

      if (payment) {
        // งวดที่มีข้อมูลการชำระ
        const installmentAmount = Number(payment.current_installment_amount);
        cumulativeSubmittedAmount += installmentAmount;

        installmentDetails.push({
          installment: i,
          date: payment.payment_date,
          submitted: payment.payment_status === 'paid',
          payment_id: payment.payment_id,
          current_installment_amount: installmentAmount,
          submitted_amount: Number(payment.submitted_amount),
          cumulative_submitted_amount: cumulativeSubmittedAmount,
          total_installments: payment.total_installments,
          total_amount: Number(payment.total_amount),
          submitted_installments: i,
          payment_status: payment.payment_status,
          payment_method: payment.payment_method,
          payment_note: payment.payment_note,
          approved_by: payment.approved_by,
          approved_date: payment.approved_date,
          file1: payment.file1,
          file2: payment.file2,
          file3: payment.file3,
          created_at: payment.created_at,
          updated_at: payment.updated_at
        });
      } else {
        // งวดที่ยังไม่มีข้อมูลการชำระ
        installmentDetails.push({
          installment: i,
          date: null,
          submitted: false,
          payment_id: null,
          current_installment_amount: 0,
          submitted_amount: cumulativeSubmittedAmount,
          cumulative_submitted_amount: cumulativeSubmittedAmount,
          total_installments: totalInstallments,
          total_amount: totalAmount,
          submitted_installments: i - 1,
          payment_status: 'pending',
          payment_method: null,
          payment_note: null,
          approved_by: null,
          approved_date: null,
          file1: null,
          file2: null,
          file3: null
        });
      }
    }

    console.log('✅ Sending detailed history:', {
      totalInstallments: installmentDetails.length,
      paidInstallments: installmentDetails.filter(i => i.submitted).length
    });

    res.status(200).json({
      success: true,
      data: installmentDetails
    });
  } catch (error) {
    console.error('❌ Error in getDetailedPaymentHistory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) await db.release();
  }
};

module.exports = {
  getProgressSummary,
  getProgressHistory,
  createProgressSummary,
  updateProgressSummary,
  deleteProgressSummary,
  getPayment,
  getPaymentHistory,
  getDetailedPaymentHistory,
  createPayment,
  updatePayment,
  deletePayment
};