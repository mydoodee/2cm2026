// controllers/scurveController.js
const { getConnection } = require('../config/db');

// =====================================
// GET ROOT CATEGORIES
// =====================================
const getRootCategories = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;

    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT 
        root_id,
        project_id,
        root_code,
        root_name,
        root_description,
        root_total_price,
        start_date,
        end_date,
        sort_order,
        status,
        total_price,
        is_active,
        created_at,
        updated_at
      FROM s_curve_root
      WHERE project_id = ?
      ORDER BY sort_order ASC, root_code ASC`,
      [projectId]
    );

    res.json({
      success: true,
      data: roots
    });
  } catch (error) {
    console.error('Error fetching root categories:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดงานหลัก',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET CATEGORIES WITH TYPES (WITH ACTUAL PROGRESS)
// =====================================
const getCategoriesWithTypes = async (req, res) => {
  let connection;
  try {
    const { projectId, rootId } = req.params;

    connection = await getConnection();

    // Get categories
    const [categories] = await connection.query(
      `SELECT * FROM s_curve_category 
       WHERE root_id = ? AND is_active = 1
       ORDER BY sort_order ASC, category_code ASC`,
      [rootId]
    );

    // Get types for each category with actual progress
    for (let category of categories) {
      const [types] = await connection.query(
        `SELECT 
          t.*,
          COALESCE(a.actual_progress, 0) as actual_progress,
          a.actual_start_date,
          a.actual_end_date,
          a.updated_at as actual_updated_at
        FROM s_curve_type t
        LEFT JOIN s_curve_actual a ON t.type_id = a.type_id 
          AND a.project_id = ?
        WHERE t.category_id = ? AND t.is_active = 1
        ORDER BY t.sort_order ASC, t.type_code ASC`,
        [projectId, category.category_id]
      );
      category.types = types;
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories with types:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET ROOT DETAILS
// =====================================
const getRootDetails = async (req, res) => {
  let connection;
  try {
    const { projectId, rootId } = req.params;

    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root 
       WHERE root_id = ? AND project_id = ?`,
      [rootId, projectId]
    );

    if (roots.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดงานหลักที่ระบุ'
      });
    }

    const [categories] = await connection.query(
      `SELECT COUNT(*) as total FROM s_curve_category 
       WHERE root_id = ? AND is_active = 1`,
      [rootId]
    );

    const rootData = {
      ...roots[0],
      categories_count: categories[0].total
    };

    res.json({
      success: true,
      data: rootData
    });
  } catch (error) {
    console.error('Error fetching root details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดงานหลัก',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET CATEGORY DETAILS
// =====================================
const getCategoryDetails = async (req, res) => {
  let connection;
  try {
    const { projectId, categoryId } = req.params;

    connection = await getConnection();

    const [categories] = await connection.query(
      `SELECT c.*, r.project_id
       FROM s_curve_category c
       JOIN s_curve_root r ON c.root_id = r.root_id
       WHERE c.category_id = ? AND r.project_id = ?`,
      [categoryId, projectId]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดงานที่ระบุ'
      });
    }

    const [types] = await connection.query(
      `SELECT 
        t.*,
        COALESCE(a.actual_progress, 0) as actual_progress,
        a.actual_start_date,
        a.actual_end_date
      FROM s_curve_type t
      LEFT JOIN s_curve_actual a ON t.type_id = a.type_id 
        AND a.project_id = ?
      WHERE t.category_id = ? AND t.is_active = 1
      ORDER BY t.sort_order ASC, t.type_code ASC`,
      [projectId, categoryId]
    );

    const categoryData = {
      ...categories[0],
      types
    };

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Error fetching category details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET TYPE DETAILS
// =====================================
const getTypeDetails = async (req, res) => {
  let connection;
  try {
    const { projectId, typeId } = req.params;

    connection = await getConnection();

    const [types] = await connection.query(
      `SELECT t.*, c.root_id, r.project_id,
        COALESCE(a.actual_progress, 0) as actual_progress,
        a.actual_start_date,
        a.actual_end_date
       FROM s_curve_type t
       JOIN s_curve_category c ON t.category_id = c.category_id
       JOIN s_curve_root r ON c.root_id = r.root_id
       LEFT JOIN s_curve_actual a ON t.type_id = a.type_id 
         AND a.project_id = ?
       WHERE t.type_id = ? AND r.project_id = ?`,
      [projectId, typeId, projectId]
    );

    if (types.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบประเภทงานที่ระบุ'
      });
    }

    const [subtypes] = await connection.query(
      `SELECT * FROM s_curve_subtype 
       WHERE type_id = ? AND is_active = 1
       ORDER BY sort_order ASC, subtype_code ASC`,
      [typeId]
    );

    const typeData = {
      ...types[0],
      subtypes
    };

    res.json({
      success: true,
      data: typeData
    });
  } catch (error) {
    console.error('Error fetching type details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET COMPLETE S-CURVE DATA
// =====================================
const getCompleteSCurveData = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;

    connection = await getConnection();

    const [roots] = await connection.query(
      `SELECT * FROM s_curve_root 
       WHERE project_id = ? AND is_active = 1
       ORDER BY sort_order ASC, root_code ASC`,
      [projectId]
    );

    for (let root of roots) {
      const [categories] = await connection.query(
        `SELECT * FROM s_curve_category 
         WHERE root_id = ? AND is_active = 1
         ORDER BY sort_order ASC, category_code ASC`,
        [root.root_id]
      );

      for (let category of categories) {
        const [types] = await connection.query(
          `SELECT 
            t.*,
            COALESCE(a.actual_progress, 0) as actual_progress,
            a.actual_start_date,
            a.actual_end_date
          FROM s_curve_type t
          LEFT JOIN s_curve_actual a ON t.type_id = a.type_id 
            AND a.project_id = ?
          WHERE t.category_id = ? AND t.is_active = 1
          ORDER BY t.sort_order ASC, t.type_code ASC`,
          [projectId, category.category_id]
        );

        for (let type of types) {
          const [subtypes] = await connection.query(
            `SELECT * FROM s_curve_subtype 
             WHERE type_id = ? AND is_active = 1
             ORDER BY sort_order ASC, subtype_code ASC`,
            [type.type_id]
          );
          type.subtypes = subtypes;
        }

        category.types = types;
      }

      root.categories = categories;
    }

    res.json({
      success: true,
      data: roots
    });
  } catch (error) {
    console.error('Error fetching complete S-Curve data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล S-Curve',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// GET CHART DATA
// =====================================
const getChartData = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const { rootId } = req.query;

    connection = await getConnection();

    let query = `
      SELECT 
        r.root_id,
        r.root_code,
        r.root_name,
        r.start_date as root_start_date,
        r.end_date as root_end_date,
        c.category_id,
        c.category_code,
        c.category_name,
        c.start_date as category_start_date,
        c.end_date as category_end_date,
        t.type_id,
        t.type_code,
        t.type_name,
        t.type_price,
        COALESCE((
          SELECT SUM(s.total_price) 
          FROM s_curve_subtype s 
          WHERE s.type_id = t.type_id AND s.is_active = 1
        ), 0) as subtype_total_price,
        t.start_date as type_start_date,
        t.end_date as type_end_date,
        COALESCE(a.actual_progress, 0) as actual_progress,
        a.actual_start_date,
        a.actual_end_date
      FROM s_curve_root r
      LEFT JOIN s_curve_category c ON r.root_id = c.root_id AND c.is_active = 1
      LEFT JOIN s_curve_type t ON c.category_id = t.category_id AND t.is_active = 1
      LEFT JOIN s_curve_actual a ON t.type_id = a.type_id AND a.project_id = r.project_id
      WHERE r.project_id = ? AND r.is_active = 1
    `;

    const params = [projectId];

    if (rootId) {
      query += ' AND r.root_id = ?';
      params.push(rootId);
    }

    query += ' ORDER BY r.sort_order, c.sort_order, t.sort_order';

    const [results] = await connection.query(query, params);

    const chartData = {};

    results.forEach(row => {
      if (!chartData[row.root_id]) {
        chartData[row.root_id] = {
          root_id: row.root_id,
          root_code: row.root_code,
          root_name: row.root_name,
          start_date: row.root_start_date,
          end_date: row.root_end_date,
          categories: []
        };
      }

      if (row.category_id) {
        let category = chartData[row.root_id].categories.find(
          c => c.category_id === row.category_id
        );

        if (!category) {
          category = {
            category_id: row.category_id,
            category_code: row.category_code,
            category_name: row.category_name,
            start_date: row.category_start_date,
            end_date: row.category_end_date,
            types: []
          };
          chartData[row.root_id].categories.push(category);
        }

        if (row.type_id) {
          let type = category.types.find(t => t.type_id === row.type_id);

          if (!type) {
            // ✅ effective_price: ใช้ subtype รวม ถ้ามี, ไม่งั้นใช้ type_price
            const subtypeTotal = parseFloat(row.subtype_total_price) || 0;
            const typePrice = parseFloat(row.type_price) || 0;
            const effectivePrice = subtypeTotal > 0 ? subtypeTotal : typePrice;

            type = {
              type_id: row.type_id,
              type_code: row.type_code,
              type_name: row.type_name,
              type_price: effectivePrice,
              start_date: row.type_start_date,
              end_date: row.type_end_date,
              actual_progress: row.actual_progress,
              actual_start_date: row.actual_start_date,
              actual_end_date: row.actual_end_date,
              subtypes: []
            };
            category.types.push(type);
          }
        }
      }
    });

    // ✅ Fetch subtypes for each type and calculate weighted progress
    for (let root of Object.values(chartData)) {
      let rootWeight = 0;
      let rootWeightedProgress = 0;

      for (let category of root.categories) {
        let categoryWeight = 0;
        let categoryWeightedProgress = 0;

        for (let type of category.types) {
          const [subtypes] = await connection.query(
            `SELECT 
              st.subtype_id,
              st.subtype_code,
              st.subtype_name,
              st.total_price as subtype_price,
              st.start_date,
              st.end_date,
              COALESCE(a.actual_progress, 0) as actual_progress,
              a.actual_start_date,
              a.actual_end_date
            FROM s_curve_subtype st
            LEFT JOIN s_curve_actual a ON st.subtype_id = a.subtype_id AND a.project_id = ?
            WHERE st.type_id = ? AND st.is_active = 1
            ORDER BY st.sort_order ASC, st.subtype_code ASC`,
            [projectId, type.type_id]
          );
          type.subtypes = subtypes;

          // ✅ Calculate Type progress from Subtypes if available
          if (subtypes.length > 0) {
            let typeWeight = 0;
            let typeWeightedProgress = 0;
            subtypes.forEach(st => {
              const weight = parseFloat(st.subtype_price) || 0;
              // If price is 0, use 1 as neutral weight instead of ignoring
              const effectiveWeight = weight > 0 ? weight : 1;
              typeWeight += effectiveWeight;
              typeWeightedProgress += (parseFloat(st.actual_progress) || 0) * effectiveWeight;
            });
            if (typeWeight > 0) {
              type.actual_progress = typeWeightedProgress / typeWeight;
            }
          }

          // Accumulate for Category
          const tWeight = parseFloat(type.type_price) || 0;
          const effectiveTWeight = tWeight > 0 ? tWeight : 1;
          categoryWeight += effectiveTWeight;
          categoryWeightedProgress += (parseFloat(type.actual_progress) || 0) * effectiveTWeight;
        }

        // ✅ Calculate Category progress from Types
        if (categoryWeight > 0) {
          category.actual_progress = categoryWeightedProgress / categoryWeight;
        } else {
          category.actual_progress = 0;
        }

        // Accumulate for Root (use category weight or simple sum)
        rootWeight += categoryWeight;
        rootWeightedProgress += (category.actual_progress || 0) * categoryWeight;
      }

      // ✅ Calculate Root progress from Categories
      if (rootWeight > 0) {
        root.actual_progress = rootWeightedProgress / rootWeight;
      } else {
        root.actual_progress = 0;
      }
    }

    // Fetch historical progress for actual curve
    // We need to resolve the type_id even if the update was at Category, Root, or Subtype level
    const [history] = await connection.query(`
      SELECT 
        h.history_id,
        COALESCE(h.update_date, a.created_at) as record_date,
        h.old_progress,
        h.new_progress,
        h.remarks,
        COALESCE(st.subtype_id, 0) as subtype_id,
        COALESCE(a.type_id, 
                 st.type_id,
                 (SELECT type_id FROM s_curve_type WHERE category_id = a.category_id LIMIT 1)
        ) as type_id,
        (SELECT JSON_ARRAYAGG(photo_path) 
         FROM s_curve_actual_history_photos 
         WHERE history_id = h.history_id) as photos
      FROM s_curve_actual_history h
      JOIN s_curve_actual a ON h.actual_id = a.actual_id
      LEFT JOIN s_curve_subtype st ON a.subtype_id = st.subtype_id
      WHERE a.project_id = ?
      ORDER BY record_date ASC
    `, [projectId]);

    res.json({
      success: true,
      data: Object.values(chartData),
      history: history.map(h => ({
        ...h,
        photos: typeof h.photos === 'string' ? JSON.parse(h.photos) : (h.photos || [])
      }))
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกราฟ',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================
// CREATE/UPDATE FUNCTIONS (unchanged)
// =====================================
const createRoot = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const {
      root_code, root_name, root_description, root_total_price,
      start_date, end_date, sort_order, status, total_price
    } = req.body;

    connection = await getConnection();

    const [result] = await connection.query(
      `INSERT INTO s_curve_root 
       (project_id, root_code, root_name, root_description, root_total_price, 
        start_date, end_date, sort_order, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, root_code, root_name, root_description, root_total_price,
        start_date, end_date, sort_order, status, total_price]
    );

    res.status(201).json({
      success: true,
      message: 'สร้างหมวดงานหลักสำเร็จ',
      data: { root_id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating root:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างหมวดงานหลัก',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const updateRoot = async (req, res) => {
  let connection;
  try {
    const { projectId, rootId } = req.params;
    const updates = req.body;

    connection = await getConnection();

    const fields = Object.keys(updates).filter(key => key !== 'root_id' && key !== 'project_id');
    const values = fields.map(field => updates[field]);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการอัพเดท'
      });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await connection.query(
      `UPDATE s_curve_root SET ${setClause} 
       WHERE root_id = ? AND project_id = ?`,
      [...values, rootId, projectId]
    );

    res.json({
      success: true,
      message: 'อัพเดทหมวดงานหลักสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating root:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทหมวดงานหลัก',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const deleteRoot = async (req, res) => {
  let connection;
  try {
    const { projectId, rootId } = req.params;

    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_root SET is_active = 0 
       WHERE root_id = ? AND project_id = ?`,
      [rootId, projectId]
    );

    res.json({
      success: true,
      message: 'ลบหมวดงานหลักสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting root:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบหมวดงานหลัก',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const createCategory = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    const {
      root_id, category_code, category_name, category_description,
      start_date, end_date, sort_order
    } = req.body;

    connection = await getConnection();

    const [result] = await connection.query(
      `INSERT INTO s_curve_category 
       (root_id, category_code, category_name, category_description, 
        start_date, end_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [root_id, category_code, category_name, category_description,
        start_date, end_date, sort_order]
    );

    res.status(201).json({
      success: true,
      message: 'สร้างหมวดงานสำเร็จ',
      data: { category_id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างหมวดงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const updateCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    connection = await getConnection();

    const fields = Object.keys(updates).filter(key => key !== 'category_id');
    const values = fields.map(field => updates[field]);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการอัพเดท'
      });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await connection.query(
      `UPDATE s_curve_category SET ${setClause} WHERE category_id = ?`,
      [...values, categoryId]
    );

    res.json({
      success: true,
      message: 'อัพเดทหมวดงานสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทหมวดงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const deleteCategory = async (req, res) => {
  let connection;
  try {
    const { categoryId } = req.params;

    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_category SET is_active = 0 WHERE category_id = ?`,
      [categoryId]
    );

    res.json({
      success: true,
      message: 'ลบหมวดงานสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบหมวดงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const createType = async (req, res) => {
  let connection;
  try {
    const {
      category_id, type_code, type_name, type_description, type_price,
      start_date, end_date, sort_order
    } = req.body;

    connection = await getConnection();

    const [result] = await connection.query(
      `INSERT INTO s_curve_type 
       (category_id, type_code, type_name, type_description, type_price,
        start_date, end_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, type_code, type_name, type_description, type_price,
        start_date, end_date, sort_order]
    );

    res.status(201).json({
      success: true,
      message: 'สร้างประเภทงานสำเร็จ',
      data: { type_id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating type:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างประเภทงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const updateType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;
    const updates = req.body;

    connection = await getConnection();

    const fields = Object.keys(updates).filter(key => key !== 'type_id');
    const values = fields.map(field => updates[field]);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีข้อมูลที่ต้องการอัพเดท'
      });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await connection.query(
      `UPDATE s_curve_type SET ${setClause} WHERE type_id = ?`,
      [...values, typeId]
    );

    res.json({
      success: true,
      message: 'อัพเดทประเภทงานสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating type:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทประเภทงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const deleteType = async (req, res) => {
  let connection;
  try {
    const { typeId } = req.params;

    connection = await getConnection();

    await connection.query(
      `UPDATE s_curve_type SET is_active = 0 WHERE type_id = ?`,
      [typeId]
    );

    res.json({
      success: true,
      message: 'ลบประเภทงานสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting type:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบประเภทงาน',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const getSCurveExcelData = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    // 1. Fetch All S-Curve Elements (FLAT LIST)
    const itemsQuery = `
      SELECT 
        r.root_name as "หมวดงานหลัก",
        c.category_name as "หมวดงาน",
        t.type_name as "ประเภทงาน",
        st.subtype_name as "งานย่อย",
        COALESCE(st.total_price, t.type_price) as "งบประมาณ/น้ำหนัก",
        COALESCE(st.start_date, t.start_date) as "วันที่เริ่ม",
        COALESCE(st.end_date, t.end_date) as "วันที่สิ้นสุด",
        COALESCE(a.actual_progress, 0) as "ความคืบหน้าจริง (%)"
      FROM s_curve_root r
      LEFT JOIN s_curve_category c ON r.root_id = c.root_id AND c.is_active = 1
      LEFT JOIN s_curve_type t ON c.category_id = t.category_id AND t.is_active = 1
      LEFT JOIN s_curve_subtype st ON t.type_id = st.type_id AND st.is_active = 1
      LEFT JOIN s_curve_actual a ON 
        ((st.subtype_id IS NOT NULL AND a.subtype_id = st.subtype_id) OR (st.subtype_id IS NULL AND a.type_id = t.type_id))
        AND a.project_id = r.project_id
      WHERE r.project_id = ? AND r.is_active = 1
      ORDER BY r.sort_order, c.sort_order, t.sort_order, st.sort_order
    `;

    const [items] = await connection.query(itemsQuery, [projectId]);

    // Format dates for Excel
    const formattedItems = items.map(item => ({
      ...item,
      "วันที่เริ่ม": item["วันที่เริ่ม"] ? new Date(item["วันที่เริ่ม"]).toISOString().split('T')[0] : '-',
      "วันที่สิ้นสุด": item["วันที่สิ้นสุด"] ? new Date(item["วันที่สิ้นสุด"]).toISOString().split('T')[0] : '-'
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching Excel S-Curve data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับ Excel',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const getSCurveExcelSummary = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    // 1. Fetch All Items and History
    const queryItems = `
      SELECT 
        COALESCE(st.subtype_id, 0) as sub_id,
        t.type_id,
        COALESCE(st.total_price, t.type_price) as weight,
        COALESCE(st.start_date, t.start_date) as start_date,
        COALESCE(st.end_date, t.end_date) as end_date
      FROM s_curve_root r
      LEFT JOIN s_curve_category c ON r.root_id = c.root_id AND c.is_active = 1
      LEFT JOIN s_curve_type t ON c.category_id = t.category_id AND t.is_active = 1
      LEFT JOIN s_curve_subtype st ON t.type_id = st.type_id AND st.is_active = 1
      WHERE r.project_id = ? AND r.is_active = 1
    `;
    const [items] = await connection.query(queryItems, [projectId]);

    const queryHistory = `
      SELECT 
        COALESCE(h.update_date, a.created_at) as record_date,
        h.new_progress,
        COALESCE(a.subtype_id, 0) as sub_id,
        COALESCE(a.type_id, st.type_id) as type_id
      FROM s_curve_actual_history h
      JOIN s_curve_actual a ON h.actual_id = a.actual_id
      LEFT JOIN s_curve_subtype st ON a.subtype_id = st.subtype_id
      WHERE a.project_id = ?
      ORDER BY record_date ASC
    `;
    const [history] = await connection.query(queryHistory, [projectId]);

    if (items.length === 0) return res.json([]);

    // 2. Determine Date Range
    let minDate = null;
    let maxDate = null;
    items.forEach(item => {
      const s = item.start_date ? new Date(item.start_date) : null;
      const e = item.end_date ? new Date(item.end_date) : null;
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (!minDate) minDate = today;
    if (!maxDate) maxDate = today;
    
    const maxDForRange = today > maxDate ? today : maxDate;

    // 3. Generate Weekly Points
    const pointsSet = new Set();
    let current = new Date(minDate);
    current.setDate(1); // Start from first of month

    while (current <= maxDForRange) {
      [1, 8, 15, 22].forEach(day => {
        const d = new Date(current.getFullYear(), current.getMonth(), day);
        const dStr = d.toISOString().split('T')[0];
        const minStr = minDate.toISOString().split('T')[0];
        const maxStr = maxDForRange.toISOString().split('T')[0];
        if (dStr >= minStr && dStr <= maxStr) {
          pointsSet.add(dStr);
        }
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    pointsSet.add(minDate.toISOString().split('T')[0]);
    pointsSet.add(maxDForRange.toISOString().split('T')[0]);
    if (todayStr >= minDate.toISOString().split('T')[0] && todayStr <= maxDForRange.toISOString().split('T')[0]) {
        pointsSet.add(todayStr);
    }
    
    const points = Array.from(pointsSet).sort();

    const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight) || 1), 0);

    // 4. Calculate Cumulative Plan and Actual
    const result = points.map(dateStr => {
      const d = new Date(dateStr);
      let planWeight = 0;
      let actualWeight = 0;

      items.forEach(item => {
        const weight = parseFloat(item.weight) || 1;
        const s = item.start_date ? new Date(item.start_date) : minDate;
        const e = item.end_date ? new Date(item.end_date) : maxDate;

        // Plan
        if (d >= e) planWeight += weight;
        else if (d >= s) {
          const totalDays = Math.max(1, (e - s) / (1000 * 60 * 60 * 24));
          const elapsedDays = (d - s) / (1000 * 60 * 60 * 24);
          planWeight += weight * (elapsedDays / totalDays);
        }

        // Actual
        const itemHistory = history.filter(h => {
            const hDateStr = new Date(h.record_date).toISOString().split('T')[0];
            if (hDateStr > dateStr) return false;
            
            if (item.sub_id > 0) return h.sub_id === item.sub_id;
            return h.type_id === item.type_id;
        }).sort((a,b) => new Date(b.record_date) - new Date(a.record_date));

        if (itemHistory.length > 0) {
            actualWeight += (weight * (parseFloat(itemHistory[0].new_progress) || 0)) / 100;
        }
      });

      return {
        "วันที่": dateStr,
        "แผนความคืบหน้า (%)": parseFloat(((planWeight / totalWeight) * 100).toFixed(2)),
        "ความคืบหน้าจริง (%)": dateStr > todayStr ? null : parseFloat(((actualWeight / totalWeight) * 100).toFixed(2))
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error calculating Excel summary:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

const getSCurveExcelTimePhased = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();

    // 1. Fetch All Items and History
    const queryItems = `
      SELECT 
        r.root_name,
        c.category_name,
        t.type_name,
        st.subtype_name,
        COALESCE(st.subtype_id, 0) as sub_id,
        t.type_id,
        COALESCE(st.total_price, t.type_price) as cost,
        COALESCE(st.start_date, t.start_date) as start_date,
        COALESCE(st.end_date, t.end_date) as end_date
      FROM s_curve_root r
      LEFT JOIN s_curve_category c ON r.root_id = c.root_id AND c.is_active = 1
      LEFT JOIN s_curve_type t ON c.category_id = t.category_id AND t.is_active = 1
      LEFT JOIN s_curve_subtype st ON t.type_id = st.type_id AND st.is_active = 1
      WHERE r.project_id = ? AND r.is_active = 1
    `;
    const [items] = await connection.query(queryItems, [projectId]);

    const queryHistory = `
      SELECT 
        COALESCE(h.update_date, a.created_at) as record_date,
        h.new_progress,
        COALESCE(a.subtype_id, 0) as sub_id,
        COALESCE(a.type_id, st.type_id) as type_id
      FROM s_curve_actual_history h
      JOIN s_curve_actual a ON h.actual_id = a.actual_id
      LEFT JOIN s_curve_subtype st ON a.subtype_id = st.subtype_id
      WHERE a.project_id = ?
      ORDER BY record_date ASC
    `;
    const [history] = await connection.query(queryHistory, [projectId]);

    if (items.length === 0) return res.json([]);

    // 2. Determine Date Range
    let minDateS = null;
    let maxDateS = null;
    items.forEach(item => {
      const s = item.start_date ? new Date(item.start_date) : null;
      const e = item.end_date ? new Date(item.end_date) : null;
      if (s && (!minDateS || s < minDateS)) minDateS = s;
      if (e && (!maxDateS || e > maxDateS)) maxDateS = e;
    });

    const today = new Date();
    if (!minDateS) minDateS = today;
    if (!maxDateS) maxDateS = today;
    if (today > maxDateS) maxDateS = today;

    // 3. Generate Weekly Points (Every Monday)
    const weeks = [];
    let current = new Date(minDateS);
    // Find previous Monday
    current.setDate(current.getDate() - (current.getDay() === 0 ? 6 : current.getDay() - 1));

    while (current <= maxDateS) {
      weeks.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }

    const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 1), 0);

    // 4. Transform into Time-Phased Rows
    const rows = [];
    items.forEach(item => {
      const weight = (parseFloat(item.cost) || 1) / totalCost * 100;
      const s = item.start_date ? new Date(item.start_date) : minDateS;
      const e = item.end_date ? new Date(item.end_date) : maxDateS;
      const totalDays = Math.max(1, (e - s) / (1000 * 60 * 60 * 24));

      weeks.forEach((weekStr, idx) => {
        const wStart = new Date(weekStr);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 7);

        // Plan: Overlap between [s, e] and [wStart, wEnd]
        const overlapStart = new Date(Math.max(s, wStart));
        const overlapEnd = new Date(Math.min(e, wEnd));
        let planPercent = 0;
        if (overlapEnd > overlapStart) {
          const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
          planPercent = (weight * overlapDays) / totalDays;
        }

        // Actual: Progress gained during this week
        // Get progress at start of week
        const historyBefore = history.filter(h => {
          const hDate = new Date(h.record_date);
          if (hDate > wStart) return false;
          return item.sub_id > 0 ? h.sub_id === item.sub_id : h.type_id === item.type_id;
        }).sort((a,b) => new Date(b.record_date) - new Date(a.record_date));
        
        const historyDuring = history.filter(h => {
          const hDate = new Date(h.record_date);
          if (hDate <= wStart || hDate > wEnd) return false;
          return item.sub_id > 0 ? h.sub_id === item.sub_id : h.type_id === item.type_id;
        }).sort((a,b) => new Date(b.record_date) - new Date(a.record_date));

        const startProg = historyBefore.length > 0 ? parseFloat(historyBefore[0].new_progress) : 0;
        const endProg = historyDuring.length > 0 ? parseFloat(historyDuring[0].new_progress) : startProg;
        
        let actualPercent = 0;
        if (wStart <= today) {
          actualPercent = (weight * (endProg - startProg)) / 100;
        } else {
          actualPercent = null;
        }

        rows.push({
          "หมวดงานหลัก": item.root_name || "-",
          "หมวดงาน": item.category_name || "-",
          "ประเภทงาน": item.type_name || "-",
          "งานย่อย": item.subtype_name || "-",
          "งบประมาณ (Cost)": parseFloat(item.cost) || 0,
          "Weight (%)": parseFloat(weight.toFixed(4)),
          "สัปดาห์วันที่": weekStr,
          "แผนงานประจำสัปดาห์ (%)": parseFloat(planPercent.toFixed(4)),
          "ผลงานจริงประจำสัปดาห์ (%)": actualPercent !== null ? parseFloat(actualPercent.toFixed(4)) : null
        });
      });
    });

    res.json(rows);
  } catch (error) {
    console.error('Error calculating Time-Phased Excel data:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getSCurveExcelTimePhased,
  getRootCategories,
  getRootDetails,
  getCategoriesWithTypes,
  getCategoryDetails,
  getTypeDetails,
  getCompleteSCurveData,
  getChartData,
  getSCurveExcelData,
  getSCurveExcelSummary,
  createRoot,
  updateRoot,
  deleteRoot,
  createCategory,
  updateCategory,
  deleteCategory,
  createType,
  updateType,
  deleteType
};