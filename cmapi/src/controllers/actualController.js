// controllers/actualController.js
const { getConnection } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📸 กำหนด Storage สำหรับ Multer (Actual Photos)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'Uploads', 'actual');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `actual_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น!'));
    }
  }
});

// Middleware สำหรับจัดการการอัปโหลดไฟล์หลายรูป
exports.uploadPhotosMiddleware = (req, res, next) => {
  const uploadArray = upload.array('photos', 5); // จำกัด 5 รูป

  uploadArray(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// =============================================
// ROOT LEVEL
// =============================================

exports.getRootsByProject = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();
    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root WHERE project_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
      [projectId]
    );
    res.json({ success: true, data: roots });
  } catch (error) {
    console.error('Error getting roots:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Root', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.createRoot = async (req, res) => {
  let connection;
  try {
    const { project_id, root_code, root_name, root_description, start_date, end_date, sort_order } = req.body;
    if (!project_id || !root_code || !root_name) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ project_id, root_code และ root_name' });
    }
    connection = await getConnection();
    const [result] = await connection.query(
      `INSERT INTO s_curve_root (project_id, root_code, root_name, root_description, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, root_code, root_name, root_description || null, start_date || null, end_date || null, sort_order || 0]
    );
    const [newRoot] = await connection.query('SELECT * FROM s_curve_root WHERE root_id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้าง Root สำเร็จ', data: newRoot[0] });
  } catch (error) {
    console.error('Error creating root:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง Root', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    const { root_code, root_name, root_description, root_total_price, start_date, end_date, sort_order, status } = req.body;
    connection = await getConnection();
    const updateFields = [];
    const updateValues = [];
    if (root_code !== undefined) { updateFields.push('root_code = ?'); updateValues.push(root_code); }
    if (root_name !== undefined) { updateFields.push('root_name = ?'); updateValues.push(root_name); }
    if (root_description !== undefined) { updateFields.push('root_description = ?'); updateValues.push(root_description); }
    if (root_total_price !== undefined) { updateFields.push('root_total_price = ?'); updateValues.push(root_total_price); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
    if (sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(sort_order); }
    if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
    updateFields.push('updated_at = NOW()');
    updateValues.push(rootId);
    const [result] = await connection.query(`UPDATE s_curve_root SET ${updateFields.join(', ')} WHERE root_id = ?`, updateValues);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบ Root ที่ต้องการอัปเดต' });
    const [updated] = await connection.query('SELECT * FROM s_curve_root WHERE root_id = ?', [rootId]);
    res.json({ success: true, message: 'อัปเดต Root สำเร็จ', data: updated[0] });
  } catch (error) {
    console.error('Error updating root:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดต Root', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    connection = await getConnection();
    const [result] = await connection.query('UPDATE s_curve_root SET is_active = 0, updated_at = NOW() WHERE root_id = ?', [rootId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบ Root ที่ต้องการลบ' });
    res.json({ success: true, message: 'ลบ Root สำเร็จ' });
  } catch (error) {
    console.error('Error deleting root:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบ Root', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// CATEGORY LEVEL
// =============================================

exports.getCategoriesByRoot = async (req, res) => {
  let connection;
  try {
    const { rootId } = req.params;
    connection = await getConnection();
    const [categories] = await connection.query(`SELECT * FROM s_curve_category WHERE root_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC`, [rootId]);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Category', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.createCategory = async (req, res) => {
  let connection;
  try {
    const { root_id, category_code, category_name, category_description, start_date, end_date, sort_order } = req.body;
    if (!root_id || !category_code || !category_name) return res.status(400).json({ success: false, message: 'กรุณาระบุ root_id, category_code และ category_name' });
    connection = await getConnection();
    const [result] = await connection.query(
      `INSERT INTO s_curve_category (root_id, category_code, category_name, category_description, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [root_id, category_code, category_name, category_description || null, start_date || null, end_date || null, sort_order || 0]
    );
    const [newCategory] = await connection.query('SELECT * FROM s_curve_category WHERE category_id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้าง Category สำเร็จ', data: newCategory[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง Category', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    const { category_code, category_name, category_description, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();
    const updateFields = [];
    const updateValues = [];
    if (category_code !== undefined) { updateFields.push('category_code = ?'); updateValues.push(category_code); }
    if (category_name !== undefined) { updateFields.push('category_name = ?'); updateValues.push(category_name); }
    if (category_description !== undefined) { updateFields.push('category_description = ?'); updateValues.push(category_description); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
    if (sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(sort_order); }
    updateFields.push('updated_at = NOW()');
    updateValues.push(categoryId);
    const [result] = await connection.query(`UPDATE s_curve_category SET ${updateFields.join(', ')} WHERE category_id = ?`, updateValues);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบ Category ที่ต้องการอัปเดต' });
    const [updated] = await connection.query('SELECT * FROM s_curve_category WHERE category_id = ?', [categoryId]);
    res.json({ success: true, message: 'อัปเดต Category สำเร็จ', data: updated[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดต Category', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    connection = await getConnection();
    const [result] = await connection.query('UPDATE s_curve_category SET is_active = 0, updated_at = NOW() WHERE category_id = ?', [categoryId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบ Category ที่ต้องการลบ' });
    res.json({ success: true, message: 'ลบ Category สำเร็จ' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบ Category', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TYPE LEVEL
// =============================================

exports.getTypesByCategory = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [types] = await connection.query(`SELECT * FROM s_curve_type WHERE category_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [req.params.categoryId]);
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.createType = async (req, res) => {
  let connection;
  try {
    const { category_id, type_code, type_name, type_description, type_price, start_date, end_date, sort_order } = req.body;
    if (!category_id || !type_code || !type_name) return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบ' });
    connection = await getConnection();
    const [result] = await connection.query(
      `INSERT INTO s_curve_type (category_id, type_code, type_name, type_description, type_price, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, type_code, type_name, type_description || null, type_price || 0, start_date || null, end_date || null, sort_order || 0]
    );
    const [newType] = await connection.query('SELECT * FROM s_curve_type WHERE type_id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้างสำเร็จ', data: newType[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;
    const { type_code, type_name, type_description, type_price, start_date, end_date, sort_order } = req.body;
    connection = await getConnection();
    const fields = [], values = [];
    if (type_code !== undefined) { fields.push('type_code = ?'); values.push(type_code); }
    if (type_name !== undefined) { fields.push('type_name = ?'); values.push(type_name); }
    if (type_description !== undefined) { fields.push('type_description = ?'); values.push(type_description); }
    if (type_price !== undefined) { fields.push('type_price = ?'); values.push(type_price); }
    if (start_date !== undefined) { fields.push('start_date = ?'); values.push(start_date); }
    if (end_date !== undefined) { fields.push('end_date = ?'); values.push(end_date); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    fields.push('updated_at = NOW()');
    values.push(typeId);
    await connection.query(`UPDATE s_curve_type SET ${fields.join(', ')} WHERE type_id = ?`, values);
    const [updated] = await connection.query('SELECT * FROM s_curve_type WHERE type_id = ?', [typeId]);
    res.json({ success: true, message: 'อัปเดตสำเร็จ', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteType = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.query('UPDATE s_curve_type SET is_active = 0 WHERE type_id = ?', [req.params.typeId]);
    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  } finally {
    if (connection) connection.release();
  }
};

// SUBTYPE LEVEL
exports.getSubtypesByType = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [subtypes] = await connection.query(`SELECT * FROM s_curve_subtype WHERE type_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [req.params.typeId]);
    res.json({ success: true, data: subtypes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.createSubtype = async (req, res) => {
  let connection;
  try {
    const { type_id, subtype_code, subtype_name, subtype_description, quantity, unit, unit_price, start_date, end_date, progress, sort_order } = req.body;
    if (!type_id || !subtype_code || !subtype_name) return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบ' });
    const total_price = (quantity || 0) * (unit_price || 0);
    connection = await getConnection();
    const [result] = await connection.query(
      `INSERT INTO s_curve_subtype (type_id, subtype_code, subtype_name, subtype_description, quantity, unit, unit_price, total_price, start_date, end_date, progress, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type_id, subtype_code, subtype_name, subtype_description || null, quantity || 0, unit || '', unit_price || 0, total_price, start_date || null, end_date || null, progress || 0, sort_order || 0]
    );
    const [newSubtype] = await connection.query('SELECT * FROM s_curve_subtype WHERE subtype_id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้าง Subtype สำเร็จ', data: newSubtype[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateSubtype = async (req, res) => {
  let connection;
  try {
    const { subtypeId } = req.params;
    const { subtype_code, subtype_name, subtype_description, quantity, unit, unit_price, start_date, end_date, progress, sort_order } = req.body;
    connection = await getConnection();
    const fields = [], values = [];
    if (subtype_code !== undefined) { fields.push('subtype_code = ?'); values.push(subtype_code); }
    if (subtype_name !== undefined) { fields.push('subtype_name = ?'); values.push(subtype_name); }
    if (subtype_description !== undefined) { fields.push('subtype_description = ?'); values.push(subtype_description); }
    if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity || 0); }
    if (unit !== undefined) { fields.push('unit = ?'); values.push(unit || ''); }
    if (unit_price !== undefined) { fields.push('unit_price = ?'); values.push(unit_price || 0); }
    if (quantity !== undefined || unit_price !== undefined) { fields.push('total_price = ?'); values.push((quantity || 0) * (unit_price || 0)); }
    if (start_date !== undefined) { fields.push('start_date = ?'); values.push(start_date); }
    if (end_date !== undefined) { fields.push('end_date = ?'); values.push(end_date); }
    if (progress !== undefined) { fields.push('progress = ?'); values.push(progress); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    fields.push('updated_at = NOW()');
    values.push(subtypeId);
    await connection.query(`UPDATE s_curve_subtype SET ${fields.join(', ')} WHERE subtype_id = ?`, values);
    const [updated] = await connection.query('SELECT * FROM s_curve_subtype WHERE subtype_id = ?', [subtypeId]);
    res.json({ success: true, message: 'อัปเดตสำเร็จ', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteSubtype = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.query('UPDATE s_curve_subtype SET is_active = 0 WHERE subtype_id = ?', [req.params.subtypeId]);
    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  } finally {
    if (connection) connection.release();
  }
};

// SUB-SUBTYPE LEVEL - ปิดการใช้งาน
exports.getSubsubtypesBySubtype = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.createSubsubtype = async (req, res) => {
  res.status(400).json({ success: false, message: 'ฟีเจอร์นี้ยังไม่เปิดใช้งาน' });
};

exports.updateSubsubtype = async (req, res) => {
  res.status(400).json({ success: false, message: 'ฟีเจอร์นี้ยังไม่เปิดใช้งาน' });
};

exports.deleteSubsubtype = async (req, res) => {
  res.status(400).json({ success: false, message: 'ฟีเจอร์นี้ยังไม่เปิดใช้งาน' });
};

// =============================================
// TREE VIEW
// =============================================

exports.getFullTree = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();
    const [roots] = await connection.query(`SELECT * FROM s_curve_root WHERE project_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [projectId]);

    for (let root of roots) {
      const [categories] = await connection.query(`SELECT * FROM s_curve_category WHERE root_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [root.root_id]);

      for (let category of categories) {
        const [types] = await connection.query(`SELECT * FROM s_curve_type WHERE category_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [category.category_id]);

        for (let type of types) {
          const [subtypes] = await connection.query(`SELECT * FROM s_curve_subtype WHERE type_id = ? AND is_active = 1 ORDER BY sort_order ASC`, [type.type_id]);

          for (let subtype of subtypes) {
            subtype.subsubtypes = [];
          }
          type.subtypes = subtypes;
        }
        category.types = types;
      }
      root.categories = categories;
    }

    res.json({ success: true, data: roots });
  } catch (error) {
    console.error('Error in getFullTree:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// ดึงข้อมูล Tree พร้อม Actual
exports.getFullTreeWithActual = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;

    connection = await getConnection();

    // 1. ดึงข้อมูล Root
    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root WHERE project_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
      [projectId]
    );

    if (roots.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2. ดึง Actual ทั้งหมด
    const [actuals] = await connection.query(
      `SELECT * FROM s_curve_actual WHERE project_id = ?`,
      [projectId]
    );

    // 3. สร้าง Map
    const actualMap = new Map();
    actuals.forEach(a => {
      const key = `${a.root_id || 'null'}-${a.category_id || 'null'}-${a.type_id || 'null'}-${a.subtype_id || 'null'}`;
      actualMap.set(key, a);
    });

    // ฟังก์ชันช่วย
    const getActual = (root_id, category_id, type_id, subtype_id) => {
      const key = `${root_id || 'null'}-${category_id || 'null'}-${type_id || 'null'}-${subtype_id || 'null'}`;
      const actual = actualMap.get(key);
      return {
        actual_progress: actual?.actual_progress || null,
        actual_start_date: actual?.actual_start_date || null,
        actual_end_date: actual?.actual_end_date || null
      };
    };

    // 4. Loop ผ่าน hierarchy
    for (let root of roots) {

      const rootActual = getActual(root.root_id, null, null, null);
      Object.assign(root, rootActual);

      const [categories] = await connection.query(
        `SELECT * FROM s_curve_category WHERE root_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
        [root.root_id]
      );

      for (let category of categories) {
        const catActual = getActual(root.root_id, category.category_id, null, null);
        Object.assign(category, catActual);

        const [types] = await connection.query(
          `SELECT * FROM s_curve_type WHERE category_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
          [category.category_id]
        );

        for (let type of types) {
          const typeActual = getActual(root.root_id, category.category_id, type.type_id, null);
          Object.assign(type, typeActual);

          const [subtypes] = await connection.query(
            `SELECT * FROM s_curve_subtype WHERE type_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
            [type.type_id]
          );

          for (let subtype of subtypes) {
            const subActual = getActual(root.root_id, category.category_id, type.type_id, subtype.subtype_id);
            Object.assign(subtype, subActual);
            subtype.subsubtypes = [];
          }

          type.subtypes = subtypes;
        }
        category.types = types;
      }
      root.categories = categories;
    }

    res.json({ success: true, data: roots });

  } catch (error) {
    console.error('❌ Error in getFullTreeWithActual:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// ACTUAL PROGRESS
// =============================================

exports.updateActualProgress = async (req, res) => {
  let connection;
  try {
    let { project_id, root_id, category_id, type_id, subtype_id, actual_progress, actual_start_date, actual_end_date, remarks, update_date } = req.body;
    const user_id = req.user?.user_id || null;

    if (!project_id || actual_progress === undefined) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูล' });
    }

    if (actual_progress < 0 || actual_progress > 100) {
      return res.status(400).json({ success: false, message: 'ค่าต้องอยู่ระหว่าง 0-100' });
    }

    connection = await getConnection();

    // ถ้ามี type_id หรือ subtype_id แต่ไม่มี root_id/category_id ให้หาให้
    if ((type_id || subtype_id) && (!root_id || !category_id)) {
      if (subtype_id) {
        // หา type_id, category_id, root_id จาก subtype_id
        const [subtypeData] = await connection.query(`
          SELECT st.type_id, t.category_id, c.root_id
          FROM s_curve_subtype st
          JOIN s_curve_type t ON st.type_id = t.type_id
          JOIN s_curve_category c ON t.category_id = c.category_id
          WHERE st.subtype_id = ?
        `, [subtype_id]);

        if (subtypeData.length > 0) {
          type_id = subtypeData[0].type_id;
          category_id = subtypeData[0].category_id;
          root_id = subtypeData[0].root_id;
        }
      } else if (type_id) {
        // หา category_id, root_id จาก type_id
        const [typeData] = await connection.query(`
          SELECT t.category_id, c.root_id
          FROM s_curve_type t
          JOIN s_curve_category c ON t.category_id = c.category_id
          WHERE t.type_id = ?
        `, [type_id]);

        if (typeData.length > 0) {
          category_id = typeData[0].category_id;
          root_id = typeData[0].root_id;
        }
      }
    } else if (category_id && !root_id) {
      // หา root_id จาก category_id
      const [categoryData] = await connection.query(
        'SELECT root_id FROM s_curve_category WHERE category_id = ?',
        [category_id]
      );

      if (categoryData.length > 0) {
        root_id = categoryData[0].root_id;
      }
    }

    await connection.beginTransaction();

    try {
      let whereClause = 'project_id = ?';
      let whereParams = [project_id];

      ['root_id', 'category_id', 'type_id', 'subtype_id'].forEach(field => {
        const value = eval(field);
        if (value) {
          whereClause += ` AND ${field} = ?`;
          whereParams.push(value);
        } else {
          whereClause += ` AND ${field} IS NULL`;
        }
      });

      whereClause += ` AND subsubtype_id IS NULL`;

      const [existing] = await connection.query(
        `SELECT * FROM s_curve_actual WHERE ${whereClause} LIMIT 1`,
        whereParams
      );

      let actualId, oldProgress = null;

      if (existing.length > 0) {
        actualId = existing[0].actual_id;
        oldProgress = existing[0].actual_progress;

        await connection.query(
          `UPDATE s_curve_actual 
           SET actual_progress = ?, actual_start_date = COALESCE(?, actual_start_date), 
               actual_end_date = ?, updated_by = ?, remarks = ?, updated_at = NOW() 
           WHERE actual_id = ?`,
          [actual_progress, actual_start_date || null,
            actual_progress >= 100 ? (actual_end_date || new Date()) : null,
            user_id, remarks || null, actualId]
        );
      } else {
        const [result] = await connection.query(
          `INSERT INTO s_curve_actual 
           (project_id, root_id, category_id, type_id, subtype_id, subsubtype_id, 
            actual_progress, actual_start_date, actual_end_date, updated_by, remarks) 
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
          [project_id, root_id || null, category_id || null, type_id || null,
            subtype_id || null, actual_progress, actual_start_date || new Date(),
            actual_progress >= 100 ? (actual_end_date || new Date()) : null,
            user_id, remarks || null]
        );
        actualId = result.insertId;
      }

      // 🔥 สำคัญ: บันทึก history พร้อม update_date

      const [historyResult] = await connection.query(
        `INSERT INTO s_curve_actual_history 
         (actual_id, old_progress, new_progress, updated_by, update_date, remarks) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          actualId,
          oldProgress,
          actual_progress,
          user_id,
          update_date || null,
          remarks || null
        ]
      );

      const historyId = historyResult.insertId;

      // 🔥 บันทึกรูปภาพแกลเลอรี (ถ้ามี)
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const relativePath = `/Uploads/actual/${file.filename}`;
          await connection.query(
            `INSERT INTO s_curve_actual_history_photos (history_id, photo_path) VALUES (?, ?)`,
            [historyId, relativePath]
          );
        }
      } else if (req.file) {
        // กรณีมาไฟล์เดียว (เผื่อไว้)
        const relativePath = `/Uploads/actual/${req.file.filename}`;
        await connection.query(
          `INSERT INTO s_curve_actual_history_photos (history_id, photo_path) VALUES (?, ?)`,
          [historyId, relativePath]
        );
      }

      await connection.commit();

      const [updated] = await connection.query('SELECT * FROM s_curve_actual WHERE actual_id = ?', [actualId]);
      res.json({ success: true, message: 'บันทึกสำเร็จ', data: updated[0] });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating progress:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
// แก้ไข function getActualHistory ใน actualController.js

// ใน actualController.js
// แทนที่ function getActualHistory เดิมทั้งหมดด้วยโค้ดนี้

exports.getActualHistory = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const { root_id, category_id, type_id, subtype_id, subsubtype_id, limit = 50 } = req.query;
    connection = await getConnection();

    // 🔥 สำคัญ: ระบุ column ชัดเจนว่าเอาจาก table ไหน
    // ไม่ใช้ h.*, a.* เพราะจะทำให้ column ซ้ำกัน
    let query = `
      SELECT 
        h.history_id,
        h.actual_id,
        h.old_progress,
        h.new_progress,
        h.updated_by,
        h.update_date,
        h.remarks AS remarks,
        a.project_id,
        a.root_id,
        a.category_id,
        a.type_id,
        a.subtype_id,
        a.subsubtype_id
      FROM s_curve_actual_history h 
      JOIN s_curve_actual a ON h.actual_id = a.actual_id 
      WHERE a.project_id = ?`;

    const params = [projectId];

    // ✅ ใช้ลำดับความสำคัญของ ID ป้องกันข้อมูลซ้ำซ้อนจากรายการย่อย (Child items leaking to parents)
    if (subsubtype_id) {
      query += ' AND a.subsubtype_id = ?';
      params.push(subsubtype_id);
    } else if (subtype_id) {
      query += ' AND a.subtype_id = ? AND a.subsubtype_id IS NULL';
      params.push(subtype_id);
    } else if (type_id) {
      query += ' AND a.type_id = ? AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
      params.push(type_id);
    } else if (category_id) {
      query += ' AND a.category_id = ? AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
      params.push(category_id);
    } else if (root_id) {
      query += ' AND a.root_id = ? AND a.category_id IS NULL AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
      params.push(root_id);
    }

    query += ' ORDER BY h.history_id DESC LIMIT ?';
    params.push(parseInt(limit));

    const [history] = await connection.query(query, params);

    // 🔥 ดึงรูปภาพสำหรับแต่ละประวัติ
    for (let h of history) {
      const [photos] = await connection.query(
        'SELECT photo_path FROM s_curve_actual_history_photos WHERE history_id = ?',
        [h.history_id]
      );
      h.photos = photos.map(p => p.photo_path);
    }

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};
exports.getActualProgress = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const { root_id, category_id, type_id, subtype_id, subsubtype_id } = req.query;
    connection = await getConnection();

    let whereClause = 'project_id = ?';
    let whereParams = [projectId];

    ['root_id', 'category_id', 'type_id', 'subtype_id', 'subsubtype_id'].forEach(field => {
      const value = eval(field);
      if (value) {
        whereClause += ` AND ${field} = ?`;
        whereParams.push(value);
      } else {
        whereClause += ` AND ${field} IS NULL`;
      }
    });

    const [result] = await connection.query(
      `SELECT * FROM s_curve_actual WHERE ${whereClause}`,
      whereParams
    );

    res.json({ success: true, data: result[0] || null });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteActualProgress = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [result] = await connection.query('DELETE FROM s_curve_actual WHERE actual_id = ?', [req.params.actualId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }
    res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.bulkUpdateProgress = async (req, res) => {
  let connection;
  try {
    const { updates, project_id } = req.body;
    const user_id = req.user?.user_id || null;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูล' });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    try {
      const results = [];

      for (const update of updates) {
        const { root_id, category_id, type_id, subtype_id, actual_progress, remarks } = update;

        let whereClause = 'project_id = ?';
        let whereParams = [project_id];

        ['root_id', 'category_id', 'type_id', 'subtype_id'].forEach(field => {
          const value = eval(field);
          if (value) {
            whereClause += ` AND ${field} = ?`;
            whereParams.push(value);
          } else {
            whereClause += ` AND ${field} IS NULL`;
          }
        });

        whereClause += ` AND subsubtype_id IS NULL`;

        const [existing] = await connection.query(
          `SELECT * FROM s_curve_actual WHERE ${whereClause} LIMIT 1`,
          whereParams
        );

        let actualId, oldProgress = null;

        if (existing.length > 0) {
          actualId = existing[0].actual_id;
          oldProgress = existing[0].actual_progress;

          await connection.query(
            `UPDATE s_curve_actual 
             SET actual_progress = ?, updated_by = ?, remarks = ?, updated_at = NOW() 
             WHERE actual_id = ?`,
            [actual_progress, user_id, remarks || null, actualId]
          );
        } else {
          const [result] = await connection.query(
            `INSERT INTO s_curve_actual 
             (project_id, root_id, category_id, type_id, subtype_id, subsubtype_id, 
              actual_progress, updated_by, remarks) 
             VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
            [project_id, root_id || null, category_id || null, type_id || null,
              subtype_id || null, actual_progress, user_id, remarks || null]
          );
          actualId = result.insertId;
        }

        await connection.query(
          `INSERT INTO s_curve_actual_history (actual_id, old_progress, new_progress, updated_by, remarks) 
           VALUES (?, ?, ?, ?, ?)`,
          [actualId, oldProgress, actual_progress, user_id, remarks || null]
        );

        results.push({ actualId, actual_progress });
      }

      await connection.commit();
      res.json({ success: true, message: `อัปเดตสำเร็จ ${updates.length} รายการ`, data: results });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error bulk updating:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// STATISTICS & REPORTS
// =============================================

exports.getProjectStatistics = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [stats] = await connection.query(`
      SELECT COUNT(*) as total_items,
        SUM(CASE WHEN actual_progress >= 100 THEN 1 ELSE 0 END) as completed_items,
        SUM(CASE WHEN actual_progress > 0 AND actual_progress < 100 THEN 1 ELSE 0 END) as in_progress_items,
        SUM(CASE WHEN actual_progress = 0 OR actual_progress IS NULL THEN 1 ELSE 0 END) as pending_items,
        COALESCE(AVG(actual_progress), 0) as average_progress
      FROM s_curve_actual WHERE project_id = ?
    `, [req.params.projectId]);

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getPlanVsActualComparison = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    const [comparison] = await connection.query(`
      SELECT 'root' as level, r.root_id as id, r.root_code as code, r.root_name as name, 
             r.start_date as plan_start, r.end_date as plan_end, 
             a.actual_start_date, a.actual_end_date, a.actual_progress,
             CASE 
               WHEN a.actual_progress >= 100 THEN 'completed' 
               WHEN CURDATE() > r.end_date AND a.actual_progress < 100 THEN 'overdue' 
               WHEN a.actual_progress > 0 THEN 'in_progress' 
               ELSE 'pending' 
             END as status
      FROM s_curve_root r 
      LEFT JOIN s_curve_actual a ON r.root_id = a.root_id 
        AND a.category_id IS NULL AND a.type_id IS NULL 
        AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL 
        AND a.project_id = ?
      WHERE r.project_id = ? AND r.is_active = 1
      ORDER BY level, code
    `, [projectId, projectId]);

    res.json({ success: true, data: comparison });
  } catch (error) {
    console.error('Error getting comparison:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getOverdueItems = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    const [overdue] = await connection.query(`
      SELECT 'root' as level, r.root_id as id, r.root_code as code, r.root_name as name, 
             r.end_date as plan_end, a.actual_progress, 
             DATEDIFF(CURDATE(), r.end_date) as days_overdue
      FROM s_curve_root r 
      LEFT JOIN s_curve_actual a ON r.root_id = a.root_id 
        AND a.category_id IS NULL AND a.type_id IS NULL 
        AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL 
        AND a.project_id = ?
      WHERE r.project_id = ? AND r.is_active = 1 
        AND CURDATE() > r.end_date 
        AND (a.actual_progress < 100 OR a.actual_progress IS NULL)
      ORDER BY days_overdue DESC
    `, [projectId, projectId]);

    res.json({
      success: true,
      data: overdue,
      summary: {
        total_overdue: overdue.length,
        by_level: {
          root: overdue.filter(i => i.level === 'root').length,
          category: overdue.filter(i => i.level === 'category').length,
          type: overdue.filter(i => i.level === 'type').length,
          subtype: overdue.filter(i => i.level === 'subtype').length
        }
      }
    });
  } catch (error) {
    console.error('Error getting overdue:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// ลบประวัติการอัปเดตเดียว
exports.deleteActualHistory = async (req, res) => {
  let connection;
  try {
    const { historyId } = req.params;

    console.log('🗑️ ========================================');
    console.log('🗑️ DELETE request for history_id:', historyId);

    connection = await getConnection();
    await connection.beginTransaction();

    try {
      // 🔍 ดึงข้อมูลประวัติที่จะลบ
      const [historyData] = await connection.query(
        'SELECT * FROM s_curve_actual_history WHERE history_id = ?',
        [historyId]
      );

      if (historyData.length === 0) {
        await connection.rollback();
        console.log('❌ History not found:', historyId);
        return res.status(404).json({
          success: false,
          message: 'ไม่พบประวัติที่ต้องการลบ'
        });
      }

      const deletedHistory = historyData[0];
      console.log('📝 Found history to delete:', {
        history_id: deletedHistory.history_id,
        actual_id: deletedHistory.actual_id,
        old_progress: deletedHistory.old_progress,
        new_progress: deletedHistory.new_progress
      });

      // 🔍 ดึงประวัติทั้งหมดก่อนลบ - เรียงตาม history_id
      const [allHistoriesBeforeDelete] = await connection.query(
        `SELECT * FROM s_curve_actual_history 
         WHERE actual_id = ? 
         ORDER BY history_id ASC`,
        [deletedHistory.actual_id]
      );

      console.log('📜 Total histories BEFORE delete:', allHistoriesBeforeDelete.length);
      allHistoriesBeforeDelete.forEach((h, i) => {
        console.log(`   [${i}] history_id: ${h.history_id}, ${h.old_progress}→${h.new_progress}`);
      });

      // 🗑️ ลบประวัติที่เลือก
      const [deleteResult] = await connection.query(
        'DELETE FROM s_curve_actual_history WHERE history_id = ?',
        [historyId]
      );

      console.log('✅ Deleted rows:', deleteResult.affectedRows);

      // 🔍 ดึงประวัติที่เหลือหลังลบ
      const [remainingHistories] = await connection.query(
        `SELECT * FROM s_curve_actual_history 
         WHERE actual_id = ? 
         ORDER BY history_id ASC`,
        [deletedHistory.actual_id]
      );

      console.log('📜 Remaining histories AFTER delete:', remainingHistories.length);

      // ✅ คำนวณ % ใหม่ - ทุกกรณีต้องคำนวณใหม่หมด
      if (remainingHistories.length > 0) {
        console.log('🔄 Recalculating ALL remaining histories...');

        let cumulativeProgress = 0;

        // วนลูปคำนวณใหม่ทั้งหมด
        for (let i = 0; i < remainingHistories.length; i++) {
          const h = remainingHistories[i];
          // คำนวณการเปลี่ยนแปลงจากข้อมูลเดิม
          const originalChange = (h.new_progress || 0) - (h.old_progress || 0);

          if (i === 0) {
            // ประวัติแรก: เริ่มจาก 0
            cumulativeProgress = originalChange;

            console.log(`   [${i}] history_id: ${h.history_id}`);
            console.log(`       Original: ${h.old_progress}→${h.new_progress} (change: ${originalChange})`);
            console.log(`       New: 0→${cumulativeProgress}`);

            await connection.query(
              'UPDATE s_curve_actual_history SET old_progress = ?, new_progress = ? WHERE history_id = ?',
              [0, cumulativeProgress, h.history_id]
            );

          } else {
            // ประวัติถัดไป: บวกสะสมจากก่อนหน้า
            const newOldProgress = cumulativeProgress;
            cumulativeProgress = cumulativeProgress + originalChange;

            console.log(`   [${i}] history_id: ${h.history_id}`);
            console.log(`       Original: ${h.old_progress}→${h.new_progress} (change: ${originalChange})`);
            console.log(`       New: ${newOldProgress}→${cumulativeProgress}`);

            await connection.query(
              'UPDATE s_curve_actual_history SET old_progress = ?, new_progress = ? WHERE history_id = ?',
              [newOldProgress, cumulativeProgress, h.history_id]
            );
          }
        }

        const finalProgress = cumulativeProgress;
        console.log('✅ Final cumulative progress:', finalProgress);

        // อัปเดต actual_progress
        await connection.query(
          'UPDATE s_curve_actual SET actual_progress = ?, updated_at = NOW() WHERE actual_id = ?',
          [finalProgress, deletedHistory.actual_id]
        );

        console.log('✅ Updated s_curve_actual.actual_progress to:', finalProgress);
        console.log('🗑️ ========================================');

        await connection.commit();

        res.json({
          success: true,
          message: 'ลบประวัติสำเร็จ',
          data: {
            deleted_history_id: parseInt(historyId),
            actual_id: deletedHistory.actual_id,
            current_progress: finalProgress,
            histories_remaining: remainingHistories.length
          }
        });

      } else {
        // ❌ ไม่มีประวัติเหลือเลย ลบ actual ทั้งหมด
        console.log('⚠️ No history left, deleting actual record');

        await connection.query(
          'DELETE FROM s_curve_actual WHERE actual_id = ?',
          [deletedHistory.actual_id]
        );

        console.log('🗑️ ========================================');

        await connection.commit();

        res.json({
          success: true,
          message: 'ลบประวัติสำเร็จ (ลบข้อมูล actual ทั้งหมด)',
          data: {
            deleted_history_id: parseInt(historyId),
            actual_id: deletedHistory.actual_id,
            current_progress: null,
            histories_remaining: 0
          }
        });
      }

    } catch (transactionError) {
      await connection.rollback();
      console.error('❌ Transaction error:', transactionError);
      console.error('Error message:', transactionError.message);
      console.error('Error stack:', transactionError.stack);
      throw transactionError;
    }
  } catch (error) {
    console.error('❌ Outer error deleting history:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบประวัติ',
      error: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('🔓 Connection released');
    }
  }
};
// ลบประวัติทั้งหมดของ item เดียว (แก้ไข: ใช้ smart WHERE clause)
exports.deleteAllHistoryByItem = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    let { root_id, category_id, type_id, subtype_id, subsubtype_id } = req.query;

    console.log('🗑️ Delete all history request:', { projectId, root_id, category_id, type_id, subtype_id, subsubtype_id });

    // Validation
    if (!root_id && !category_id && !type_id && !subtype_id && !subsubtype_id) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรายการที่ต้องการลบประวัติ (ต้องมีอย่างน้อย 1 ID)'
      });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    try {
      // ✅ สร้าง WHERE clause แบบ smart - ใช้ระดับที่เจาะจงที่สุดที่ส่งมา
      // ไม่บังคับ root_id/category_id เพื่อป้องกัน 404 เมื่อไม่มีในฐานข้อมูล
      let whereClause = 'a.project_id = ?';
      let whereParams = [projectId];

      if (subsubtype_id) {
        // ระดับ subsubtype
        whereClause += ' AND a.subsubtype_id = ?';
        whereParams.push(subsubtype_id);
      } else if (subtype_id) {
        // ระดับ subtype
        whereClause += ' AND a.subtype_id = ? AND a.subsubtype_id IS NULL';
        whereParams.push(subtype_id);
      } else if (type_id) {
        // ระดับ type
        whereClause += ' AND a.type_id = ? AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(type_id);
      } else if (category_id) {
        // ระดับ category
        whereClause += ' AND a.category_id = ? AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(category_id);
      } else if (root_id) {
        // ระดับ root
        whereClause += ' AND a.root_id = ? AND a.category_id IS NULL AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(root_id);
      }

      console.log('🔍 Final WHERE clause:', whereClause);
      console.log('📦 Final Params:', whereParams);

      // ✅ หา actual_id
      const [actualData] = await connection.query(
        `SELECT actual_id FROM s_curve_actual a WHERE ${whereClause}`,
        whereParams
      );

      if (actualData.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูล Actual ที่ตรงกับเงื่อนไข (ข้อมูลอาจถูกลบไปแล้ว)'
        });
      }

      const actualId = actualData[0].actual_id;
      console.log('✅ Found actual_id:', actualId);

      // ✅ ลบรูปภาพใน history ก่อน (ถ้ามี)
      const [historyRows] = await connection.query(
        'SELECT history_id FROM s_curve_actual_history WHERE actual_id = ?',
        [actualId]
      );

      if (historyRows.length > 0) {
        const ids = historyRows.map(h => h.history_id);
        const placeholders = ids.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM s_curve_actual_history_photos WHERE history_id IN (${placeholders})`,
          ids
        );
        console.log('🗑️ Deleted photos for', ids.length, 'history records');
      }

      // ✅ ลบประวัติทั้งหมด
      const [deleteResult] = await connection.query(
        'DELETE FROM s_curve_actual_history WHERE actual_id = ?',
        [actualId]
      );

      console.log('🗑️ Deleted', deleteResult.affectedRows, 'history records');

      // ✅ ลบ Actual Progress
      await connection.query(
        'DELETE FROM s_curve_actual WHERE actual_id = ?',
        [actualId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'ลบประวัติทั้งหมดสำเร็จ',
        data: {
          deleted_count: deleteResult.affectedRows,
          actual_id: actualId
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error deleting all history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบประวัติทั้งหมด',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};