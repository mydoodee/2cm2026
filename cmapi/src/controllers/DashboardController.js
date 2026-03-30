// DashboardController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const statusController = require('./statusController'); // Import statusController สำหรับ WebSocket activities
// ✅ ปรับปรุงฟังก์ชันตรวจสอบสิทธิ์แบบ recursive (จากล่างขึ้นบน)
const checkFolderPermissionRecursive = async (connection, folderId, userId) => {
    // 1. ดึงข้อมูล folder ปัจจุบัน
    const [currentFolder] = await connection.execute(
        'SELECT folder_id, parent_folder_id, project_id FROM folders WHERE folder_id = ? AND active = 1',
        [folderId]
    );

    if (currentFolder.length === 0) {
        return { hasPermission: false, permissionType: null, projectId: null };
    }

    const folder = currentFolder[0];

    // 2. ✅ ตรวจสอบว่าเป็น admin ของ project หรือไม่ (Admin มีสิทธิ์สูงสุดเสมอ)
    const [userRoles] = await connection.execute(
        'SELECT role_id FROM project_user_roles WHERE user_id = ? AND project_id = ? AND role_id = 1',
        [userId, folder.project_id]
    );

    if (userRoles.length > 0) {
        return {
            hasPermission: true,
            permissionType: 'admin',
            projectId: folder.project_id
        };
    }

    // 3. ✅ ตรวจสอบสิทธิ์โดยตรงของ folder นี้ (เรียงลำดับตามความสำคัญ: admin > write > read)
    const [permissions] = await connection.execute(
        `SELECT permission_type FROM folder_permissions 
         WHERE folder_id = ? AND user_id = ? 
         ORDER BY FIELD(permission_type, 'admin', 'write', 'read') ASC`,
        [folderId, userId]
    );

    if (permissions.length > 0) {
        return {
            hasPermission: true,
            permissionType: permissions[0].permission_type,
            projectId: folder.project_id
        };
    }

    // 4. ✅ ถ้าไม่มีสิทธิ์โดยตรง ให้ตรวจสอบ parent folder (recursive)
    if (folder.parent_folder_id) {
        return await checkFolderPermissionRecursive(connection, folder.parent_folder_id, userId);
    }

    // 5. ถ้าไม่มีสิทธิ์ใดๆ เลย
    return {
        hasPermission: false,
        permissionType: null,
        projectId: folder.project_id
    };
};
// ✅ ฟังก์ชันใหม่: หา subfolder โดยใช้ relative path และตรวจสอบสิทธิ์
const findOrCreateSubfolderWithPermission = async (connection, baseFolderId, relativePath, projectId, userId) => {
    const pathParts = relativePath.split('/').filter(Boolean);

    if (pathParts.length <= 1) {
        return baseFolderId;
    }

    const folderParts = pathParts.slice(0, -1);
    let currentParentId = baseFolderId;

    // ✅ ดึง permission ของ parent folder
    const [parentPermissions] = await connection.execute(
        'SELECT permission_type FROM folder_permissions WHERE folder_id = ? AND user_id = ?',
        [baseFolderId, userId]
    );

    const parentPermission = parentPermissions.length > 0 ? parentPermissions[0].permission_type : 'write';

    for (const folderName of folderParts) {
        const [existingFolder] = await connection.execute(
            `SELECT folder_id FROM folders
             WHERE folder_name = ?
             AND parent_folder_id = ?
             AND project_id = ?
             AND active = 1`,
            [folderName, currentParentId, projectId]
        );

        if (existingFolder.length > 0) {
            currentParentId = existingFolder[0].folder_id;
        } else {
            const [createResult] = await connection.execute(
                `INSERT INTO folders
                 (project_id, folder_name, parent_folder_id, created_by, active, created_at)
                 VALUES (?, ?, ?, ?, 1, NOW())`,
                [projectId, folderName, currentParentId, userId]
            );
            currentParentId = createResult.insertId;

            // ✅ เพิ่ม permission ให้ subfolder ใหม่โดยอัตโนมัติ (สืบทอดจาก parent)
            try {
                await connection.execute(
                    `INSERT INTO folder_permissions (folder_id, user_id, permission_type, created_at)
                     VALUES (?, ?, ?, NOW())`,
                    [currentParentId, userId, parentPermission]
                );
            } catch (permError) {
            }
        }
    }

    return currentParentId;
};
const getProjectDetails = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();

        const [projects] = await connection.execute(
            `SELECT * FROM projects WHERE project_id = ? AND active = 1`,
            [req.params.id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                message: 'ไม่พบโปรเจกต์',
                debug: {
                    project_id: req.params.id,
                    user_id: req.user.user_id
                }
            });
        }

        const project = projects[0];

        // ✅ ดึง role ของ current user ในโปรเจกต์นี้
        const [currentUserRole] = await connection.execute(
            `SELECT r.role_name, r.role_id
       FROM project_user_roles pur
       JOIN roles r ON pur.role_id = r.role_id
       WHERE pur.user_id = ? AND pur.project_id = ?`,
            [req.user.user_id, req.params.id]
        );
        // ✅ ดึง progress summary
        const [progressSummaries] = await connection.execute(
            `SELECT
        summary_id,
        installment,
        summary_date,
        planned_progress,
        actual_progress,
        progress_ahead,
        progress_behind,
        notes
       FROM progress_summaries
       WHERE project_id = ?
       ORDER BY summary_date DESC
       LIMIT 1`,
            [req.params.id]
        );
        const [payments] = await connection.execute(
            `SELECT payment_id, total_installments, total_amount,
              submitted_installments, submitted_amount,
              current_installment, current_installment_amount
       FROM payments
       WHERE project_id = ?
       LIMIT 1`,
            [req.params.id]
        );
        const [teamMembers] = await connection.execute(
            `SELECT u.user_id, u.username AS name, u.email, r.role_name AS role
       FROM project_user_roles pur
       JOIN users u ON pur.user_id = u.user_id
       JOIN roles r ON pur.role_id = r.role_id
       WHERE pur.project_id = ?`,
            [req.params.id]
        );
        // ✅ คำนวณข้อมูล progress
        let progressSummaryData = null;
        if (progressSummaries.length > 0) {
            const startDate = new Date(project.start_date);
            const endDate = new Date(project.end_date);
            const summaryDate = new Date(progressSummaries[0].summary_date);

            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const daysWorked = Math.ceil((summaryDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const remainingDays = Math.ceil((endDate - summaryDate) / (1000 * 60 * 60 * 24));

            progressSummaryData = {
                summary_id: progressSummaries[0].summary_id,
                installment: progressSummaries[0].installment,
                summary_date: progressSummaries[0].summary_date,
                contract_start_date: project.start_date,
                contract_end_date: project.end_date,
                total_contract_days: totalDays,
                days_worked: Math.max(0, daysWorked),
                remaining_days: remainingDays,
                planned_progress: progressSummaries[0].planned_progress,
                actual_progress: progressSummaries[0].actual_progress,
                progress_ahead: progressSummaries[0].progress_ahead,
                progress_behind: progressSummaries[0].progress_behind,
                notes: progressSummaries[0].notes
            };
        }
        // ✅ สร้าง project data object
        const projectData = {
            project_id: project.project_id,
            project_name: project.project_name,
            description: project.description,
            job_number: project.job_number,
            status: project.status,
            progress: project.progress,
            active: project.active === 1,
            owner: project.owner,
            consultant: project.consusltant || project.consultant,
            contractor: project.contractor,
            address: project.address,
            created_at: project.created_at,
            updated_at: project.updated_at,
            start_date: project.start_date ? new Date(project.start_date).toISOString() : null,
            end_date: project.end_date ? new Date(project.end_date).toISOString() : null,
            start_date_display: project.start_date ? new Date(project.start_date).toLocaleDateString('th-TH') : null,
            end_date_display: project.end_date ? new Date(project.end_date).toLocaleDateString('th-TH') : null,
            image: project.image,
            progress_summary_image: project.progress_summary_image,
            payment_image: project.payment_image,
            design_image: project.design_image,
            pre_construction_image: project.pre_construction_image,
            construction_image: project.construction_image,
            cm_image: project.cm_image,
            precast_image: project.precast_image,
            // ✅ เพิ่ม current user role (สำคัญมาก!)
            current_user_role: currentUserRole.length > 0 ? {
                role_id: currentUserRole[0].role_id,
                role_name: currentUserRole[0].role_name
            } : null,
            progress_summary: progressSummaryData,
            payment: payments.length > 0 ? {
                payment_id: payments[0].payment_id,
                total_installments: payments[0].total_installments,
                total_amount: Number(payments[0].total_amount),
                submitted_installments: payments[0].submitted_installments,
                submitted_amount: Number(payments[0].submitted_amount),
                current_installment: payments[0].current_installment,
                current_installment_amount: Number(payments[0].current_installment_amount)
            } : null,
            team_members: teamMembers.length > 0 ? teamMembers.map(member => ({
                user_id: member.user_id,
                name: member.name,
                email: member.email,
                role: member.role
            })) : []
        };

        res.status(200).json({
            message: 'ดึงข้อมูลโปรเจกต์สำเร็จ',
            data: projectData
        });

    } catch (error) {
        console.error('❌ Error in getProjectDetails:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรเจกต์',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            } : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
const getProjectFolders = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        connection = await getConnection();
        // ✅ ขั้นแรก: ดึงโฟลเดอร์ที่ user มี permission หรือเป็น project admin
        const [folders] = await connection.execute(
            `SELECT f.folder_id, f.folder_name, f.parent_folder_id,
                    MAX(CASE
                        WHEN fp.permission_type = 'admin' THEN 3
                        WHEN fp.permission_type = 'write' THEN 2
                        WHEN fp.permission_type = 'read' THEN 1
                        ELSE 0
                    END) as permission_rank
             FROM folders f
             LEFT JOIN folder_permissions fp ON f.folder_id = fp.folder_id AND fp.user_id = ?
             JOIN project_user_roles pur ON f.project_id = pur.project_id
             WHERE f.project_id = ? AND f.active = 1 AND pur.user_id = ?
             GROUP BY f.folder_id, f.folder_name, f.parent_folder_id`,
            [req.user.user_id, id, req.user.user_id]
        );
        const [userRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ? AND project_id = ?',
            [req.user.user_id, id]
        );

        const isAdmin = userRoles.some(row => row.role_id === 1);
        // ✅ สร้าง map เพื่อเช็คว่า folder ใดมี direct access
        const accessibleFolderIds = new Set();
        folders.forEach(folder => {
            if (isAdmin || folder.permission_rank > 0) {
                accessibleFolderIds.add(folder.folder_id);
            }
        });
        // ✅ ขั้นที่สอง: ดึง subfolder ทั้งหมดจากโฟลเดอร์ที่ user สามารถเข้าถึงได้
        const [allFolders] = await connection.execute(
            `SELECT folder_id, folder_name, parent_folder_id
             FROM folders
             WHERE project_id = ? AND active = 1`,
            [id]
        );
        // ✅ ขั้นที่สาม: Filter เพื่อดึงเฉพาะ subfolder ที่เป็น child ของ accessible folder
        const getAccessibleSubfolders = (folderIds) => {
            let changed = true;
            let currentIds = new Set(folderIds);

            // Recursive: ถ้า parent accessible ก็ child ก็ accessible
            while (changed) {
                changed = false;
                allFolders.forEach(folder => {
                    if (!currentIds.has(folder.folder_id) &&
                        folder.parent_folder_id &&
                        currentIds.has(folder.parent_folder_id)) {
                        currentIds.add(folder.folder_id);
                        changed = true;
                    }
                });
            }
            return currentIds;
        };
        const allAccessibleIds = getAccessibleSubfolders(accessibleFolderIds);
        // ✅ ขั้นที่สี่: สร้าง response
        const accessibleFolders = allFolders
            .filter(folder => allAccessibleIds.has(folder.folder_id))
            .map(folder => {
                // หา permission type
                const originalFolder = folders.find(f => f.folder_id === folder.folder_id);
                let permissionType = 'none';

                if (isAdmin) {
                    permissionType = 'admin';
                } else if (originalFolder) {
                    // Folder มี direct permission
                    if (originalFolder.permission_rank === 3) permissionType = 'admin';
                    else if (originalFolder.permission_rank === 2) permissionType = 'write';
                    else if (originalFolder.permission_rank === 1) permissionType = 'read';
                } else {
                    // Subfolder ที่สืบทอด permission จาก parent
                    let parentId = folder.parent_folder_id;
                    let inheritedPermission = 'read'; // default inherited

                    while (parentId) {
                        const parent = folders.find(f => f.folder_id === parentId);
                        if (parent) {
                            if (parent.permission_rank === 3) {
                                inheritedPermission = 'admin';
                                break;
                            } else if (parent.permission_rank === 2) {
                                inheritedPermission = 'write';
                            } else if (parent.permission_rank === 1 && inheritedPermission === 'read') {
                                inheritedPermission = 'read';
                            }
                            parentId = parent.parent_folder_id;
                        } else {
                            break;
                        }
                    }
                    permissionType = inheritedPermission;
                }
                return {
                    folder_id: folder.folder_id,
                    folder_name: folder.folder_name,
                    parent_folder_id: folder.parent_folder_id,
                    permission_type: permissionType
                };
            });
        res.status(200).json({
            message: 'ดึงข้อมูลโฟลเดอร์สำเร็จ',
            data: accessibleFolders
        });

    } catch (error) {
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโฟลเดอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// ✅ ปรับปรุงฟังก์ชันดึงไฟล์ในโฟลเดอร์
const getFolderFiles = async (req, res) => {
    const { id, folderId } = req.params;
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();

        // ✅ ตรวจสอบสิทธิ์แบบ recursive (จะตรวจสอบ parent ด้วย)
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            folderId,
            req.user.user_id
        );

        // ✅ สิทธิ์ read, write, admin สามารถดูไฟล์ได้
        const hasReadAccess = permissionCheck.hasPermission &&
            ['read', 'write', 'admin'].includes(permissionCheck.permissionType);

        if (!hasReadAccess) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงโฟลเดอร์นี้',
                debug: {
                    folderId,
                    userId: req.user.user_id,
                    permissionCheck
                }
            });
        }

        // ดึงไฟล์ในโฟลเดอร์
        const [files] = await connection.execute(
            `SELECT f.file_id, f.folder_id, f.file_name, f.file_path, f.file_type, f.file_size,
                    DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s') as created_at, u.username as uploaded_by
             FROM files f
             JOIN users u ON f.uploaded_by = u.user_id
             WHERE f.folder_id = ? AND f.active = 1
             ORDER BY f.created_at DESC`,
            [folderId]
        );

        res.status(200).json({
            message: 'ดึงข้อมูลไฟล์สำเร็จ',
            data: files.map(file => ({
                file_id: file.file_id,
                folder_id: file.folder_id,
                file_name: file.file_name,
                file_path: file.file_path,
                file_type: file.file_type,
                file_size: file.file_size,
                created_at: file.created_at,
                uploaded_by: file.uploaded_by
            }))
        });
    } catch (error) {
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไฟล์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// ใส่ในไฟล์ DashboardController.js หลังจากฟังก์ชัน checkFolderPermissionRecursive และ findOrCreateSubfolderWithPermission
// ✅ ฟังก์ชันสร้าง version ใหม่สำหรับไฟล์ซ้ำ
const generateVersionedFileName = async (connection, folderId, originalFileName) => {
    // แยกชื่อไฟล์และนามสกุล
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const fileNameWithoutExt = lastDotIndex !== -1
        ? originalFileName.substring(0, lastDotIndex)
        : originalFileName;
    const fileExtension = lastDotIndex !== -1
        ? originalFileName.substring(lastDotIndex)
        : '';

    // ✅ ตรวจสอบว่าชื่อไฟล์มี _vX อยู่แล้วหรือไม่
    const versionMatch = fileNameWithoutExt.match(/^(.+)_v(\d+)$/);
    const baseFileName = versionMatch ? versionMatch[1] : fileNameWithoutExt;

    // ✅ หาไฟล์ทั้งหมดที่มีชื่อฐานเดียวกัน (ทั้งที่มีและไม่มี version)
    const escapedBaseName = baseFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedExtension = fileExtension.replace(/\./g, '\\.');

    const [allRelatedFiles] = await connection.execute(
        `SELECT file_name FROM files
         WHERE folder_id = ?
         AND (
             file_name = ?
             OR file_name REGEXP ?
         )
         AND active = 1`,
        [
            folderId,
            `${baseFileName}${fileExtension}`,
            `^${escapedBaseName}_v[0-9]+${escapedExtension}$`
        ]
    );

    // ✅ ถ้าไม่มีไฟล์ใดๆ เลย ใช้ชื่อเดิม
    if (allRelatedFiles.length === 0) {
        return originalFileName;
    }

    // ✅ หาเลข version สูงสุดจากไฟล์ที่มีอยู่ทั้งหมด
    let maxVersion = 0;
    const versionPattern = new RegExp(
        `^${escapedBaseName}_v(\\d+)${escapedExtension}$`
    );

    allRelatedFiles.forEach(file => {
        const fileName = file.file_name;

        // เช็คไฟล์ที่มี version
        const match = fileName.match(versionPattern);
        if (match) {
            const version = parseInt(match[1]);
            if (version > maxVersion) {
                maxVersion = version;
            }
        }

        // ถ้าเจอไฟล์ฐานที่ไม่มี version ให้ถือว่ามี version 0
        if (fileName === `${baseFileName}${fileExtension}`) {
            if (maxVersion === 0) {
                maxVersion = 0;
            }
        }
    });

    // ✅ สร้างชื่อไฟล์ใหม่ด้วย version ถัดไป
    const newVersion = maxVersion + 1;
    const newFileName = `${baseFileName}_v${newVersion}${fileExtension}`;

    return newFileName;
};
// ✅ แทนที่ฟังก์ชัน uploadFile เดิมทั้งหมดด้วยฟังก์ชันนี้
const uploadFile = async (req, res) => {
    const { id, folderId } = req.params;
    const relativePath = req.query.relativePath;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัพโหลด' });
        }
        connection = await getConnection();
        const [folder] = await connection.execute(
            'SELECT folder_id, project_id FROM folders WHERE folder_id = ? AND project_id = ? AND active = 1',
            [folderId, id]
        );

        if (folder.length === 0) {
            return res.status(404).json({ message: 'ไม่พบโฟลเดอร์หรือโฟลเดอร์ไม่ใช้งาน' });
        }
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            folderId,
            req.user.user_id
        );

        const hasWriteAccess = permissionCheck.hasPermission &&
            ['write', 'admin'].includes(permissionCheck.permissionType);

        if (!hasWriteAccess) {
            console.warn(`⚠️ 403 Forbidden upload: User ${req.user.user_id} -> Folder ${folderId}`);
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้',
                debug: {
                    folderId,
                    userId: req.user.user_id,
                    project_id: folder[0].project_id,
                    permissionCheck
                }
            });
        }
        const { originalname, size, filename } = req.file;
        const fileExtension = originalname.split('.').pop().toLowerCase();
        const fileName = Buffer.from(originalname, 'latin1').toString('utf8');
        let finalFilePath;
        let targetFolderId = folderId;
        let displayFileName = fileName;
        if (relativePath && relativePath.trim() !== '') {

            targetFolderId = await findOrCreateSubfolderWithPermission(
                connection,
                folderId,
                relativePath,
                id,
                req.user.user_id
            );

            const pathParts = relativePath.split('/').filter(Boolean);
            displayFileName = pathParts[pathParts.length - 1];

            const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folderId}`);
            const subfolderPath = pathParts.slice(0, -1).join('/');
            const subfolderDir = subfolderPath ? path.join(uploadDir, subfolderPath) : uploadDir;

            try {
                await fs.mkdir(subfolderDir, { recursive: true });
                await fs.chmod(subfolderDir, 0o755);
            } catch (err) {
                console.error('❌ Failed to create subfolder:', err);
            }

            const currentPath = req.file.path;
            const newPath = path.join(subfolderDir, filename);

            try {
                await fs.rename(currentPath, newPath);
            } catch (err) {
                console.error('❌ Failed to move file:', err);
                return res.status(500).json({
                    message: 'ไม่สามารถย้ายไฟล์ไปยังโฟลเดอร์ย่อยได้'
                });
            }

            finalFilePath = subfolderPath
                ? `/Uploads/folder_${folderId}/${subfolderPath}/${filename}`
                : `/Uploads/folder_${folderId}/${filename}`;
        } else {

            displayFileName = fileName;
            targetFolderId = folderId;

            const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folderId}`);

            try {
                await fs.mkdir(uploadDir, { recursive: true });
                await fs.chmod(uploadDir, 0o755);
            } catch (err) {
                console.error('❌ Failed to create upload dir:', err);
            }
            const currentPath = req.file.path;
            const newPath = path.join(uploadDir, filename);
            try {
                await fs.rename(currentPath, newPath);
            } catch (err) {
                console.error('❌ Failed to move file:', err);
                return res.status(500).json({
                    message: 'ไม่สามารถย้ายไฟล์ได้',
                    error: err.message
                });
            }
            finalFilePath = `/Uploads/folder_${folderId}/${filename}`;
        }
        // ✅ ตรวจสอบและสร้าง version ใหม่ถ้าไฟล์ซ้ำ
        const versionedFileName = await generateVersionedFileName(
            connection,
            targetFolderId,
            displayFileName
        );

        let isNewVersion = false;
        if (versionedFileName !== displayFileName) {
            isNewVersion = true;
        }
        const [result] = await connection.execute(
            `INSERT INTO files (folder_id, file_name, file_path, file_type, file_size, uploaded_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [targetFolderId, versionedFileName, finalFilePath, fileExtension, size, req.user.user_id]
        );
        // ✅ เพิ่ม WebSocket emit สำหรับ upload activity
        try {
            await statusController.recordUploadActivity(result.insertId);
        } catch (activityError) {
            console.error('⚠️ Failed to emit upload activity:', activityError);
        }
        res.status(201).json({
            message: isNewVersion
                ? `อัพโหลดไฟล์สำเร็จ (สร้าง version ใหม่: ${versionedFileName})`
                : 'อัพโหลดไฟล์สำเร็จ',
            isNewVersion,
            originalFileName: displayFileName,
            data: {
                file_id: result.insertId,
                folder_id: targetFolderId,
                file_name: versionedFileName,
                file_path: finalFilePath,
                file_type: fileExtension,
                file_size: size,
                created_at: new Date().toISOString(),
                uploaded_by: req.user.username
            }
        });

    } catch (error) {
        console.error('❌ Upload file error:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
const downloadProjectFile = async (req, res) => {
    const { id, fileId } = req.params;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        connection = await getConnection();
        // ดึงข้อมูลไฟล์
        const [files] = await connection.execute(
            `SELECT f.file_id, f.file_name, f.file_path, f.file_type, f.folder_id
             FROM files f
             WHERE f.file_id = ? AND f.active = 1`,
            [fileId]
        );
        if (files.length === 0) {
            return res.status(404).json({ message: 'ไม่พบไฟล์ที่ระบุ' });
        }
        const file = files[0];
        // ✅ ตรวจสอบสิทธิ์แบบ recursive (จะตรวจสอบ parent ด้วย)
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            file.folder_id,
            req.user.user_id
        );
        // ✅ สิทธิ์ read, write, admin สามารถดาวน์โหลดได้
        const hasReadAccess = permissionCheck.hasPermission &&
            ['read', 'write', 'admin'].includes(permissionCheck.permissionType);
        if (!hasReadAccess) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์นี้',
                debug: {
                    fileId,
                    folderId: file.folder_id,
                    userId: req.user.user_id,
                    permissionCheck
                }
            });
        }
        // บันทึกประวัติดาวน์โหลด
        try {
            await connection.execute(
                `INSERT INTO file_downloads (file_id, user_id, downloaded_at)
                 VALUES (?, ?, NOW())`,
                [fileId, req.user.user_id]
            );
            // ✅ เพิ่ม WebSocket emit สำหรับ download activity
            await statusController.recordDownloadActivity(fileId, req.user.user_id);
        } catch (err) {
            console.error('⚠️ Could not log download history or emit activity:', err.message);
        }
        // ค้นหาไฟล์ในระบบ
        const possiblePaths = [
            path.join(__dirname, '..', file.file_path),
            path.join(__dirname, '..', '..', file.file_path),
            path.join(__dirname, '..', file.file_path.replace(/^\//, '')),
            path.join(__dirname, '..', '..', file.file_path.replace(/^\//, ''))
        ];
        let foundPath = null;
        for (const tryPath of possiblePaths) {
            try {
                await fs.access(tryPath);
                foundPath = tryPath;
                break;
            } catch (err) {
                // Continue searching
            }
        }
        if (!foundPath) {
            console.error(`❌ File not found on disk: ${file.file_name} (Expected at: ${possiblePaths[0]})`);
            return res.status(404).json({
                message: `ไม่พบไฟล์ในระบบจัดเก็บ: ${file.file_name}`,
                details: 'ไฟล์อาจถูกลบ ย้าย หรือยังไม่ได้อัพโหลดเข้าเซิร์ฟเวอร์โดยสมบูรณ์',
                debug: {
                    fileId,
                    dbPath: file.file_path,
                    checkedPaths: possiblePaths
                }
            });
        }
        // ส่งไฟล์กลับไป
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`
        );

        res.download(foundPath, file.file_name, (err) => {
            if (err) {
                if (!res.headersSent) {
                    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งไฟล์' });
                }
            }
        });
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    } finally {
        if (connection) connection.release();
    }
};
const getProjectUsers = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        connection = await getConnection();
        const [userRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ? AND project_id = ?',
            [req.user.user_id, id]
        );
        const isAdmin = userRoles.some(row => row.role_id === 1);
        if (!isAdmin && userRoles.length === 0) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้ในโปรเจกต์นี้' });
        }
        const [users] = await connection.execute(
            `SELECT u.user_id, u.username, u.email, u.first_name
             FROM users u
             JOIN project_user_roles pur ON u.user_id = pur.user_id
             WHERE pur.project_id = ? AND u.active = 1`,
            [id]
        );
        res.status(200).json({
            message: 'ดึงข้อมูลผู้ใช้ในโปรเจกต์สำเร็จ',
            data: users.map(user => ({
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                first_name: user.first_name
            }))
        });
    } catch (error) {
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
const saveMetadata = async (req, res) => {
    const { id, folderId } = req.params;
    const { folders, project_id } = req.body;
    let connection;

    try {
        if (!req.user?.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
        }
        if (!folders || !Array.isArray(folders) || folders.length === 0) {
            return res.status(400).json({
                message: 'ไม่มีข้อมูลโฟลเดอร์หรือรูปแบบไม่ถูกต้อง',
                received: { folders, type: typeof folders }
            });
        }
        connection = await getConnection();

        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            folderId,
            req.user.user_id
        );

        const hasWriteAccess = permissionCheck.hasPermission &&
            ['write', 'admin'].includes(permissionCheck.permissionType);
        if (!hasWriteAccess) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในโฟลเดอร์นี้',
                debug: {
                    folderId,
                    userId: req.user.user_id,
                    permissionCheck
                }
            });
        }
        await connection.beginTransaction();
        const createdFolders = [];

        const baseUploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folderId}`);
        try {
            await fs.access(baseUploadDir);
        } catch (err) {
            await fs.mkdir(baseUploadDir, { recursive: true });
            await fs.chmod(baseUploadDir, 0o755);
        }

        for (const folderPath of folders) {
            if (!folderPath || folderPath.trim() === '') continue;

            const pathParts = folderPath.split('/').filter(Boolean);
            let currentParentId = parseInt(folderId);
            let currentPhysicalPath = baseUploadDir;

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];

                const [existing] = await connection.execute(
                    `SELECT folder_id FROM folders
                     WHERE folder_name = ?
                     AND parent_folder_id = ?
                     AND project_id = ?
                     AND active = 1`,
                    [part, currentParentId, id]
                );
                if (existing.length > 0) {
                    currentParentId = existing[0].folder_id;
                } else {
                    const [result] = await connection.execute(
                        `INSERT INTO folders
                         (project_id, folder_name, parent_folder_id, created_by, active, created_at)
                         VALUES (?, ?, ?, ?, 1, NOW())`,
                        [id, part, currentParentId, req.user.user_id]
                    );

                    createdFolders.push({
                        folder_id: result.insertId,
                        folder_name: part,
                        parent_folder_id: currentParentId,
                        full_path: pathParts.slice(0, i + 1).join('/')
                    });

                    currentParentId = result.insertId;
                }

                currentPhysicalPath = path.join(currentPhysicalPath, part);

                try {
                    await fs.access(currentPhysicalPath);
                } catch (err) {
                    await fs.mkdir(currentPhysicalPath, { recursive: true });
                    await fs.chmod(currentPhysicalPath, 0o755);
                }
            }
        }
        await connection.commit();

        res.json({
            message: 'บันทึกโครงสร้างโฟลเดอร์สำเร็จ',
            created: createdFolders.length,
            folders: createdFolders
        });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({
            message: 'เกิดข้อผิดพลาด',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
const deleteFolder = async (req, res) => {
    const { id, folderId } = req.params;
    const { force } = req.query;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        connection = await getConnection();
        // ✅ ดึงข้อมูลโฟลเดอร์ที่จะลบ
        const [folders] = await connection.execute(
            `SELECT folder_id, folder_name, parent_folder_id, project_id, created_by
             FROM folders
             WHERE folder_id = ? AND project_id = ? AND active = 1`,
            [folderId, id]
        );
        if (folders.length === 0) {
            return res.status(404).json({ message: 'ไม่พบโฟลเดอร์ที่ระบุ' });
        }
        const folder = folders[0];
        // ✅ 1. ห้ามลบ root folder Design
        if (folder.folder_name === 'Design' && !folder.parent_folder_id) {
            return res.status(403).json({ message: 'ไม่สามารถลบโฟลเดอร์ Design หลักได้' });
        }
        // ✅ 2. ตรวจสอบสิทธิ์
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            folderId,
            req.user.user_id
        );
        const hasDeletePermission = permissionCheck.hasPermission &&
            ['write', 'admin'].includes(permissionCheck.permissionType);
        if (!hasDeletePermission) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบโฟลเดอร์นี้' });
        }
        // ✅ 3. ตรวจสอบว่ามี subfolder หรือไม่ (สำคัญมาก!)

        const [subfolders] = await connection.execute(
            `SELECT folder_id, folder_name, active
             FROM folders
             WHERE parent_folder_id = ?
             ORDER BY active DESC, folder_name`,
            [folderId]
        );
        // กรองเฉพาะ active subfolders
        const activeSubfolders = subfolders.filter(s => s.active === 1);
        if (activeSubfolders.length > 0) {
            const subfolderNames = activeSubfolders.map(s => s.folder_name).join(', ');

            return res.status(400).json({
                message: `ไม่สามารถลบโฟลเดอร์ที่มีโฟลเดอร์ย่อยได้`,
                detail: `กรุณาลบโฟลเดอร์ย่อยเหล่านี้ก่อน: ${subfolderNames}`,
                subfolderCount: activeSubfolders.length,
                subfolders: activeSubfolders.map(s => s.folder_name)
            });
        }
        // ✅ 4. ตรวจสอบว่ามีไฟล์หรือไม่
        const [files] = await connection.execute(
            'SELECT file_id, file_name, file_path FROM files WHERE folder_id = ? AND active = 1',
            [folderId]
        );
        if (files.length > 0 && force !== 'true') {
            const fileCount = files.length;
            return res.status(400).json({
                message: `โฟลเดอร์นี้มีไฟล์อยู่ ${fileCount} ไฟล์`,
                fileCount: fileCount,
                needsConfirmation: true
            });
        }
        // ✅ 5. เริ่มลบโฟลเดอร์
        await connection.beginTransaction();
        // ✅ ถ้ามีไฟล์และ force=true ให้ลบไฟล์ก่อน
        if (files.length > 0 && force === 'true') {

            await connection.execute(
                'UPDATE files SET active = 0, updated_at = NOW() WHERE folder_id = ?',
                [folderId]
            );

            const deletedDir = path.join(__dirname, '..', 'Uploads', 'deleted');
            await fs.mkdir(deletedDir, { recursive: true });

            for (const file of files) {
                try {
                    const possiblePaths = [
                        path.join(__dirname, '..', file.file_path),
                        path.join(__dirname, '..', '..', file.file_path)
                    ];

                    let foundPath = null;
                    for (const tryPath of possiblePaths) {
                        try {
                            await fs.access(tryPath);
                            foundPath = tryPath;
                            break;
                        } catch (err) {
                            continue;
                        }
                    }

                    if (foundPath) {
                        const deletedPath = path.join(deletedDir, path.basename(foundPath));
                        await fs.rename(foundPath, deletedPath);
                    }
                } catch (err) {
                }
            }
        }
        // ✅ ลบโฟลเดอร์ (soft delete)
        await connection.execute(
            'UPDATE folders SET active = 0, updated_at = NOW() WHERE folder_id = ?',
            [folderId]
        );
        // ✅ ลบ permissions ของโฟลเดอร์
        await connection.execute(
            'DELETE FROM folder_permissions WHERE folder_id = ?',
            [folderId]
        );
        await connection.commit();
        res.status(200).json({
            message: 'ลบโลเดอร์สำเร็จ',
            folder_id: folderId,
            folder_name: folder.folder_name,
            deleted_files: files.length
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Delete folder error:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการลบโฟลเดอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
const deleteFile = async (req, res) => {
    const { id, fileId } = req.params;
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        connection = await getConnection();

        // ✅ ปรับ query เพื่อดึง project_id สำหรับ WebSocket emit
        const [files] = await connection.execute(
            `SELECT f.file_id, f.folder_id, f.file_name, f.file_path, f.uploaded_by, f.file_type, f.file_size,
                    fo.folder_name, pr.project_id, pr.project_name, u.first_name, u.last_name, u.profile_image
             FROM files f
             INNER JOIN folders fo ON f.folder_id = fo.folder_id
             INNER JOIN projects pr ON fo.project_id = pr.project_id
             INNER JOIN users u ON f.uploaded_by = u.user_id
             WHERE f.file_id = ? AND f.active = 1`,
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({ message: 'ไม่พบไฟล์ที่ระบุ' });
        }

        const file = files[0];

        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            file.folder_id,
            req.user.user_id
        );

        const isUploader = file.uploaded_by === req.user.user_id;
        const hasAdminPermission = permissionCheck.hasPermission &&
            permissionCheck.permissionType === 'admin';

        if (!isUploader && !hasAdminPermission) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ลบไฟล์นี้',
                debug: {
                    isUploader,
                    hasAdminPermission,
                    permissionCheck
                }
            });
        }

        await connection.execute(
            `UPDATE files SET active = 0, updated_at = NOW() WHERE file_id = ?`,
            [fileId]
        );

        const filePath = path.join(__dirname, '..', file.file_path);
        try {
            await fs.access(filePath);
            const deletedDir = path.join(__dirname, '..', 'Uploads', 'deleted');
            await fs.mkdir(deletedDir, { recursive: true });
            const deletedPath = path.join(deletedDir, path.basename(filePath));
            await fs.rename(filePath, deletedPath);
        } catch (err) {
        }
        // ✅ เพิ่ม WebSocket emit สำหรับ delete activity
        // ✅ โค้ดใหม่ (ถูกต้อง - ดึงข้อมูลผู้ใช้ที่กำลังลบ)
        try {
            // ✅ ดึงข้อมูลผู้ใช้ที่กำลังลบไฟล์จาก database
            const [currentUser] = await connection.execute(
                `SELECT user_id, first_name, last_name, profile_image, username
         FROM users
         WHERE user_id = ?`,
                [req.user.user_id]
            );
            const deleter = currentUser[0] || {};
            statusController.emitFileActivity(file.project_id, {
                activity_type: 'delete',
                file_id: file.file_id,
                file_name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                file_size_mb: (file.file_size / (1024 * 1024)).toFixed(2),
                activity_time: new Date(),
                user_id: req.user.user_id,
                first_name: deleter.first_name || 'ไม่ระบุ', // ✅ ใช้ข้อมูลจาก DB
                last_name: deleter.last_name || '', // ✅ ใช้ข้อมูลจาก DB
                profile_image: deleter.profile_image || null, // ✅ ใช้ข้อมูลจาก DB
                username: deleter.username || 'Unknown', // ✅ เพิ่ม username ด้วย
                folder_name: file.folder_name,
                project_name: file.project_name
            });
        } catch (activityError) {
            console.error('⚠️ Failed to emit delete activity:', activityError);
        }
        res.status(200).json({
            message: 'ลบไฟล์สำเร็จ',
            file_id: fileId
        });
    } catch (error) {
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการลบไฟล์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// เพิ่มฟังก์ชันนี้ใน DashboardController.js
const createFolder = async (req, res) => {
    const { id } = req.params; // project_id
    const { folder_name, parent_folder_id } = req.body;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        if (!folder_name || folder_name.trim() === '') {
            return res.status(400).json({ message: 'กรุณาระบุชื่อโฟลเดอร์' });
        }
        if (!parent_folder_id) {
            return res.status(400).json({ message: 'กรุณาระบุ parent folder' });
        }
        connection = await getConnection();
        // ✅ ตรวจสอบว่า parent folder มีอยู่จริง
        const [parentFolders] = await connection.execute(
            'SELECT folder_id, project_id FROM folders WHERE folder_id = ? AND project_id = ? AND active = 1',
            [parent_folder_id, id]
        );
        if (parentFolders.length === 0) {
            return res.status(404).json({ message: 'ไม่พบ parent folder ที่ระบุ' });
        }
        // ✅ ตรวจสอบสิทธิ์ว่าสามารถสร้างโฟลเดอร์ได้หรือไม่
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            parent_folder_id,
            req.user.user_id
        );
        const hasWriteAccess = permissionCheck.hasPermission &&
            ['write', 'admin'].includes(permissionCheck.permissionType);
        if (!hasWriteAccess) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในตำแหน่งนี้',
                debug: {
                    parent_folder_id,
                    userId: req.user.user_id,
                    permissionCheck
                }
            });
        }
        // ✅ ตรวจสอบว่าชื่อโฟลเดอร์ซ้ำหรือไม่
        const [existingFolders] = await connection.execute(
            `SELECT folder_id FROM folders
             WHERE folder_name = ?
             AND parent_folder_id = ?
             AND project_id = ?
             AND active = 1`,
            [folder_name.trim(), parent_folder_id, id]
        );
        if (existingFolders.length > 0) {
            return res.status(400).json({
                message: 'มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้'
            });
        }
        // ✅ สร้างโฟลเดอร์ใหม่
        const [result] = await connection.execute(
            `INSERT INTO folders
             (project_id, folder_name, parent_folder_id, created_by, active, created_at)
             VALUES (?, ?, ?, ?, 1, NOW())`,
            [id, folder_name.trim(), parent_folder_id, req.user.user_id]
        );
        const newFolderId = result.insertId;
        // ✅ เพิ่ม permission ให้โฟลเดอร์ใหม่ (สืบทอดจาก parent)
        const parentPermission = permissionCheck.permissionType;

        try {
            await connection.execute(
                `INSERT INTO folder_permissions (folder_id, user_id, permission_type, created_at)
                 VALUES (?, ?, ?, NOW())`,
                [newFolderId, req.user.user_id, parentPermission]
            );
        } catch (permError) {
            console.error('⚠️ Failed to add permission:', permError.message);
        }
        // ✅ สร้างโฟลเดอร์จริงในระบบไฟล์
        const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${parent_folder_id}`, folder_name.trim());

        try {
            await fs.mkdir(uploadDir, { recursive: true });
            await fs.chmod(uploadDir, 0o755);
        } catch (err) {
            console.error('⚠️ Failed to create physical folder:', err.message);
        }
        // ✅ ส่งข้อมูลโฟลเดอร์ใหม่กลับไป
        res.status(201).json({
            message: 'สร้างโฟลเดอร์สำเร็จ',
            data: {
                folder_id: newFolderId,
                folder_name: folder_name.trim(),
                parent_folder_id: parent_folder_id,
                project_id: id,
                permission_type: parentPermission,
                created_by: req.user.user_id,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Create folder error:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// เพิ่มฟังก์ชันนี้ใน DashboardController.js
const renameFile = async (req, res) => {
    const { id, fileId } = req.params;
    const { new_name } = req.body;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        if (!new_name || new_name.trim() === '') {
            return res.status(400).json({ message: 'กรุณาระบุชื่อไฟล์ใหม่' });
        }
        connection = await getConnection();
        // ✅ ดึงข้อมูลไฟล์
        const [files] = await connection.execute(
            `SELECT f.file_id, f.folder_id, f.file_name, f.file_path, f.uploaded_by
             FROM files f
             WHERE f.file_id = ? AND f.active = 1`,
            [fileId]
        );
        if (files.length === 0) {
            return res.status(404).json({ message: 'ไม่พบไฟล์ที่ระบุ' });
        }
        const file = files[0];
        // ✅ ตรวจสอบสิทธิ์
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            file.folder_id,
            req.user.user_id
        );
        const isUploader = file.uploaded_by === req.user.user_id;
        const hasAdminPermission = permissionCheck.hasPermission &&
            permissionCheck.permissionType === 'admin';
        if (!isUploader && !hasAdminPermission) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์แก้ไขชื่อไฟล์นี้'
            });
        }
        // ✅ ตรวจสอบว่าชื่อไฟล์ใหม่ซ้ำหรือไม่
        const [existingFiles] = await connection.execute(
            `SELECT file_id FROM files
             WHERE folder_id = ?
             AND file_name = ?
             AND file_id != ?
             AND active = 1`,
            [file.folder_id, new_name.trim(), fileId]
        );
        if (existingFiles.length > 0) {
            return res.status(400).json({
                message: 'มีไฟล์ชื่อนี้อยู่แล้วในโฟลเดอร์นี้'
            });
        }
        // ✅ อัพเดทชื่อไฟล์ใน database
        await connection.execute(
            `UPDATE files
             SET file_name = ?, updated_at = NOW()
             WHERE file_id = ?`,
            [new_name.trim(), fileId]
        );
        res.status(200).json({
            message: 'เปลี่ยนชื่อไฟล์สำเร็จ',
            data: {
                file_id: fileId,
                old_name: file.file_name,
                new_name: new_name.trim(),
                folder_id: file.folder_id
            }
        });
    } catch (error) {
        console.error('❌ Rename file error:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อไฟล์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// เพิ่มฟังก์ชันนี้ใน DashboardController.js หลังจากฟังก์ชัน renameFile
const renameFolder = async (req, res) => {
    const { id, folderId } = req.params;
    const { new_name } = req.body;
    let connection;

    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }
        if (!new_name || new_name.trim() === '') {
            return res.status(400).json({ message: 'กรุณาระบุชื่อโฟลเดอร์ใหม่' });
        }
        connection = await getConnection();
        // ✅ ดึงข้อมูลโฟลเดอร์
        const [folders] = await connection.execute(
            `SELECT folder_id, folder_name, parent_folder_id, project_id
             FROM folders
             WHERE folder_id = ? AND project_id = ? AND active = 1`,
            [folderId, id]
        );
        if (folders.length === 0) {
            return res.status(404).json({ message: 'ไม่พบโฟลเดอร์ที่ระบุ' });
        }
        const folder = folders[0];
        // ✅ 1. ห้ามเปลี่ยนชื่อ root folder Design
        if (folder.folder_name === 'Design' && !folder.parent_folder_id) {
            return res.status(403).json({
                message: 'ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ Design หลักได้'
            });
        }
        // ✅ 2. ห้ามเปลี่ยนชื่อโฟลเดอร์ลูกโดยตรงของ Design (Drawings, Documents, etc.)
        if (folder.parent_folder_id) {
            const [parentFolder] = await connection.execute(
                'SELECT folder_name, parent_folder_id FROM folders WHERE folder_id = ? AND active = 1',
                [folder.parent_folder_id]
            );

            if (parentFolder.length > 0 &&
                parentFolder[0].folder_name === 'Design' &&
                !parentFolder[0].parent_folder_id) {
                return res.status(403).json({
                    message: 'ไม่สามารถเปลี่ยนชื่อโฟลเดอร์หลักย่อยของ Design ได้ (เช่น Drawings, Documents)'
                });
            }
        }
        // ✅ 3. ตรวจสอบสิทธิ์
        const permissionCheck = await checkFolderPermissionRecursive(
            connection,
            folderId,
            req.user.user_id
        );
        const hasWriteAccess = permissionCheck.hasPermission &&
            ['write', 'admin'].includes(permissionCheck.permissionType);
        if (!hasWriteAccess) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เปลี่ยนชื่อโฟลเดอร์นี้',
                debug: {
                    folderId,
                    userId: req.user.user_id,
                    permissionCheck
                }
            });
        }
        // ✅ 4. ตรวจสอบว่าชื่อโฟลเดอร์ใหม่ซ้ำหรือไม่
        const [existingFolders] = await connection.execute(
            `SELECT folder_id FROM folders
             WHERE folder_name = ?
             AND parent_folder_id = ?
             AND project_id = ?
             AND folder_id != ?
             AND active = 1`,
            [new_name.trim(), folder.parent_folder_id, id, folderId]
        );
        if (existingFolders.length > 0) {
            return res.status(400).json({
                message: 'มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้'
            });
        }
        // ✅ 5. อัพเดทชื่อโฟลเดอร์ใน database
        await connection.execute(
            `UPDATE folders
             SET folder_name = ?, updated_at = NOW()
             WHERE folder_id = ?`,
            [new_name.trim(), folderId]
        );
        // ✅ 6. เปลี่ยนชื่อโฟลเดอร์จริงในระบบไฟล์ (optional)
        if (folder.parent_folder_id) {
            try {
                const oldPath = path.join(__dirname, '..', 'Uploads', `folder_${folder.parent_folder_id}`, folder.folder_name);
                const newPath = path.join(__dirname, '..', 'Uploads', `folder_${folder.parent_folder_id}`, new_name.trim());

                await fs.access(oldPath);
                await fs.rename(oldPath, newPath);
            } catch (err) {
                console.log('⚠️ Could not rename physical folder:', err.message);
            }
        }
        res.status(200).json({
            message: 'เปลี่ยนชื่อโฟลเดอร์สำเร็จ',
            data: {
                folder_id: folderId,
                old_name: folder.folder_name,
                new_name: new_name.trim(),
                parent_folder_id: folder.parent_folder_id
            }
        });
    } catch (error) {
        console.error('❌ Rename folder error:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อโฟลเดอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};
// ✅ อัพเดท module.exports ให้รวม renameFolder
module.exports = {
    getProjectDetails,
    getProjectFolders,
    getFolderFiles,
    uploadFile,
    downloadProjectFile,
    deleteFile,
    getProjectUsers,
    saveMetadata,
    deleteFolder,
    generateVersionedFileName,
    createFolder,
    renameFile,
    renameFolder // ← เพิ่มฟังก์ชันนี้
};