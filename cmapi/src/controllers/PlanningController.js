// controllers/PlanningController.js
const { getConnection } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// กำหนด Storage สำหรับ Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'Uploads', 'planning');

    // สร้างโฟลเดอร์ถ้ายังไม่มี (recursive)
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('✅ Created upload directory:', uploadPath);
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    // ✅ Decode ชื่อไฟล์ที่เป็น UTF-8
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalname);

    // ✅ ใช้ job_number และ code จาก body เป็นชื่อไฟล์
    const jobNumber = req.body.job_number || 'PROJECT';
    const code = req.body.type_code || req.body.subtype_code || 'default';

    // แทนที่ . ด้วย _ เพื่อไม่ให้เกิดปัญหากับ extension
    const safeCode = code.replace(/\./g, '_');

    // รูปแบบสุดท้าย: JOB_NUMBER_CODE.ext (เช่น DCEM-001_1_05_01.pdf)
    const filename = `${jobNumber}_${safeCode}${ext}`;

    console.log('📁 Original filename (UTF-8):', originalname);
    console.log('📁 Job Number:', jobNumber);
    console.log('📁 Code from request:', code);
    console.log('📁 Saving as:', filename);

    cb(null, filename);
  }
});

// Filter ไฟล์ - อนุญาตเฉพาะรูปภาพ, PDF และ IFC
const fileFilter = (req, file, cb) => {
  // ✅ Decode ชื่อไฟล์สำหรับการตรวจสอบ extension
  const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

  // อนุญาต ifc ด้วย
  const allowedTypes = /jpeg|jpg|png|gif|pdf|ifc/;
  const ext = path.extname(originalname).toLowerCase();
  const isAllowedExt = allowedTypes.test(ext);

  // mimetype สำหรับ ifc อาจเป็น application/octet-stream หรือ text/plain ขึ้นอยู่กับ browser
  const isAllowedMime = allowedTypes.test(file.mimetype) || (ext === '.ifc');

  console.log('🔍 File validation:', {
    originalname: originalname,
    mimetype: file.mimetype,
    extname: ext,
    valid: isAllowedExt || isAllowedMime
  });

  if (isAllowedExt || isAllowedMime) {
    return cb(null, true);
  } else {
    cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ, PDF หรือ IFC เท่านั้น!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: fileFilter
});

// Export upload middleware with error handling
exports.uploadMiddleware = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'ifc_file', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      console.error('Upload Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // ✅ Process uploaded files
    if (req.files) {
      // Decode attachment name
      if (req.files['attachment'] && req.files['attachment'][0]) {
        const file = req.files['attachment'][0];
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        console.log('✅ Attachment received:', file.originalname);
      }

      // Decode ifc_file name
      if (req.files['ifc_file'] && req.files['ifc_file'][0]) {
        const file = req.files['ifc_file'][0];
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        console.log('✅ IFC file received:', file.originalname);
      }
    }

    next();
  });
};

// =============================================
// ROOT LEVEL
// =============================================

// GET: ดึงข้อมูล Root ทั้งหมดของโครงการ
exports.getRootsByProject = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root 
       WHERE project_id = ? AND is_active = 1 
       ORDER BY sort_order, root_code`,
      [projectId]
    );

    res.json({ success: true, data: roots });
  } catch (error) {
    console.error('Error fetching roots:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// POST: เพิ่ม Root ใหม่
exports.createRoot = async (req, res) => {
  let connection;
  try {
    const { project_id, root_code, root_name, root_description, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();

    const [result] = await connection.query(
      `INSERT INTO s_curve_root 
       (project_id, root_code, root_name, root_description, start_date, end_date, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, root_code, root_name, root_description, start_date, end_date, sort_order || 0]
    );

    res.json({ success: true, data: { root_id: result.insertId } });
  } catch (error) {
    console.error('Error creating root:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// PUT: แก้ไข Root
exports.updateRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    const { root_code, root_name, root_description, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_root 
       SET root_code = ?, root_name = ?, root_description = ?, 
           start_date = ?, end_date = ?, sort_order = ? 
       WHERE root_id = ?`,
      [root_code, root_name, root_description, start_date, end_date, sort_order, rootId]
    );

    res.json({ success: true, message: 'อัพเดทสำเร็จ' });
  } catch (error) {
    console.error('Error updating root:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// DELETE: ลบ Root (soft delete)
exports.deleteRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_root SET is_active = 0 WHERE root_id = ?`,
      [rootId]
    );

    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Error deleting root:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// CATEGORY LEVEL
// =============================================

// GET: ดึงข้อมูล Category ตาม Root ID
exports.getCategoriesByRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    connection = await getConnection();

    const [categories] = await connection.query(
      `SELECT * FROM s_curve_category 
       WHERE root_id = ? AND is_active = 1 
       ORDER BY sort_order, category_code`,
      [rootId]
    );

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// POST: เพิ่ม Category ใหม่
exports.createCategory = async (req, res) => {
  let connection;
  try {
    const { root_id, category_code, category_name, category_description, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();

    const [result] = await connection.query(
      `INSERT INTO s_curve_category 
       (root_id, category_code, category_name, category_description, start_date, end_date, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [root_id, category_code, category_name, category_description, start_date, end_date, sort_order || 0]
    );

    res.json({ success: true, data: { category_id: result.insertId } });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// PUT: แก้ไข Category
exports.updateCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    const { category_code, category_name, category_description, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_category 
       SET category_code = ?, category_name = ?, category_description = ?, 
           start_date = ?, end_date = ?, sort_order = ? 
       WHERE category_id = ?`,
      [category_code, category_name, category_description, start_date, end_date, sort_order, categoryId]
    );

    res.json({ success: true, message: 'อัพเดทสำเร็จ' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// DELETE: ลบ Category
exports.deleteCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_category SET is_active = 0 WHERE category_id = ?`,
      [categoryId]
    );

    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TYPE LEVEL (WITH FILE UPLOAD)
// =============================================

// GET: ดึงข้อมูล Type ตาม Category ID
exports.getTypesByCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    connection = await getConnection();

    const [types] = await connection.query(
      `SELECT * FROM s_curve_type 
       WHERE category_id = ? AND is_active = 1 
       ORDER BY sort_order, type_code`,
      [categoryId]
    );

    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// POST: เพิ่ม Type ใหม่ (พร้อมอัปโหลดไฟล์)
exports.createType = async (req, res) => {
  let connection;
  try {
    console.log('=== CREATE TYPE DEBUG ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { category_id, type_code, type_name, type_description, type_price, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();

    let attachmentUrl = null;
    let attachmentName = null;
    let ifcUrl = null;
    let ifcName = null;

    // จัดการไฟล์แนบธรรมดา
    if (req.files && req.files['attachment']) {
      attachmentUrl = `/Uploads/planning/${req.files['attachment'][0].filename}`;
      attachmentName = req.files['attachment'][0].originalname;
    }

    // จัดการไฟล์ IFC
    if (req.files && req.files['ifc_file']) {
      ifcUrl = `/Uploads/planning/${req.files['ifc_file'][0].filename}`;
      ifcName = req.files['ifc_file'][0].originalname;
    }

    const [result] = await connection.query(
      `INSERT INTO s_curve_type 
       (category_id, type_code, type_name, type_description, type_price, start_date, end_date, sort_order, 
        attachment_url, attachment_name, ifc_url, ifc_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, type_code, type_name || '', type_description || '', type_price || 0, start_date || null, end_date || null, sort_order || 0,
        attachmentUrl, attachmentName, ifcUrl, ifcName]
    );

    console.log('Insert result:', result.insertId);

    // อัพเดทราคารวม
    await updateRootTotalPrice(connection, category_id);

    // อัพเดทวันที่และสถานะ
    await updateRelatedData(connection, result.insertId);

    res.json({ success: true, data: { type_id: result.insertId } });
  } catch (error) {
    console.error('Error creating type:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// PUT: แก้ไข Type (พร้อมอัปโหลดไฟล์)
exports.updateType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;
    const { type_code, type_name, type_description, type_price, start_date, end_date, sort_order, remove_attachment, remove_ifc } = req.body;
    connection = await getConnection();

    // Get category_id and old attachment for updating
    const [typeData] = await connection.query(
      `SELECT category_id, attachment_url, attachment_name, ifc_url, ifc_name FROM s_curve_type WHERE type_id = ?`,
      [typeId]
    );

    // ✅ เริ่มต้นด้วยค่าเดิม
    let attachmentUrl = typeData[0]?.attachment_url || null;
    let attachmentName = typeData[0]?.attachment_name || null;
    let ifcUrl = typeData[0]?.ifc_url || null;
    let ifcName = typeData[0]?.ifc_name || null;

    // ✅ ถ้าต้องการลบไฟล์แนบ
    if (remove_attachment === 'true' || remove_attachment === true) {
      if (typeData[0]?.attachment_url) {
        const oldFilePath = path.join(__dirname, '..', typeData[0].attachment_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Deleted file:', oldFilePath);
        }
      }
      attachmentUrl = null;
      attachmentName = null;
    }
    // ✅ ถ้ามีการอัพโหลดไฟล์ใหม่
    else if (req.files && req.files['attachment']) {
      if (typeData[0]?.attachment_url) {
        const oldFilePath = path.join(__dirname, '..', typeData[0].attachment_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      attachmentUrl = `/Uploads/planning/${req.files['attachment'][0].filename}`;
      attachmentName = req.files['attachment'][0].originalname;
    }

    // ✅ ถ้าต้องการลบไฟล์ IFC
    if (remove_ifc === 'true' || remove_ifc === true) {
      if (typeData[0]?.ifc_url) {
        const oldFilePath = path.join(__dirname, '..', typeData[0].ifc_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      ifcUrl = null;
      ifcName = null;
    }
    // ✅ ถ้ามีการอัพโหลดไฟล์ IFC ใหม่
    else if (req.files && req.files['ifc_file']) {
      if (typeData[0]?.ifc_url) {
        const oldFilePath = path.join(__dirname, '..', typeData[0].ifc_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      ifcUrl = `/Uploads/planning/${req.files['ifc_file'][0].filename}`;
      ifcName = req.files['ifc_file'][0].originalname;
    }

    // Update database
    await connection.query(
      `UPDATE s_curve_type 
       SET type_code = ?, type_name = ?, type_description = ?, type_price = ?,
           start_date = ?, end_date = ?, sort_order = ?, 
           attachment_url = ?, attachment_name = ?, 
           ifc_url = ?, ifc_name = ? 
       WHERE type_id = ?`,
      [type_code, type_name, type_description, type_price || 0, start_date, end_date, sort_order,
        attachmentUrl, attachmentName, ifcUrl, ifcName, typeId]
    );

    // อัพเดทราคารวม
    if (typeData.length > 0) {
      await updateRootTotalPrice(connection, typeData[0].category_id);
    }

    // อัพเดทวันที่และสถานะ
    await updateRelatedData(connection, typeId);

    res.json({ success: true, message: 'อัพเดทสำเร็จ' });
  } catch (error) {
    console.error('Error updating type:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// SUBTYPE LEVEL (WITH FILE UPLOAD)
// =============================================

// GET: ดึงข้อมูล Subtype ตาม Type ID
exports.getSubtypesByType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;
    connection = await getConnection();

    const [subtypes] = await connection.query(
      `SELECT * FROM s_curve_subtype 
       WHERE type_id = ? AND is_active = 1 
       ORDER BY sort_order, subtype_code`,
      [typeId]
    );

    res.json({ success: true, data: subtypes });
  } catch (error) {
    console.error('Error fetching subtypes:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;
    connection = await getConnection();

    // Get category_id before deletion
    const [typeData] = await connection.query(
      `SELECT category_id FROM s_curve_type WHERE type_id = ?`,
      [typeId]
    );

    await connection.query(
      `UPDATE s_curve_type SET is_active = 0 WHERE type_id = ?`,
      [typeId]
    );

    // อัพเดทราคารวม
    if (typeData.length > 0) {
      await updateRootTotalPrice(connection, typeData[0].category_id);
    }

    // อัพเดทวันที่และสถานะ
    await updateRelatedData(connection, typeId);

    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Error deleting type:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// POST: เพิ่ม Subtype ใหม่ (พร้อมอัปโหลดไฟล์)
exports.createSubtype = async (req, res) => {
  let connection;
  try {
    console.log('=== CREATE SUBTYPE DEBUG ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const {
      type_id, subtype_code, subtype_name, subtype_description,
      quantity, unit, unit_price, total_price,
      start_date, end_date, sort_order
    } = req.body;
    connection = await getConnection();

    let attachmentUrl = null;
    let attachmentName = null;
    let ifcUrl = null;
    let ifcName = null;

    // จัดการไฟล์แนบธรรมดา
    if (req.files && req.files['attachment']) {
      attachmentUrl = `/Uploads/planning/${req.files['attachment'][0].filename}`;
      attachmentName = req.files['attachment'][0].originalname;
    }

    // จัดการไฟล์ IFC
    if (req.files && req.files['ifc_file']) {
      ifcUrl = `/Uploads/planning/${req.files['ifc_file'][0].filename}`;
      ifcName = req.files['ifc_file'][0].originalname;
    }

    const [result] = await connection.query(
      `INSERT INTO s_curve_subtype 
       (type_id, subtype_code, subtype_name, subtype_description, 
        quantity, unit, unit_price, total_price, start_date, end_date, sort_order, 
        attachment_url, attachment_name, ifc_url, ifc_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type_id, subtype_code, subtype_name || '', subtype_description || '',
        quantity || null, unit || '', unit_price !== undefined ? (unit_price || null) : null, total_price || null, start_date || null, end_date || null, sort_order || 0,
        attachmentUrl, attachmentName, ifcUrl, ifcName]
    );

    console.log('Insert result:', result.insertId);

    // อัพเดทวันที่และสถานะ
    await updateRelatedData(connection, result.insertId, true);

    res.json({ success: true, data: { subtype_id: result.insertId } });
  } catch (error) {
    console.error('Error creating subtype:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// PUT: แก้ไข Subtype (พร้อมอัปโหลดไฟล์)
exports.updateSubtype = async (req, res) => {
  let connection;
  try {
    const { subtypeId } = req.params;
    const {
      subtype_code, subtype_name, subtype_description,
      quantity, unit, unit_price, total_price,
      start_date, end_date, progress, sort_order, remove_attachment, remove_ifc
    } = req.body;
    connection = await getConnection();

    // Get type_id and old attachment before update
    const [subtypeData] = await connection.query(
      `SELECT type_id, attachment_url, attachment_name, ifc_url, ifc_name FROM s_curve_subtype WHERE subtype_id = ?`,
      [subtypeId]
    );

    // ✅ เริ่มต้นด้วยค่าเดิม
    let attachmentUrl = subtypeData[0]?.attachment_url || null;
    let attachmentName = subtypeData[0]?.attachment_name || null;
    let ifcUrl = subtypeData[0]?.ifc_url || null;
    let ifcName = subtypeData[0]?.ifc_name || null;

    // ✅ ถ้าต้องการลบไฟล์แนบ
    if (remove_attachment === 'true' || remove_attachment === true) {
      if (subtypeData[0]?.attachment_url) {
        const oldFilePath = path.join(__dirname, '..', subtypeData[0].attachment_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      attachmentUrl = null;
      attachmentName = null;
    }
    // ✅ ถ้ามีการอัพโหลดไฟล์ใหม่
    else if (req.files && req.files['attachment']) {
      if (subtypeData[0]?.attachment_url) {
        const oldFilePath = path.join(__dirname, '..', subtypeData[0].attachment_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      attachmentUrl = `/Uploads/planning/${req.files['attachment'][0].filename}`;
      attachmentName = req.files['attachment'][0].originalname;
    }

    // ✅ ถ้าต้องการลบไฟล์ IFC
    if (remove_ifc === 'true' || remove_ifc === true) {
      if (subtypeData[0]?.ifc_url) {
        const oldFilePath = path.join(__dirname, '..', subtypeData[0].ifc_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      ifcUrl = null;
      ifcName = null;
    }
    // ✅ ถ้ามีการอัพโหลดไฟล์ IFC ใหม่
    else if (req.files && req.files['ifc_file']) {
      if (subtypeData[0]?.ifc_url) {
        const oldFilePath = path.join(__dirname, '..', subtypeData[0].ifc_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      ifcUrl = `/Uploads/planning/${req.files['ifc_file'][0].filename}`;
      ifcName = req.files['ifc_file'][0].originalname;
    }

    // Update database
    await connection.query(
      `UPDATE s_curve_subtype 
       SET subtype_code = ?, subtype_name = ?, subtype_description = ?, 
           quantity = ?, unit = ?, unit_price = ?, total_price = ?,
           start_date = ?, end_date = ?, progress = ?, sort_order = ?, 
           attachment_url = ?, attachment_name = ?, 
           ifc_url = ?, ifc_name = ? 
       WHERE subtype_id = ?`,
      [subtype_code, subtype_name, subtype_description,
        quantity, unit, unit_price, total_price,
        start_date, end_date, progress, sort_order,
        attachmentUrl, attachmentName, ifcUrl, ifcName, subtypeId]
    );

    // อัพเดทวันที่และสถานะ
    if (subtypeData.length > 0) {
      await updateRelatedData(connection, subtypeId, true);
    }

    res.json({ success: true, message: 'อัพเดทสำเร็จ' });
  } catch (error) {
    console.error('Error updating subtype:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// DELETE: ลบ Subtype
exports.deleteSubtype = async (req, res) => {
  let connection;
  try {
    const { subtypeId } = req.params;
    connection = await getConnection();

    // Get type_id before deletion
    const [subtypeData] = await connection.query(
      `SELECT type_id FROM s_curve_subtype WHERE subtype_id = ?`,
      [subtypeId]
    );

    await connection.query(
      `UPDATE s_curve_subtype SET is_active = 0 WHERE subtype_id = ?`,
      [subtypeId]
    );

    // อัพเดทวันที่และสถานะ
    if (subtypeData.length > 0) {
      await updateRelatedData(connection, subtypeId, true);
    }

    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Error deleting subtype:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

// ฟังก์ชันอัพเดทราคารวมของ Root
async function updateRootTotalPrice(connection, categoryId) {
  try {
    const [categoryData] = await connection.query(
      `SELECT root_id FROM s_curve_category WHERE category_id = ?`,
      [categoryId]
    );

    if (categoryData.length === 0) return;

    const rootId = categoryData[0].root_id;

    const [totalResult] = await connection.query(
      `SELECT 
        (
          SELECT COALESCE(SUM(t.type_price), 0)
          FROM s_curve_type t
          WHERE t.category_id IN (SELECT category_id FROM s_curve_category WHERE root_id = ? AND is_active = 1)
          AND t.is_active = 1
          AND NOT EXISTS (SELECT 1 FROM s_curve_subtype s WHERE s.type_id = t.type_id AND s.is_active = 1)
        ) + (
          SELECT COALESCE(SUM(s.total_price), 0)
          FROM s_curve_subtype s
          JOIN s_curve_type t ON s.type_id = t.type_id
          JOIN s_curve_category c ON t.category_id = c.category_id
          WHERE c.root_id = ? AND s.is_active = 1 AND t.is_active = 1 AND c.is_active = 1
        ) as total_price`,
      [rootId, rootId]
    );

    const totalPrice = totalResult[0].total_price || 0;

    await connection.query(
      `UPDATE s_curve_root 
       SET root_total_price = ? 
       WHERE root_id = ?`,
      [totalPrice, rootId]
    );

  } catch (error) {
    console.error('Error updating root total price:', error);
    throw error;
  }
}

// ฟังก์ชันอัพเดทวันที่ของ Category จาก Types และ Subtypes
async function updateCategoryDates(connection, categoryId) {
  try {
    const [dateResult] = await connection.query(
      `SELECT 
        MIN(all_dates.start_date) as min_start_date,
        MAX(all_dates.end_date) as max_end_date
       FROM (
         SELECT start_date, end_date
         FROM s_curve_type
         WHERE category_id = ? AND is_active = 1
         
         UNION ALL
         
         SELECT s.start_date, s.end_date
         FROM s_curve_subtype s
         JOIN s_curve_type t ON s.type_id = t.type_id
         WHERE t.category_id = ? AND s.is_active = 1
       ) as all_dates
       WHERE all_dates.start_date IS NOT NULL OR all_dates.end_date IS NOT NULL`,
      [categoryId, categoryId]
    );

    const { min_start_date, max_end_date } = dateResult[0];

    if (min_start_date || max_end_date) {
      await connection.query(
        `UPDATE s_curve_category 
         SET start_date = ?, end_date = ? 
         WHERE category_id = ?`,
        [min_start_date, max_end_date, categoryId]
      );
    }

  } catch (error) {
    console.error('Error updating category dates:', error);
    throw error;
  }
}

// ฟังก์ชันอัพเดทวันที่และสถานะของ Root จาก Categories, Types และ Subtypes
async function updateRootDatesAndStatus(connection, rootId) {
  try {
    const [dateResult] = await connection.query(
      `SELECT 
        MIN(all_dates.start_date) as min_start_date,
        MAX(all_dates.end_date) as max_end_date,
        COUNT(all_dates.item_id) as total_items,
        SUM(CASE WHEN all_dates.end_date IS NOT NULL THEN 1 ELSE 0 END) as items_with_end_date
       FROM (
         SELECT category_id as item_id, start_date, end_date
         FROM s_curve_category
         WHERE root_id = ? AND is_active = 1
         
         UNION ALL
         
         SELECT t.type_id as item_id, t.start_date, t.end_date
         FROM s_curve_type t
         JOIN s_curve_category c ON t.category_id = c.category_id
         WHERE c.root_id = ? AND t.is_active = 1
         
         UNION ALL
         
         SELECT s.subtype_id as item_id, s.start_date, s.end_date
         FROM s_curve_subtype s
         JOIN s_curve_type t ON s.type_id = t.type_id
         JOIN s_curve_category c ON t.category_id = c.category_id
         WHERE c.root_id = ? AND s.is_active = 1
       ) as all_dates`,
      [rootId, rootId, rootId]
    );

    const { min_start_date, max_end_date, total_items, items_with_end_date } = dateResult[0];

    let status = 0;
    if (total_items > 0 && total_items === items_with_end_date) {
      status = 1;
    }

    await connection.query(
      `UPDATE s_curve_root 
       SET start_date = ?, 
           end_date = ?, 
           status = ?
       WHERE root_id = ?`,
      [min_start_date, max_end_date, status, rootId]
    );

  } catch (error) {
    console.error('Error updating root dates and status:', error);
    throw error;
  }
}

// ฟังก์ชันอัพเดทวันที่ของ Type จาก Subtypes
async function updateTypeDates(connection, typeId) {
  try {
    const [dateResult] = await connection.query(
      `SELECT 
        MIN(start_date) as min_start_date,
        MAX(end_date) as max_end_date
       FROM s_curve_subtype
       WHERE type_id = ? AND is_active = 1
       AND (start_date IS NOT NULL OR end_date IS NOT NULL)`,
      [typeId]
    );

    const { min_start_date, max_end_date } = dateResult[0];

    if (min_start_date || max_end_date) {
      await connection.query(
        `UPDATE s_curve_type 
         SET start_date = ?, end_date = ? 
         WHERE type_id = ?`,
        [min_start_date, max_end_date, typeId]
      );
    }

  } catch (error) {
    console.error('Error updating type dates:', error);
    throw error;
  }
}

// ฟังก์ชันอัพเดทข้อมูลหลังการเปลี่ยนแปลง Type หรือ Subtype
async function updateRelatedData(connection, typeOrSubtypeId, isSubtype = false) {
  try {
    let typeId = typeOrSubtypeId;

    if (isSubtype) {
      const [subtypeData] = await connection.query(
        `SELECT type_id FROM s_curve_subtype WHERE subtype_id = ?`,
        [typeOrSubtypeId]
      );
      if (subtypeData.length === 0) return;
      typeId = subtypeData[0].type_id;

      // อัพเดทวันที่ของ Type ก่อน
      await updateTypeDates(connection, typeId);
    }

    const [typeData] = await connection.query(
      `SELECT category_id FROM s_curve_type WHERE type_id = ?`,
      [typeId]
    );

    if (typeData.length === 0) return;

    const categoryId = typeData[0].category_id;

    const [categoryData] = await connection.query(
      `SELECT root_id FROM s_curve_category WHERE category_id = ?`,
      [categoryId]
    );

    if (categoryData.length === 0) return;

    const rootId = categoryData[0].root_id;

    await updateCategoryDates(connection, categoryId);
    await updateRootDatesAndStatus(connection, rootId);

  } catch (error) {
    console.error('Error updating related data:', error);
    throw error;
  }
}

// API Endpoint สำหรับอัพเดทข้อมูลทั้งหมดของ Root
exports.updateRootDataByProject = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT root_id FROM s_curve_root 
       WHERE project_id = ? AND is_active = 1`,
      [projectId]
    );

    for (const root of roots) {
      const [totalResult] = await connection.query(
        `SELECT 
          (
            SELECT COALESCE(SUM(t.type_price), 0)
            FROM s_curve_type t
            WHERE t.category_id IN (SELECT category_id FROM s_curve_category WHERE root_id = ? AND is_active = 1)
            AND t.is_active = 1
            AND NOT EXISTS (SELECT 1 FROM s_curve_subtype s WHERE s.type_id = t.type_id AND s.is_active = 1)
          ) + (
            SELECT COALESCE(SUM(s.total_price), 0)
            FROM s_curve_subtype s
            JOIN s_curve_type t ON s.type_id = t.type_id
            JOIN s_curve_category c ON t.category_id = c.category_id
            WHERE c.root_id = ? AND s.is_active = 1 AND t.is_active = 1 AND c.is_active = 1
          ) as total_price`,
        [root.root_id, root.root_id]
      );

      const totalPrice = totalResult[0].total_price || 0;

      await connection.query(
        `UPDATE s_curve_root 
         SET root_total_price = ? 
         WHERE root_id = ?`,
        [totalPrice, root.root_id]
      );

      const [categories] = await connection.query(
        `SELECT category_id FROM s_curve_category 
         WHERE root_id = ? AND is_active = 1`,
        [root.root_id]
      );

      for (const category of categories) {
        await updateCategoryDates(connection, category.category_id);
      }

      await updateRootDatesAndStatus(connection, root.root_id);
    }

    res.json({ success: true, message: 'อัพเดทข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Error updating root data:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TREE VIEW
// =============================================

exports.getFullTree = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root 
       WHERE project_id = ? AND is_active = 1 
       ORDER BY sort_order, root_code`,
      [projectId]
    );

    for (let root of roots) {
      const [categories] = await connection.query(
        `SELECT * FROM s_curve_category 
         WHERE root_id = ? AND is_active = 1 
         ORDER BY sort_order, category_code`,
        [root.root_id]
      );

      for (let category of categories) {
        const [types] = await connection.query(
          `SELECT * FROM s_curve_type 
           WHERE category_id = ? AND is_active = 1 
           ORDER BY sort_order, type_code`,
          [category.category_id]
        );

        for (let type of types) {
          const [subtypes] = await connection.query(
            `SELECT * FROM s_curve_subtype 
             WHERE type_id = ? AND is_active = 1 
             ORDER BY sort_order, subtype_code`,
            [type.type_id]
          );

          type.subtypes = subtypes;
        }

        category.types = types;
      }

      root.categories = categories;
    }

    res.json({ success: true, data: roots });
  } catch (error) {
    console.error('Error fetching full tree:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// DOWNLOAD PLANNING IFC FILE (FOR VIEWER)
// =============================================
exports.downloadPlanningIfc = async (req, res) => {
  let connection;
  try {
    const { type, id } = req.params;
    connection = await getConnection();

    let query = '';
    if (type === 'type') {
      query = 'SELECT ifc_url, ifc_name FROM s_curve_type WHERE type_id = ?';
    } else if (type === 'subtype') {
      query = 'SELECT ifc_url, ifc_name FROM s_curve_subtype WHERE subtype_id = ?';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file type' });
    }

    const [rows] = await connection.query(query, [id]);

    if (rows.length === 0 || !rows[0].ifc_url) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์ IFC' });
    }

    const ifcUrl = rows[0].ifc_url;
    const ifcName = rows[0].ifc_name || 'model.ifc';

    // Path: /uploads/planning/filename.ifc
    // __dirname is src/controllers
    const filename = path.basename(ifcUrl);
    const filePath = path.join(__dirname, '..', 'Uploads', 'planning', filename);

    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์ในเซิร์ฟเวอร์' });
    }

    res.download(filePath, ifcName);
  } catch (error) {
    console.error('Error downloading IFC:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = exports;