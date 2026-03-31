// controllers/companyController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * ดึงรายการบริษัทของ user ปัจจุบัน
 * Super Admin (role_id=1) เห็นทุกบริษัท
 */
const getUserCompanies = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();

        // เช็คว่าเป็น Super Admin ไหม
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isSuperAdmin = globalRoles.length > 0 || 
                             req.user.username === 'admin' || 
                             req.user.username === 'adminspk';

        let companies;
        if (isSuperAdmin) {
            // Super Admin เห็นทุกบริษัท
            [companies] = await connection.execute(`
                SELECT c.*, 
                       cu.role as user_role,
                       (SELECT COUNT(*) FROM projects p WHERE p.company_id = c.company_id AND p.active = 1) as project_count,
                       (SELECT COUNT(*) FROM company_users cu2 WHERE cu2.company_id = c.company_id AND cu2.active = 1) as member_count
                FROM companies c
                LEFT JOIN company_users cu ON c.company_id = cu.company_id AND cu.user_id = ?
                WHERE c.active = 1
                ORDER BY c.created_at ASC
            `, [req.user.user_id]);
        } else {
            // User ปกติ เห็นเฉพาะบริษัทที่อยู่
            [companies] = await connection.execute(`
                SELECT c.*, 
                       cu.role as user_role,
                       (SELECT COUNT(*) FROM projects p WHERE p.company_id = c.company_id AND p.active = 1) as project_count,
                       (SELECT COUNT(*) FROM company_users cu2 WHERE cu2.company_id = c.company_id AND cu2.active = 1) as member_count
                FROM companies c
                INNER JOIN company_users cu ON c.company_id = cu.company_id AND cu.user_id = ? AND cu.active = 1
                WHERE c.active = 1
                ORDER BY c.created_at ASC
            `, [req.user.user_id]);
        }

        res.json({ companies, isSuperAdmin });
    } catch (error) {
        console.error('Error in getUserCompanies:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * ดึงข้อมูลบริษัทเดียว
 */
const getCompanyById = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM projects p WHERE p.company_id = c.company_id AND p.active = 1) as project_count,
                   (SELECT COUNT(*) FROM company_users cu WHERE cu.company_id = c.company_id AND cu.active = 1) as member_count
            FROM companies c
            WHERE c.company_id = ? AND c.active = 1
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบบริษัท' });
        }

        // ดึง members
        const [members] = await connection.execute(`
            SELECT u.user_id, u.username, u.first_name, u.last_name, u.email, u.profile_image,
                   cu.role, cu.joined_at
            FROM company_users cu
            JOIN users u ON cu.user_id = u.user_id
            WHERE cu.company_id = ? AND cu.active = 1 AND u.active = 1
            ORDER BY cu.role ASC, u.first_name ASC
        `, [req.params.id]);

        res.json({ company: rows[0], members });
    } catch (error) {
        console.error('Error in getCompanyById:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * สร้างบริษัทใหม่ (Admin Only)
 */
const createCompany = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();

        // ตรวจสอบสิทธิ์ Admin
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isAdmin = globalRoles.length > 0 || 
                        req.user.username === 'admin' || 
                        req.user.username === 'adminspk';

        if (!isAdmin) {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างบริษัทได้' });
        }

        const { company_name, company_subtitle, company_color, template_company_id } = req.body;
        const logoFile = req.file;

        if (!company_name) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อบริษัท' });
        }

        const companyId = uuidv4();

        // อัปโหลดโลโก้
        let logoPath = null;
        if (logoFile) {
            const uploadDir = path.join(__dirname, '../Uploads/companies');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const fileName = `logo-${companyId}-${Date.now()}${path.extname(logoFile.originalname)}`;
            const uploadPath = path.join(uploadDir, fileName);
            fs.writeFileSync(uploadPath, logoFile.buffer);
            logoPath = `Uploads/companies/${fileName}`;
        }

        await connection.beginTransaction();

        await connection.execute(`
            INSERT INTO companies (company_id, company_name, company_logo, company_subtitle, company_color, owner_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            companyId,
            company_name,
            logoPath,
            company_subtitle || 'บริหารโครงการก่อสร้าง',
            company_color || '#dc2626',
            req.user.user_id
        ]);

        // เพิ่มผู้สร้างเป็น owner
        await connection.execute(
            'INSERT INTO company_users (company_id, user_id, role) VALUES (?, ?, ?)',
            [companyId, req.user.user_id, 'owner']
        );

        // ถ้ามี template → clone roles structure
        if (template_company_id) {
            console.log(`📋 Cloning template from company: ${template_company_id}`);
            // Template cloning จะทำใน Phase 4
        }

        await connection.commit();

        res.json({
            message: 'สร้างบริษัทสำเร็จ',
            company: {
                company_id: companyId,
                company_name,
                company_logo: logoPath,
                company_subtitle: company_subtitle || 'บริหารโครงการก่อสร้าง',
                company_color: company_color || '#dc2626'
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in createCompany:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * แก้ไขบริษัท (Owner/Admin)
 */
const updateCompany = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        const { id } = req.params;
        const { company_name, company_subtitle, company_color } = req.body;
        const logoFile = req.file;

        connection = await getConnection();

        // ตรวจสอบสิทธิ์
        const [companyUser] = await connection.execute(
            'SELECT role FROM company_users WHERE company_id = ? AND user_id = ? AND active = 1',
            [id, req.user.user_id]
        );
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isSuperAdmin = globalRoles.length > 0 || req.user.username === 'admin' || req.user.username === 'adminspk';
        const isCompanyAdmin = companyUser.length > 0 && ['owner', 'admin'].includes(companyUser[0].role);

        if (!isSuperAdmin && !isCompanyAdmin) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลบริษัทนี้' });
        }

        // อัปโหลดโลโก้ใหม่
        let logoPath = undefined;
        if (logoFile) {
            const uploadDir = path.join(__dirname, '../Uploads/companies');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const fileName = `logo-${id}-${Date.now()}${path.extname(logoFile.originalname)}`;
            const uploadPath = path.join(uploadDir, fileName);
            fs.writeFileSync(uploadPath, logoFile.buffer);
            logoPath = `Uploads/companies/${fileName}`;
        }

        const fields = [];
        const values = [];

        if (company_name !== undefined) { fields.push('company_name = ?'); values.push(company_name); }
        if (company_subtitle !== undefined) { fields.push('company_subtitle = ?'); values.push(company_subtitle); }
        if (company_color !== undefined) { fields.push('company_color = ?'); values.push(company_color); }
        if (logoPath !== undefined) { fields.push('company_logo = ?'); values.push(logoPath); }

        if (fields.length > 0) {
            values.push(id);
            await connection.execute(
                `UPDATE companies SET ${fields.join(', ')}, updated_at = NOW() WHERE company_id = ?`,
                values
            );
        }

        res.json({ message: 'แก้ไขบริษัทสำเร็จ' });
    } catch (error) {
        console.error('Error in updateCompany:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * เพิ่ม user เข้าบริษัท
 */
const addUserToCompany = async (req, res) => {
    let connection;
    try {
        const { id } = req.params; // company_id
        const { user_id, role = 'member' } = req.body;

        if (!user_id) {
            return res.status(400).json({ message: 'กรุณาระบุ user_id' });
        }

        connection = await getConnection();

        // ตรวจสอบสิทธิ์
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isSuperAdmin = globalRoles.length > 0 || req.user.username === 'admin' || req.user.username === 'adminspk';

        const [companyUser] = await connection.execute(
            'SELECT role FROM company_users WHERE company_id = ? AND user_id = ? AND active = 1',
            [id, req.user.user_id]
        );
        const isCompanyAdmin = companyUser.length > 0 && ['owner', 'admin'].includes(companyUser[0].role);

        if (!isSuperAdmin && !isCompanyAdmin) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เพิ่มสมาชิกบริษัทนี้' });
        }

        // ตรวจว่า user มีอยู่จริง
        const [userRows] = await connection.execute(
            'SELECT user_id FROM users WHERE user_id = ? AND active = 1',
            [user_id]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        // เพิ่มหรือ reactivate
        const [existing] = await connection.execute(
            'SELECT id, active FROM company_users WHERE company_id = ? AND user_id = ?',
            [id, user_id]
        );

        if (existing.length > 0) {
            if (existing[0].active) {
                return res.status(400).json({ message: 'ผู้ใช้นี้อยู่ในบริษัทแล้ว' });
            }
            // Reactivate
            await connection.execute(
                'UPDATE company_users SET active = 1, role = ?, joined_at = NOW() WHERE company_id = ? AND user_id = ?',
                [role, id, user_id]
            );
        } else {
            await connection.execute(
                'INSERT INTO company_users (company_id, user_id, role) VALUES (?, ?, ?)',
                [id, user_id, role]
            );
        }

        res.json({ message: 'เพิ่มสมาชิกเข้าบริษัทสำเร็จ' });
    } catch (error) {
        console.error('Error in addUserToCompany:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * ลบ user ออกจากบริษัท
 */
const removeUserFromCompany = async (req, res) => {
    let connection;
    try {
        const { id, userId } = req.params; // company_id, user_id

        connection = await getConnection();

        // ตรวจสอบสิทธิ์
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isSuperAdmin = globalRoles.length > 0 || req.user.username === 'admin' || req.user.username === 'adminspk';

        const [companyUser] = await connection.execute(
            'SELECT role FROM company_users WHERE company_id = ? AND user_id = ? AND active = 1',
            [id, req.user.user_id]
        );
        const isCompanyAdmin = companyUser.length > 0 && ['owner', 'admin'].includes(companyUser[0].role);

        if (!isSuperAdmin && !isCompanyAdmin) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบสมาชิกบริษัทนี้' });
        }

        // ไม่ให้ลบ owner
        const [targetUser] = await connection.execute(
            'SELECT role FROM company_users WHERE company_id = ? AND user_id = ? AND active = 1',
            [id, userId]
        );
        if (targetUser.length > 0 && targetUser[0].role === 'owner' && !isSuperAdmin) {
            return res.status(403).json({ message: 'ไม่สามารถลบเจ้าของบริษัทได้' });
        }

        await connection.execute(
            'UPDATE company_users SET active = 0 WHERE company_id = ? AND user_id = ?',
            [id, userId]
        );

        res.json({ message: 'ลบสมาชิกออกจากบริษัทสำเร็จ' });
    } catch (error) {
        console.error('Error in removeUserFromCompany:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * ดึง users ทั้งหมด (สำหรับเลือกเพิ่มเข้าบริษัท)
 */
const getAvailableUsers = async (req, res) => {
    let connection;
    try {
        const { id } = req.params; // company_id

        connection = await getConnection();

        // ดึง users ที่ยังไม่อยู่ในบริษัทนี้
        const [users] = await connection.execute(`
            SELECT u.user_id, u.username, u.first_name, u.last_name, u.email, u.profile_image
            FROM users u
            WHERE u.active = 1
            AND u.user_id NOT IN (
                SELECT cu.user_id FROM company_users cu 
                WHERE cu.company_id = ? AND cu.active = 1
            )
            ORDER BY u.first_name ASC
        `, [id]);

        res.json({ users });
    } catch (error) {
        console.error('Error in getAvailableUsers:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

/**
 * ลบบริษัท (Admin/Owner เท่านั้น)
 */
const deleteCompany = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        const { id } = req.params;
        connection = await getConnection();

        // ตรวจสอบสิทธิ์
        const [companyUser] = await connection.execute(
            'SELECT role FROM company_users WHERE company_id = ? AND user_id = ? AND active = 1',
            [id, req.user.user_id]
        );
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isSuperAdmin = globalRoles.length > 0 || req.user.username === 'admin' || req.user.username === 'adminspk';
        const isCompanyOwner = companyUser.length > 0 && companyUser[0].role === 'owner';

        if (!isSuperAdmin && !isCompanyOwner) {
            return res.status(403).json({ message: 'จำกัดเฉพาะเจ้าของบริษัทหรือผู้ดูแลระบบ' });
        }

        // Logical Delete
        await connection.execute(
            'UPDATE companies SET active = 0, updated_at = NOW() WHERE company_id = ?',
            [id]
        );

        res.json({ message: 'ลบบริษัทสำเร็จ' });
    } catch (error) {
        console.error('Error in deleteCompany:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};

module.exports = {
    getUserCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    addUserToCompany,
    removeUserFromCompany,
    getAvailableUsers,
    deleteCompany
};
