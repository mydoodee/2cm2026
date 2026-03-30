const { getConnection } = require('../config/db');

/**
 * Get all folder templates
 */
const getTemplates = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [templates] = await connection.execute(
      'SELECT t.*, u.username as creator_name FROM folder_templates t LEFT JOIN users u ON t.created_by = u.user_id ORDER BY t.created_at DESC'
    );
    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Get Templates Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Template', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Get template items (folders)
 */
const getTemplateItems = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await getConnection();
    const [items] = await connection.execute(
      'SELECT * FROM folder_template_items WHERE template_id = ? ORDER BY folder_name ASC',
      [id]
    );
    res.json({ success: true, items });
  } catch (error) {
    console.error('❌ Get Template Items Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโฟลเดอร์ใน Template', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
  const { template_name, description } = req.body;
  const userId = req.user.user_id;
  let connection;

  try {
    if (!template_name) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ Template' });
    }

    connection = await getConnection();
    const [result] = await connection.execute(
      'INSERT INTO folder_templates (template_name, description, created_by) VALUES (?, ?, ?)',
      [template_name, description || null, userId]
    );

    res.json({ 
      success: true, 
      message: 'สร้าง Template สำเร็จ', 
      template_id: result.insertId 
    });
  } catch (error) {
    console.error('❌ Create Template Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง Template', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Update template info
 */
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { template_name, description } = req.body;
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      'UPDATE folder_templates SET template_name = ?, description = ? WHERE template_id = ?',
      [template_name, description, id]
    );
    res.json({ success: true, message: 'อัปเดต Template สำเร็จ' });
  } catch (error) {
    console.error('❌ Update Template Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดต Template', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Delete template
 */
const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await getConnection();
    // folder_template_items will be deleted via ON DELETE CASCADE
    await connection.execute('DELETE FROM folder_templates WHERE template_id = ?', [id]);
    res.json({ success: true, message: 'ลบ Template สำเร็จ' });
  } catch (error) {
    console.error('❌ Delete Template Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบ Template', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Add item to template
 */
const addTemplateItem = async (req, res) => {
  const { template_id, folder_name, parent_item_id } = req.body;
  let connection;

  try {
    if (!template_id || !folder_name) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    connection = await getConnection();
    const [result] = await connection.execute(
      'INSERT INTO folder_template_items (template_id, folder_name, parent_item_id) VALUES (?, ?, ?)',
      [template_id, folder_name, parent_item_id || null]
    );

    res.json({ 
      success: true, 
      message: 'เพิ่มโฟลเดอร์ใน Template สำเร็จ', 
      item_id: result.insertId 
    });
  } catch (error) {
    console.error('❌ Add Template Item Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มโฟลเดอร์', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Update template item
 */
const updateTemplateItem = async (req, res) => {
  const { id } = req.params;
  const { folder_name } = req.body;
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      'UPDATE folder_template_items SET folder_name = ? WHERE item_id = ?',
      [folder_name, id]
    );
    res.json({ success: true, message: 'แก้ไขชื่อโฟลเดอร์สำเร็จ' });
  } catch (error) {
    console.error('❌ Update Template Item Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขชื่อโฟลเดอร์', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Delete template item (recursive)
 */
const deleteTemplateItem = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await getConnection();
    
    // Recursive delete helper for template items
    const deleteRecursive = async (conn, itemId) => {
      const [children] = await conn.execute('SELECT item_id FROM folder_template_items WHERE parent_item_id = ?', [itemId]);
      for (const child of children) {
        await deleteRecursive(conn, child.item_id);
      }
      await conn.execute('DELETE FROM folder_template_items WHERE item_id = ?', [itemId]);
    };

    await connection.beginTransaction();
    await deleteRecursive(connection, id);
    await connection.commit();

    res.json({ success: true, message: 'ลบโฟลเดอร์ใน Template สำเร็จ' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Delete Template Item Error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบโฟลเดอร์', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

module.exports = {
  getTemplates,
  getTemplateItems,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem
};
