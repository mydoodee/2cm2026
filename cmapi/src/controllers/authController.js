const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { sendResetPasswordEmail } = require('./emailController');

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'กรุณาระบุชื่อผู้ใช้และรหัสผ่าน' });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'การกำหนดค่าคีย์ลับไม่ถูกต้อง' });
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        return res.status(500).json({ message: 'การกำหนดค่าคีย์ลับสำหรับ refresh token ไม่ถูกต้อง' });
    }

    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT user_id, username, password_hash, first_name, last_name, email, profile_image FROM users WHERE username = ? AND active = 1',
            [username]
        );

        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO logs (message) VALUES (?)',
                [`Login failed: No user found for username: ${username}`]
            );
            return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            await connection.execute(
                'INSERT INTO logs (message) VALUES (?)',
                [`Login failed: Password does not match for username: ${username}`]
            );
            return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const [userRolesRows] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ?',
            [user.user_id]
        );

        const [projectRolesRows] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [user.user_id]
        );

        let userRoles = [...new Set([...userRolesRows.map(r => r.role_id), ...projectRolesRows.map(r => r.role_id)])];

        if (user.username === 'admin' && !userRoles.includes(1)) {
            await connection.execute(
                'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())',
                [user.user_id, 1]
            );
            userRoles.push(1);
        }

        // ✅ สร้าง token อายุ 8 ชั่วโมง
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, roles: userRoles },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // ✅ สร้าง refresh token อายุ 7 วัน
        const refreshToken = jwt.sign(
            { user_id: user.user_id, username: user.username, roles: userRoles },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        await connection.execute(
            'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
            [refreshToken, user.user_id]
        );

        res.json({
            token,
            refreshToken,
            user: {
                user_id: user.user_id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                profile_image: user.profile_image,
                roles: userRoles,
                isAdmin: userRoles.includes(1)
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            sqlError: error.code ? error.sqlMessage : null
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const getUser = async (req, res) => {
    let connection = null;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT user_id, username, first_name, last_name, email, profile_image FROM users WHERE user_id = ? AND active = 1',
            [req.user.user_id]
        );
        const [roles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        let userRoles = roles.map(r => r.role_id);
        if (rows[0].username === 'adminspk' && !userRoles.includes(1)) {
            userRoles.push(1);
        }

        res.json({
            user: {
                user_id: rows[0].user_id,
                username: rows[0].username,
                first_name: rows[0].first_name,
                last_name: rows[0].last_name,
                email: rows[0].email,
                profile_image: rows[0].profile_image,
                roles: userRoles,
                isAdmin: userRoles.includes(1)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const updateUser = async (req, res) => {
    const { username, email, first_name, last_name, password, role_id, project_id } = req.body;
    const profileImage = req.file;
    const { id } = req.params;

    let connection = null;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();

        const isSelfUpdate = req.user.user_id === parseInt(id);
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        const isAdmin = adminRoles.some(r => r.role_id === 1) || req.user.username === 'adminspk';
        if (!isAdmin && !isSelfUpdate) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขผู้ใช้นี้' });
        }

        if (!username || !email || !first_name || !last_name) {
            return res.status(400).json({ message: 'กรุณาระบุข้อมูลที่จำเป็นทั้งหมด' });
        }

        const [userRows] = await connection.execute(
            'SELECT user_id, username, profile_image FROM users WHERE user_id = ? AND active = 1',
            [id]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        const [usernameRows] = await connection.execute(
            'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
            [username, id]
        );
        if (usernameRows.length > 0) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }

        const [emailRows] = await connection.execute(
            'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
            [email, id]
        );
        if (emailRows.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
        }

        let profileImagePath = userRows[0].profile_image;
        if (profileImage) {
            const uploadDir = path.join(__dirname, '../Uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const fileName = `${id}-${Date.now()}${path.extname(profileImage.originalname)}`;
            const uploadPath = path.join(uploadDir, fileName);
            fs.writeFileSync(uploadPath, profileImage.buffer);
            profileImagePath = `Uploads/${fileName}`;
        }

        let updateQuery = 'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?';
        let queryParams = [username, email, first_name, last_name];

        if (profileImagePath && profileImagePath !== userRows[0].profile_image) {
            updateQuery += ', profile_image = ?';
            queryParams.push(profileImagePath);
        }

        if (password) {
            updateQuery += ', password_hash = ?';
            queryParams.push(await bcrypt.hash(password, 10));
        }

        updateQuery += ' WHERE user_id = ?';
        queryParams.push(id);

        await connection.execute(updateQuery, queryParams);

        if (role_id && isAdmin) {
            await connection.execute(
                'DELETE FROM user_roles WHERE user_id = ?',
                [id]
            );
            await connection.execute(
                'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())',
                [id, role_id]
            );
        }

        if (role_id && project_id && isAdmin) {
            const [projectRows] = await connection.execute(
                'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
                [project_id]
            );
            if (projectRows.length === 0) {
                return res.status(404).json({ message: 'ไม่พบโครงการ' });
            }

            await connection.execute(
                'DELETE FROM project_user_roles WHERE user_id = ? AND project_id = ?',
                [id, project_id]
            );
            await connection.execute(
                'INSERT INTO project_user_roles (project_id, user_id, role_id, created_at) VALUES (?, ?, ?, NOW())',
                [project_id, id, role_id]
            );
        }

        let userRoles = [];
        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ?',
            [id]
        );
        userRoles = globalRoles.map(r => r.role_id);

        const [projectRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [id]
        );
        userRoles = [...new Set([...userRoles, ...projectRoles.map(r => r.role_id)])];

        if (username === 'adminspk' && !userRoles.includes(1)) {
            userRoles.push(1);
        }

        res.json({
            user: {
                user_id: id,
                username,
                email,
                first_name,
                last_name,
                profile_image: profileImagePath,
                roles: userRoles,
                isAdmin: userRoles.includes(1)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            sqlError: error.code ? error.sqlMessage : null 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const getAllUsers = async (req, res) => {
    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        const [roles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        if (!roles.some(r => r.role_id === 1) && req.user.username !== 'adminspk') {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดูรายการผู้ใช้ได้' });
        }

            const includeInactive = req.query.includeInactive === 'true';
            const [users] = await connection.execute(`
                SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u.profile_image, u.active,
                       GROUP_CONCAT(DISTINCT pur.role_id) as role_ids,
                       GROUP_CONCAT(pur.project_id, ':', p.job_number, ':', pur.role_id, ':', r.role_name) as project_roles
                FROM users u
                LEFT JOIN project_user_roles pur ON u.user_id = pur.user_id
                LEFT JOIN projects p ON pur.project_id = p.project_id AND p.active = 1
                LEFT JOIN roles r ON pur.role_id = r.role_id
                WHERE ${includeInactive ? '1=1' : 'u.active = 1'}
                GROUP BY u.user_id
            `);

        const formattedUsers = users.map(user => {
            let userRoles = user.role_ids ? user.role_ids.split(',').map(Number) : [];
            if (user.username === 'adminspk' && !userRoles.includes(1)) {
                userRoles.push(1);
            }
            return {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_image: user.profile_image,
                active: user.active,
                roles: userRoles,
                isAdmin: userRoles.includes(1),
                project_roles: user.project_roles
                    ? user.project_roles.split(',').map(pr => {
                          const [project_id, job_number, role_id, role_name] = pr.split(':');
                          return {
                              project_id: project_id ? Number(project_id) : null,
                              job_number: job_number || 'ไม่ระบุหมายเลขงาน',
                              role_id: Number(role_id),
                              role_name
                          };
                      })
                    : []
            };
        });

        res.json({ users: formattedUsers });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const createUser = async (req, res) => {
    const { username, email, first_name, last_name, password, role_id, project_id } = req.body;
    const profileImage = req.file;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        console.error('DEBUG: DB Connection acquired for createUser');

        await connection.beginTransaction();
        console.error('DEBUG: Transaction started for createUser');

        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        const isAdmin = adminRoles.some(r => r.role_id === 1) || req.user.username === 'admin' || req.user.username === 'adminspk';
        if (!isAdmin) {
            console.error('DEBUG: User is not admin', { username: req.user.username, user_id: req.user.user_id });
            await connection.rollback();
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างผู้ใช้ได้' });
        }

        if (!username || !email || !first_name || !last_name || !password || !role_id) {
            return res.status(400).json({
                message: 'กรุณาระบุข้อมูลที่จำเป็นทั้งหมด (username, email, first_name, last_name, password, role_id)'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
            });
        }

        const [usernameRows] = await connection.execute(
            'SELECT user_id FROM users WHERE username = ?',
            [username]
        );
        if (usernameRows.length > 0) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }

        const [emailRows] = await connection.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );
        if (emailRows.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
        }

        const [roleRows] = await connection.execute(
            'SELECT role_id FROM roles WHERE role_id = ?',
            [role_id]
        );
        if (roleRows.length === 0) {
            return res.status(400).json({ message: 'ไม่พบบทบาทที่ระบุ' });
        }

        if (project_id) {
            const [projectRows] = await connection.execute(
                'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
                [project_id]
            );
            if (projectRows.length === 0) {
                return res.status(404).json({ message: 'ไม่พบโครงการ' });
            }
        }

        let profileImagePath = null;
        if (profileImage) {
            const uploadDir = path.join(__dirname, '../Uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const fileName = `new-user-${Date.now()}${path.extname(profileImage.originalname)}`;
            const uploadPath = path.join(uploadDir, fileName);
            fs.writeFileSync(uploadPath, profileImage.buffer);
            profileImagePath = `Uploads/${fileName}`;
        }

        console.error('DEBUG: Salting and hashing password...');
        const passwordHash = await bcrypt.hash(password, 10);
        console.error('DEBUG: Password hashed');

        const [result] = await connection.execute(
            'INSERT INTO users (username, password_hash, email, first_name, last_name, profile_image, created_by, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [username, passwordHash, email, first_name, last_name, profileImagePath, req.user.user_id]
        );
        console.error('DEBUG: User inserted', { insertId: result.insertId });

        await connection.execute(
            'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())',
            [result.insertId, role_id]
        );

        let userRoles = [Number(role_id)];
        if (project_id) {
            await connection.execute(
                'INSERT INTO project_user_roles (project_id, user_id, role_id, created_at) VALUES (?, ?, ?, NOW())',
                [project_id, result.insertId, role_id]
            );
        }

        if (username === 'admin' && !userRoles.includes(1)) {
            await connection.execute(
                'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())',
                [result.insertId, 1]
            );
            userRoles.push(1);
        }

        await connection.commit();

        res.json({
            user_id: result.insertId,
            user: {
                user_id: result.insertId,
                username,
                email,
                first_name,
                last_name,
                profile_image: profileImagePath,
                roles: userRoles,
                isAdmin: userRoles.includes(1)
            },
            message: 'สร้างผู้ใช้สำเร็จ'
        });
    } catch (error) {
        console.error('DEBUG: ERROR in createUser:', error);
        if (connection) {
            await connection.rollback();
            console.error('DEBUG: Transaction rolled back');
        }
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            sqlError: error.code ? error.sqlMessage : null
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        if (!adminRoles.some(r => r.role_id === 1) && req.user.username !== 'adminspk') {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบผู้ใช้ได้' });
        }

        const [userRows] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ? AND active = 1',
            [id]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        if (userRows[0].username === 'adminspk') {
            return res.status(403).json({ message: 'ไม่สามารถลบผู้ใช้ adminspk ได้' });
        }

        await connection.execute(
            'UPDATE users SET active = 0 WHERE user_id = ?',
            [id]
        );

        res.json({ message: 'ลบผู้ใช้สำเร็จ' });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const restoreUser = async (req, res) => {
    const { id } = req.params;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        const isAdmin = adminRoles.some(r => r.role_id === 1) || req.user.username === 'admin' || req.user.username === 'adminspk';
        
        if (!isAdmin) {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถกู้คืนผู้ใช้ได้' });
        }

        const [userRows] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ? AND active = 0',
            [id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ถูกปิดใช้งานหรือผู้ใช้นี้เปิดใช้งานอยู่แล้ว' });
        }

        await connection.execute(
            'UPDATE users SET active = 1 WHERE user_id = ?',
            [id]
        );

        res.json({ message: 'กู้คืนผู้ใช้สำเร็จ', username: userRows[0].username });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในการกู้คืนผู้ใช้', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const hardDeleteUser = async (req, res) => {
    const { id } = req.params;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        
        // ตรวจสอบสิทธิ์ Admin (เฉพาะบทบาท 1 หรือชื่อ admin/adminspk เท่านั้นที่มีสิทธิ์ลบทิ้งถาวร)
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        const isAdmin = adminRoles.some(r => r.role_id === 1) || req.user.username === 'admin' || req.user.username === 'adminspk';
        
        if (!isAdmin) {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบผู้ใช้ถาวรได้' });
        }

        // ตรวจสอบสถานะว่าถูกลบแบบ Soft Delete (active=0) แล้วหรือไม่ก่อนลบจริง
        const [userRows] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ?',
            [id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
        }

        const [inactiveRows] = await connection.execute(
            'SELECT user_id FROM users WHERE user_id = ? AND active = 0',
            [id]
        );

        if (inactiveRows.length === 0) {
             return res.status(400).json({ message: 'ต้องลบผู้ใช้เบื้องต้น (Soft Delete) ก่อนจึงจะลบถาวรได้' });
        }

        await connection.beginTransaction();

        const adminId = req.user.user_id;

        // ลบ/อัปเดตความสัมพันธ์ที่มี Foreign Key เพื่อให้ลบได้จริง
        // 1. ลบข้อมูลที่ผูกติดกับตัวบุคคล (Session/Token/Permissions/Logs)
        await connection.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM reset_tokens WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM project_user_roles WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM folder_permissions WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM project_permissions WHERE user_id = ?', [id]);
        await connection.execute('DELETE FROM file_downloads WHERE user_id = ?', [id]);
        
        // 2. อัปเดตข้อมูลที่ต้องเก็บไว้แต่เปลี่ยนคนดูแล (Reassign to Admin)
        // เนื่องจากคอลัมน์เหล่านี้ใน DB ตั้งค่าเป็น NOT NULL จึงต้องโอนสิทธิ์ให้ Admin แทนการตั้งเป็น NULL
        await connection.execute('UPDATE files SET uploaded_by = ? WHERE uploaded_by = ?', [adminId, id]);
        await connection.execute('UPDATE folders SET created_by = ? WHERE created_by = ?', [adminId, id]);
        await connection.execute('UPDATE project_user_invitations SET invited_by = ? WHERE invited_by = ?', [adminId, id]);
        
        // สำหรับคอลัมน์ที่อนุญาตให้เป็น NULL (Nullable)
        await connection.execute('UPDATE users SET created_by = NULL WHERE created_by = ?', [id]);
        
        // 3. ลบตัวตนผู้ใช้
        await connection.execute('DELETE FROM users WHERE user_id = ?', [id]);

        await connection.commit();

        res.json({ message: 'ลบผู้ใช้ถาวรสำเร็จแล้ว', username: userRows[0].username });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในการลบผู้ใช้ถาวร', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: 'ไม่พบ refresh token' });
    }

    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
            [refreshToken]
        );
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ' });
        }

        const userId = rows[0].user_id;
        const [userRows] = await connection.execute(
            'SELECT user_id, username, first_name, last_name, email, profile_image FROM users WHERE user_id = ? AND active = 1',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        const [roles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [userId]
        );
        let userRoles = roles.map(r => r.role_id);
        if (userRows[0].username === 'adminspk' && !userRoles.includes(1)) {
            userRoles.push(1);
        }

        // ✅ สร้าง token ใหม่อายุ 8 ชั่วโมง
        const newToken = jwt.sign(
            { user_id: userId, username: userRows[0].username, roles: userRoles },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token: newToken,
            user: {
                user_id: userRows[0].user_id,
                username: userRows[0].username,
                first_name: userRows[0].first_name,
                last_name: userRows[0].last_name,
                email: userRows[0].email,
                profile_image: userRows[0].profile_image,
                roles: userRoles,
                isAdmin: userRoles.includes(1)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const assignProjectRole = async (req, res) => {
    const { project_id, user_id, role_id } = req.body;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        if (!role_id) {
            return res.status(400).json({ message: 'กรุณาระบุ role_id' });
        }

        connection = await getConnection();
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ?',
            [req.user.user_id]
        );
        if (!adminRoles.some(r => r.role_id === 1) && req.user.username !== 'adminspk') {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถกำหนดบทบาทได้' });
        }

        const [projectRows] = await connection.execute(
            'SELECT project_id, job_number FROM projects WHERE project_id = ? AND active = 1',
            [project_id]
        );
        if (projectRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบโครงการ' });
        }

        const [userRows] = await connection.execute(
            'SELECT user_id FROM users WHERE user_id = ? AND active = 1',
            [user_id]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        const [roleRows] = await connection.execute(
            'SELECT role_id FROM roles WHERE role_id = ?',
            [role_id]
        );
        if (roleRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบบทบาท' });
        }

        await connection.execute(
            'INSERT INTO project_user_roles (project_id, user_id, role_id, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role_id = ?, updated_at = NOW()',
            [project_id, user_id, role_id, role_id]
        );

        res.json({
            message: 'กำหนดบทบาทสำเร็จ',
            project_id,
            job_number: projectRows[0].job_number || 'ไม่ระบุหมายเลขงาน',
            user_id,
            role_id
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const deleteProjectUserRole = async (req, res) => {
    const { project_id, user_id } = req.query;

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ 
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ใน token' 
            });
        }

        if (!project_id || !user_id) {
            return res.status(400).json({ 
                success: false,
                message: 'กรุณาระบุ project_id และ user_id' 
            });
        }

        const projectIdStr = project_id;
        const userIdNum = parseInt(user_id, 10);

        if (!projectIdStr || isNaN(userIdNum)) {
            return res.status(400).json({ 
                success: false,
                message: 'project_id ต้องระบุ และ user_id ต้องเป็นตัวเลข' 
            });
        }

        connection = await getConnection();

        const [globalRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );

        const [projectRoles] = await connection.execute(
            'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );

        const isAdmin = globalRoles.length > 0 || 
                       projectRoles.length > 0 || 
                       req.user.username === 'admin' ||
                       req.user.username === 'adminspk';

        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบสิทธิ์ได้' 
            });
        }

        const [projectRows] = await connection.execute(
            'SELECT project_id, project_name, job_number FROM projects WHERE project_id = ? AND active = 1',
            [projectIdNum]
        );

        if (projectRows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'ไม่พบโครงการ' 
            });
        }

        const [userRows] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id = ? AND active = 1',
            [userIdNum]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'ไม่พบผู้ใช้' 
            });
        }

        const [existingRoles] = await connection.execute(
            'SELECT * FROM project_user_roles WHERE project_id = ? AND user_id = ?',
            [projectIdNum, userIdNum]
        );

        if (existingRoles.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'ไม่พบสิทธิ์สำหรับผู้ใช้ในโครงการนี้' 
            });
        }

        const [deleteResult] = await connection.execute(
            'DELETE FROM project_user_roles WHERE project_id = ? AND user_id = ?',
            [projectIdNum, userIdNum]
        );

        res.json({
            success: true,
            message: 'ลบสิทธิ์การเข้าใช้งานสำเร็จ',
            data: {
                project_id: projectIdNum,
                project_name: projectRows[0].project_name,
                job_number: projectRows[0].job_number,
                user_id: userIdNum,
                username: userRows[0].username,
                affectedRows: deleteResult.affectedRows
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            sqlMessage: error.sqlMessage
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const resetPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'กรุณาระบุอีเมล' });
    }

    let connection;
    try {
        connection = await getConnection();

        const [rows] = await connection.execute(
            'SELECT user_id, username, email FROM users WHERE email = ? AND active = 1',
            [email]
        );

        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO logs (message) VALUES (?)',
                [`Reset password failed: No user found for email: ${email}`]
            );
            return res.status(404).json({ message: 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลหรือติดต่อผู้ดูแลระบบ' });
        }

        const user = rows[0];
        const resetToken = jwt.sign(
            { user_id: user.user_id, email: user.email },
            process.env.JWT_RESET_SECRET,
            { expiresIn: '1h' }
        );

        await connection.execute(
            'INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            [resetToken, user.user_id]
        );

        await sendResetPasswordEmail(user, resetToken);

        await connection.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Reset password requested for email: ${email}`]
        );

        res.json({ message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว' });
    } catch (error) {
        await connection?.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Reset password error for email: ${email} - ${error.message}`]
        );
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: error.code,
            errno: error.errno
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const confirmPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'กรุณาระบุโทเค็นและรหัสผ่านใหม่' });
    }

    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT user_id, expires_at FROM reset_tokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'โทเค็นไม่ถูกต้องหรือหมดอายุ' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [passwordHash, rows[0].user_id]
        );

        await connection.execute(
            'DELETE FROM reset_tokens WHERE token = ?',
            [token]
        );

        await connection.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Password reset successful for user_id: ${rows[0].user_id}`]
        );

        res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ' });
    } catch (error) {
        await connection?.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Confirm password error: ${error.message}`]
        );
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: error.code,
            errno: error.errno
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
};

const copyUserPermissions = async (req, res) => {
    const { sourceUserId, targetUserId } = req.body;

    if (!sourceUserId || !targetUserId) {
        return res.status(400).json({ message: 'กรุณาระบุ sourceUserId และ targetUserId' });
    }

    if (sourceUserId === targetUserId) {
        return res.status(400).json({ message: 'ผู้ใช้ต้นทางและปลายทางต้องไม่ใช่คนเดียวกัน' });
    }

    let connection;
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
        }

        connection = await getConnection();
        
        // ตรวจสอบสิทธิ์ Admin
        const [adminRoles] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
            [req.user.user_id]
        );
        const isAdmin = adminRoles.length > 0 || req.user.username === 'admin' || req.user.username === 'adminspk';
        if (!isAdmin) {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถคัดลอกสิทธิ์ได้' });
        }

        // ตรวจสอบว่าผู้ใช้ทั้งสองคนมีอยู่จริง
        const [users] = await connection.execute(
            'SELECT user_id, username FROM users WHERE user_id IN (?, ?) AND active = 1',
            [sourceUserId, targetUserId]
        );
        if (users.length < 2) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้ต้นทางหรือปลายทาง' });
        }

        await connection.beginTransaction();

        // 1. คัดลอก Project Roles (project_user_roles)
        const [sourceProjectRoles] = await connection.execute(
            'SELECT project_id, role_id FROM project_user_roles WHERE user_id = ?',
            [sourceUserId]
        );

        for (const role of sourceProjectRoles) {
            await connection.execute(
                `INSERT INTO project_user_roles (project_id, user_id, role_id, created_at) 
                 VALUES (?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE role_id = ?, updated_at = NOW()`,
                [role.project_id, targetUserId, role.role_id, role.role_id]
            );
        }

        // 2. คัดลอก Folder Permissions (folder_permissions)
        const [sourceFolderPerms] = await connection.execute(
            'SELECT folder_id, permission_type FROM folder_permissions WHERE user_id = ?',
            [sourceUserId]
        );

        for (const perm of sourceFolderPerms) {
            await connection.execute(
                `INSERT INTO folder_permissions (folder_id, user_id, permission_type, created_at) 
                 VALUES (?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE permission_type = ?, updated_at = NOW()`,
                [perm.folder_id, targetUserId, perm.permission_type, perm.permission_type]
            );
        }

        await connection.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Permissions copied from user_id: ${sourceUserId} to user_id: ${targetUserId} by admin_id: ${req.user.user_id}`]
        );

        await connection.commit();

        res.json({
            message: 'คัดลอกสิทธิ์สำเร็จ',
            details: {
                projectRolesCount: sourceProjectRoles.length,
                folderPermissionsCount: sourceFolderPerms.length
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) await connection.release();
    }
};

module.exports = {
    login,
    getUser,
    updateUser,
    getAllUsers,
    createUser,
    deleteUser,
    restoreUser,
    hardDeleteUser,
    refreshToken,
    assignProjectRole,
    deleteProjectUserRole,
    resetPassword,
    confirmPassword,
    copyUserPermissions
};