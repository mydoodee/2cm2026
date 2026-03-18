//folderController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

// ==================== FOLDER FUNCTIONS ====================

/**
 * ดึงรายการโฟลเดอร์ทั้งหมดในโครงการ
 */
async function getFolders(req, res) {
  let connection;
  try {
    connection = await getConnection();
    const projectId = req.query.project_id;

    if (!projectId) {
      return res.status(400).json({
        message: 'Project ID is required'
      });
    }

    // พยายามดึงข้อมูลพร้อม permissions
    let query = `
      SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.project_id, f.active,
             COALESCE(
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                  'permission_id', fp.permission_id,
                   'user_id', fp.user_id,
                   'permission_type', fp.permission_type
                 )
               ),
               JSON_ARRAY()
             ) as permissions
      FROM folders f
      LEFT JOIN folder_permissions fp ON f.folder_id = fp.folder_id
      WHERE f.project_id = ? AND f.active = 1
      GROUP BY f.folder_id
    `;

    let folders;
    try {
      [folders] = await connection.query(query, [projectId]);
    } catch (error) {
      // Fallback: ดึงแบบแยก query ถ้า JSON_ARRAYAGG ไม่รองรับ
      query = `
        SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.project_id, f.active
        FROM folders f
        WHERE f.project_id = ? AND f.active = 1
      `;
      [folders] = await connection.query(query, [projectId]);

      for (const folder of folders) {
        const [permissions] = await connection.query(
          'SELECT user_id, permission_type FROM folder_permissions WHERE folder_id = ?',
          [folder.folder_id]
        );
        folder.permissions = permissions.map(p => ({
          permission_id: null,
          user_id: p.user_id,
          permission_type: p.permission_type
        }));
      }
    }

    // จัดรูปแบบ permissions
    const formattedFolders = folders.map(folder => {
      let permissions = [];
      try {
        if (folder.permissions && folder.permissions !== 'null' && typeof folder.permissions === 'string') {
          permissions = JSON.parse(folder.permissions);
        } else if (Array.isArray(folder.permissions)) {
          permissions = folder.permissions;
        }
      } catch (error) {
        permissions = [];
      }
      return {
        ...folder,
        permissions: Array.isArray(permissions) ? permissions.filter(p => p && p.user_id) : []
      };
    });

    res.json({ folders: formattedFolders });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

/**
 * ดึงรายการโฟลเดอร์พร้อม subfolder IDs แบบ recursive
 */
async function getFoldersWithSubfolders(req, res) {
  let connection;
  try {
    connection = await getConnection();
    const projectId = req.query.project_id;

    if (!projectId) {
      return res.status(400).json({
        message: 'Project ID is required'
      });
    }

    // ดึงข้อมูลโฟลเดอร์ทั้งหมด
    let query = `
      SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.project_id, f.active,
             COALESCE(
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'permission_id', fp.id,
                   'user_id', fp.user_id,
                   'permission_type', fp.permission_type
                 )
               ),
               JSON_ARRAY()
             ) as permissions
      FROM folders f
      LEFT JOIN folder_permissions fp ON f.folder_id = fp.folder_id
      WHERE f.project_id = ? AND f.active = 1
      GROUP BY f.folder_id
    `;

    let folders;
    try {
      [folders] = await connection.query(query, [projectId]);
    } catch (error) {
      query = `
        SELECT f.folder_id, f.folder_name, f.parent_folder_id, f.project_id, f.active
        FROM folders f
        WHERE f.project_id = ? AND f.active = 1
      `;
      [folders] = await connection.query(query, [projectId]);

      for (const folder of folders) {
        const [permissions] = await connection.query(
          'SELECT user_id, permission_type FROM folder_permissions WHERE folder_id = ?',
          [folder.folder_id]
        );
        folder.permissions = permissions.map(p => ({
          permission_id: null,
          user_id: p.user_id,
          permission_type: p.permission_type
        }));
      }
    }

    const formattedFolders = folders.map(folder => {
      let permissions = [];
      try {
        if (folder.permissions && folder.permissions !== 'null' && typeof folder.permissions === 'string') {
          permissions = JSON.parse(folder.permissions);
        } else if (Array.isArray(folder.permissions)) {
          permissions = folder.permissions;
        }
      } catch (error) {
        permissions = [];
      }
      return {
        ...folder,
        permissions: Array.isArray(permissions) ? permissions : []
      };
    });

    // ฟังก์ชัน recursive สำหรับหา subfolder IDs ทั้งหมด
    const getAllSubfolderIds = (parentId, allFolders) => {
      const subfolders = allFolders.filter(f => f.parent_folder_id === parentId);
      let ids = [parentId];
      subfolders.forEach(sub => {
        ids = ids.concat(getAllSubfolderIds(sub.folder_id, allFolders));
      });
      return ids;
    };

    // เพิ่ม subfolder_ids ให้กับแต่ละโฟลเดอร์
    const foldersWithSubfolders = formattedFolders.map(folder => ({
      ...folder,
      subfolder_ids: getAllSubfolderIds(folder.folder_id, formattedFolders)
    }));

    res.json({ folders: foldersWithSubfolders });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

/**
 * สร้างโฟลเดอร์ใหม่
 */
const createFolder = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const { project_id, folder_name, parent_folder_id } = req.body;

    if (!project_id || !folder_name) {
      return res.status(400).json({
        message: 'กรุณาระบุ project_id และ folder_name'
      });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโครงการมีอยู่จริง
    const [projectRows] = await connection.execute(
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
      [project_id]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการ' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในโครงการนี้'
      });
    }

    // ตรวจสอบ parent folder (ถ้ามี)
    if (parent_folder_id) {
      const [parentRows] = await connection.execute(
        'SELECT folder_id FROM folders WHERE folder_id = ? AND project_id = ? AND active = 1',
        [parent_folder_id, project_id]
      );
      if (parentRows.length === 0) {
        return res.status(400).json({
          message: 'โฟลเดอร์หลักไม่ถูกต้องหรือไม่พบ'
        });
      }
    }

    // สร้างโฟลเดอร์
    const [result] = await connection.execute(
      `INSERT INTO folders 
       (project_id, folder_name, parent_folder_id, created_by, active, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [project_id, folder_name, parent_folder_id || null, req.user.user_id, 1]
    );

    res.json({
      message: 'สร้างโฟลเดอร์สำเร็จ',
      folder_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

/**
 * แก้ไขชื่อโฟลเดอร์
 */
const updateFolder = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const folderId = req.params.id;
    const { folder_name, parent_folder_id } = req.body;

    if (!folder_name) {
      return res.status(400).json({ message: 'กรุณาระบุ folder_name' });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [folderId]
    );
    if (folderRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [folderRows[0].project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์แก้ไขโฟลเดอร์นี้'
      });
    }

    // ตรวจสอบ parent folder (ถ้ามี)
    if (parent_folder_id) {
      const [parentRows] = await connection.execute(
        'SELECT folder_id FROM folders WHERE folder_id = ? AND project_id = ? AND active = 1',
        [parent_folder_id, folderRows[0].project_id]
      );
      if (parentRows.length === 0) {
        return res.status(400).json({
          message: 'โฟลเดอร์หลักไม่ถูกต้องหรือไม่พบ'
        });
      }
    }

    // อัพเดทโฟลเดอร์
    await connection.execute(
      `UPDATE folders 
       SET folder_name = ?, parent_folder_id = ?, updated_at = NOW() 
       WHERE folder_id = ? AND active = 1`,
      [folder_name, parent_folder_id || null, folderId]
    );

    res.json({
      message: 'แก้ไขโฟลเดอร์สำเร็จ',
      folder_id: folderId
    });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

/**
 * ลบโฟลเดอร์ (soft delete)
 */
const deleteFolder = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const folderId = req.params.id;
    connection = await getConnection();

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [folderId]
    );
    if (folderRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [folderRows[0].project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์ลบโฟลเดอร์นี้'
      });
    }

    // ลบโฟลเดอร์ (soft delete)
    await connection.execute(
      'UPDATE folders SET active = 0, updated_at = NOW() WHERE folder_id = ?',
      [folderId]
    );

    res.json({
      message: 'ลบโฟลเดอร์สำเร็จ',
      folder_id: folderId
    });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

/**
 * ฟังก์ชันช่วยหา IDs ของโฟลเดอร์ย่อยทั้งหมดแบบ recursive
 */
async function getAllSubfolderIdsRecursive(connection, parentId, projectId) {
  const [subfolders] = await connection.execute(
    'SELECT folder_id FROM folders WHERE parent_folder_id = ? AND project_id = ? AND active = 1',
    [parentId, projectId]
  );

  let allIds = [];
  for (const sub of subfolders) {
    allIds.push(sub.folder_id);
    const descendantIds = await getAllSubfolderIdsRecursive(connection, sub.folder_id, projectId);
    allIds = allIds.concat(descendantIds);
  }
  return allIds;
}

/**
 * กำหนดสิทธิ์การเข้าถึงโฟลเดอร์
 */
const updateFolderPermissions = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const folderId = req.params.id;
    const { permissions, apply_to_subfolders } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'permissions ต้องเป็น array' });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [folderId]
    );
    if (folderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    const projectId = folderRows[0].project_id;

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      await connection.rollback();
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์กำหนดสิทธิ์โฟลเดอร์นี้'
      });
    }

    // เตรียมรายการ folder IDs ที่จะอัปเดต
    let folderIdsToUpdate = [folderId];
    if (apply_to_subfolders) {
      const subfolderIds = await getAllSubfolderIdsRecursive(connection, folderId, projectId);
      folderIdsToUpdate = folderIdsToUpdate.concat(subfolderIds);
      console.log(`📂 Applying permissions to folder ${folderId} and ${subfolderIds.length} subfolders`);
    }

    // อัปเดตสิทธิ์สำหรับทุกโฟลเดอร์ที่เกี่ยวข้อง
    const validPermissions = ['read', 'write', 'admin'];
    const grantedPermissions = permissions.filter(p => p.user_id && validPermissions.includes(p.permission_type) && p.granted);

    for (const targetId of folderIdsToUpdate) {
      // ลบ permissions เดิม
      await connection.execute(
        'DELETE FROM folder_permissions WHERE folder_id = ?',
        [targetId]
      );

      // เพิ่ม permissions ใหม่
      if (grantedPermissions.length > 0) {
        const values = grantedPermissions.map(p => [targetId, p.user_id, p.permission_type]);
        const sql = `INSERT INTO folder_permissions (folder_id, user_id, permission_type) VALUES ?`;
        await connection.query(sql, [values]);
      }
    }

    await connection.commit();
    res.json({
      message: apply_to_subfolders ? 'กำหนดสิทธิ์โฟลเดอร์และโฟลเดอร์ย่อยสำเร็จ' : 'กำหนดสิทธิ์โฟลเดอร์สำเร็จ',
      folder_id: folderId,
      affected_folders: folderIdsToUpdate.length
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Update folder permissions error:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

// ==================== FILE FUNCTIONS ====================

/**
 * ดึงรายการไฟล์ในโฟลเดอร์
 */
const getFiles = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const folderId = req.query.folder_id || req.params.folderId;

    if (!folderId) {
      return res.status(400).json({ message: 'กรุณาระบุ folder_id' });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [folderId]
    );
    if (folderRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [folderRows[0].project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์ดูไฟล์ในโฟลเดอร์นี้'
      });
    }

    // ดึงรายการไฟล์
    const [files] = await connection.execute(
      `SELECT file_id, file_name, file_path, file_size, uploaded_by, created_at 
       FROM files 
       WHERE folder_id = ? AND active = 1`,
      [folderId]
    );

    res.json({ files });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};



// ==================== FILE FUNCTIONS ====================
const uploadFile = async (req, res) => {
  let connection;
  try {
    // ตรวจสอบ authentication
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    console.log('📥 Received upload request:', {
      folderId: req.params.folderId,
      relativePath: req.query.relativePath || req.body.relativePath,
      hasFile: !!req.file,
      fileName: req.file ? req.file.originalname : null
    });

    // ✅ ใช้ folderId จาก URL params เป็นหลัก
    const folder_id = parseInt(req.params.folderId);
    const relativePath = req.query.relativePath || req.body.relativePath;
    const file = req.file;

    console.log('📤 Upload params:', {
      folder_id,
      folder_id_type: typeof folder_id,
      relativePath,
      user_id: req.user.user_id
    });

    // ตรวจสอบ folder_id
    if (!folder_id || isNaN(folder_id)) {
      console.error('❌ Invalid folder_id:', req.params.folderId);
      return res.status(400).json({
        message: 'Invalid folder_id in URL',
        received: req.params.folderId
      });
    }

    // ตรวจสอบไฟล์
    if (!file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        message: 'กรุณาอัพโหลดไฟล์'
      });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [folder_id]
    );

    console.log('🔍 Folder query result:', {
      folder_id,
      found: folderRows.length > 0,
      project_id: folderRows[0]?.project_id
    });

    if (folderRows.length === 0) {
      console.error('❌ Folder not found:', folder_id);
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [folderRows[0].project_id, req.user.user_id]
    );

    console.log('🔍 Permission check:', {
      isAdmin,
      hasProjectRole: roleRows.length > 0,
      user_id: req.user.user_id,
      project_id: folderRows[0].project_id
    });

    if (roleRows.length === 0 && !isAdmin) {
      console.error('❌ No permission to upload');
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์อัปโหลดไฟล์ในโฟลเดอร์นี้'
      });
    }

    let finalFilePath;
    let displayName;
    let targetFolderId = folder_id; // ✅ เริ่มต้นใช้ folder_id ที่ส่งเข้ามา

    // ✅ จัดการ relativePath ที่ส่งมาจาก Frontend
    if (relativePath && relativePath.trim() !== '') {
      console.log('📁 Processing with relativePath:', relativePath);

      // ✅ ถ้า relativePath มี "/" = มี subfolder structure
      if (relativePath.includes('/')) {
        const pathParts = relativePath.split('/');
        displayName = pathParts[pathParts.length - 1]; // ชื่อไฟล์ตัวจริง
        pathParts.pop(); // เอาชื่อไฟล์ออก
        const subfolderPath = pathParts.join('/');

        console.log('📂 Subfolder structure detected:', {
          displayName,
          subfolderPath,
          pathParts,
          rootFolderId: folder_id
        });

        // ✅ หา folder_id ของ subfolder สุดท้าย
        const subfolderParts = subfolderPath.split('/');
        let currentParentId = folder_id;

        for (const part of subfolderParts) {
          const [subfolderResult] = await connection.execute(
            `SELECT folder_id FROM folders 
             WHERE folder_name = ? 
             AND parent_folder_id = ? 
             AND project_id = ? 
             AND active = 1`,
            [part, currentParentId, folderRows[0].project_id]
          );

          if (subfolderResult.length === 0) {
            console.error(`❌ Subfolder not found: ${part} (parent: ${currentParentId})`);
            return res.status(404).json({
              message: `ไม่พบโฟลเดอร์ย่อย: ${part}`
            });
          }

          currentParentId = subfolderResult[0].folder_id;
          console.log(`✅ Found subfolder: ${part} (ID: ${currentParentId})`);
        }

        targetFolderId = currentParentId; // ✅ ใช้ folder_id ของ subfolder สุดท้าย

        // สร้างและย้ายไฟล์ไปยัง subfolder
        const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folder_id}`);
        const subfolderDir = path.join(uploadDir, subfolderPath);

        try {
          await fs.mkdir(subfolderDir, { recursive: true });
          await fs.chmod(subfolderDir, 0o755);
          console.log('✅ Created subfolder:', subfolderDir);
        } catch (err) {
          console.error('❌ Failed to create subfolder:', err);
          return res.status(500).json({
            message: 'ไม่สามารถสร้างโฟลเดอร์ย่อยได้',
            error: err.message
          });
        }

        const currentPath = file.path;
        const newPath = path.join(subfolderDir, file.filename);

        try {
          await fs.rename(currentPath, newPath);
          console.log('✅ File moved to subfolder:', newPath);
        } catch (err) {
          console.error('❌ Failed to move file:', err);
          return res.status(500).json({
            message: 'ไม่สามารถย้ายไฟล์ได้',
            error: err.message
          });
        }

        finalFilePath = `/Uploads/folder_${folder_id}/${subfolderPath}/${file.filename}`;

      } else {
        // ✅ relativePath ไม่มี "/" = ไฟล์เดียวอยู่ที่ root ของ folder_id ที่ส่งมา
        displayName = relativePath;
        targetFolderId = folder_id; // ✅ ใช้ folder_id จาก URL

        const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folder_id}`);

        try {
          await fs.mkdir(uploadDir, { recursive: true });
          await fs.chmod(uploadDir, 0o755);
        } catch (err) {
          console.error('❌ Failed to create upload dir:', err);
        }

        const currentPath = file.path;
        const newPath = path.join(uploadDir, file.filename);

        try {
          await fs.rename(currentPath, newPath);
          console.log('✅ File moved to folder:', newPath);
        } catch (err) {
          console.error('❌ Failed to move file:', err);
          return res.status(500).json({
            message: 'ไม่สามารถย้ายไฟล์ได้',
            error: err.message
          });
        }

        finalFilePath = `/Uploads/folder_${folder_id}/${file.filename}`;

        console.log('📄 Single file (no subfolder):', {
          displayName,
          targetFolderId,
          finalFilePath
        });
      }
    } else {
      // ✅ ไม่มี relativePath = ไฟล์ปกติ (fallback)
      displayName = file.originalname;
      targetFolderId = folder_id;

      const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folder_id}`);

      try {
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.chmod(uploadDir, 0o755);
      } catch (err) {
        console.error('❌ Failed to create upload dir:', err);
      }

      const currentPath = file.path;
      const newPath = path.join(uploadDir, file.filename);

      try {
        await fs.rename(currentPath, newPath);
        console.log('✅ File moved:', newPath);
      } catch (err) {
        console.error('❌ Failed to move file:', err);
        return res.status(500).json({
          message: 'ไม่สามารถย้ายไฟล์ได้',
          error: err.message
        });
      }

      finalFilePath = `/Uploads/folder_${folder_id}/${file.filename}`;
    }

    console.log('✅ Final save params:', {
      displayName,
      finalFilePath,
      targetFolderId
    });

    // ✅ บันทึกลงฐานข้อมูลโดยใช้ targetFolderId
    const [result] = await connection.execute(
      `INSERT INTO files 
       (folder_id, file_name, file_path, file_type, file_size, uploaded_by, active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        targetFolderId, // ✅ ใช้ targetFolderId ที่คำนวณได้
        displayName,
        finalFilePath,
        path.extname(displayName).substring(1).toLowerCase() || 'unknown',
        file.size,
        req.user.user_id,
        1
      ]
    );

    console.log('✅ File saved to database:', {
      file_id: result.insertId,
      folder_id: targetFolderId,
      file_name: displayName
    });

    res.json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        file_id: result.insertId,
        file_path: finalFilePath,
        file_name: displayName,
        folder_id: targetFolderId
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};


// ==================== EXPORTS ====================


const deleteFile = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const fileId = req.params.id;
    connection = await getConnection();

    // ตรวจสอบว่าไฟล์มีอยู่จริง
    const [fileRows] = await connection.execute(
      'SELECT folder_id, file_path FROM files WHERE file_id = ? AND active = 1',
      [fileId]
    );
    if (fileRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบไฟล์' });
    }

    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
    const [folderRows] = await connection.execute(
      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',
      [fileRows[0].folder_id]
    );
    if (folderRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ในโครงการ
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [folderRows[0].project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์ลบไฟล์นี้'
      });
    }

    // ลบไฟล์ในฐานข้อมูล (soft delete)
    await connection.execute(
      'UPDATE files SET active = 0, updated_at = NOW() WHERE file_id = ?',
      [fileId]
    );

    // ลบไฟล์จาก disk
    const filePath = path.join(__dirname, '..', fileRows[0].file_path);
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      console.log('✅ File deleted from disk:', filePath);
    } catch (err) {
      console.log('⚠️ File not found on disk, but marked as deleted in DB');
    }

    res.json({
      message: 'ลบไฟล์สำเร็จ',
      file_id: fileId
    });
  } catch (error) {
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};
/**
 * ดึงรายการผู้ใช้ในโครงการ
 */
const getProjectUsers = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        message: 'ไม่พบข้อมูลผู้ใช้ใน token'
      });
    }

    const projectId = req.params.projectId;

    if (!projectId) {
      return res.status(400).json({ message: 'กรุณาระบุ project_id' });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโครงการมีอยู่จริง
    const [projectRows] = await connection.execute(
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
      [projectId]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการ' });
    }

    // ดึงผู้ใช้ที่มีสิทธิ์ในโครงการ
    const [users] = await connection.execute(
      `SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name, u.email
       FROM users u
       INNER JOIN project_user_roles pur ON u.user_id = pur.user_id
       WHERE pur.project_id = ? AND u.active = 1
       ORDER BY u.username`,
      [projectId]
    );

    res.json({ users });
  } catch (error) {
    console.error('Get project users error:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

/**
 * คัดลอกโครงสร้างโฟลเดอร์จากโครงการหนึ่งไปยังอีกโครงการหนึ่ง
 * (copy เฉพาะโครงสร้าง ไม่รวมไฟล์และสิทธิ์)
 */
const copyFolderStructure = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const { sourceProjectId, targetProjectId } = req.body;

    if (!sourceProjectId || !targetProjectId) {
      return res.status(400).json({ message: 'กรุณาระบุ sourceProjectId และ targetProjectId' });
    }

    if (sourceProjectId === targetProjectId) {
      return res.status(400).json({ message: 'โครงการต้นทางและปลายทางต้องไม่เป็นโครงการเดียวกัน' });
    }

    connection = await getConnection();

    // ตรวจสอบว่าโครงการทั้งสองมีอยู่จริง
    const [sourceProject] = await connection.execute(
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
      [sourceProjectId]
    );
    const [targetProject] = await connection.execute(
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
      [targetProjectId]
    );

    if (sourceProject.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการต้นทาง' });
    }
    if (targetProject.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการปลายทาง' });
    }

    // ตรวจสอบสิทธิ์ admin
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    // ตรวจสอบสิทธิ์ใน target project
    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [targetProjectId, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในโครงการปลายทาง' });
    }

    // ดึงโฟลเดอร์ทั้งหมดจาก source project
    const [sourceFolders] = await connection.execute(
      'SELECT folder_id, folder_name, parent_folder_id FROM folders WHERE project_id = ? AND active = 1 ORDER BY parent_folder_id ASC',
      [sourceProjectId]
    );

    if (sourceFolders.length === 0) {
      return res.status(400).json({ message: 'โครงการต้นทางไม่มีโฟลเดอร์' });
    }

    await connection.beginTransaction();

    // Map: old_folder_id → new_folder_id
    const oldToNewIdMap = {};
    let createdCount = 0;

    // ฟังก์ชัน recursive สร้างโฟลเดอร์ตามลำดับ parent → child
    const createFoldersRecursive = async (parentId, newParentId) => {
      const children = sourceFolders.filter(f => f.parent_folder_id === parentId);

      for (const child of children) {
        const [result] = await connection.execute(
          `INSERT INTO folders (project_id, folder_name, parent_folder_id, created_by, active, created_at)
           VALUES (?, ?, ?, ?, 1, NOW())`,
          [targetProjectId, child.folder_name, newParentId, req.user.user_id]
        );

        oldToNewIdMap[child.folder_id] = result.insertId;
        createdCount++;

        // Recursive: สร้าง subfolder ต่อ
        await createFoldersRecursive(child.folder_id, result.insertId);
      }
    };

    // เริ่มจาก root folders (parent_folder_id = null)
    await createFoldersRecursive(null, null);

    await connection.commit();

    console.log(`✅ Copied ${createdCount} folders from project ${sourceProjectId} to ${targetProjectId}`);

    res.json({
      message: `คัดลอกโครงสร้างโฟลเดอร์สำเร็จ (${createdCount} โฟลเดอร์)`,
      created_count: createdCount,
      source_project_id: sourceProjectId,
      target_project_id: targetProjectId
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Copy folder structure error:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการคัดลอกโครงสร้าง',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

// ใน exports เพิ่ม
module.exports = {
  // Folder functions
  getFolders,
  getFoldersWithSubfolders,
  createFolder,
  updateFolder,
  deleteFolder,
  updateFolderPermissions,
  copyFolderStructure,

  // File functions
  getFiles,
  uploadFile,
  deleteFile,

  // Project users
  getProjectUsers,  // เพิ่มบรรทัดนี้
};
// ==================== EXPORTS ====================
