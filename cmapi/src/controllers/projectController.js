//projectController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

const getProjects = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    connection = await getConnection();
    let projects;
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    if (isAdmin) {
      [projects] = await connection.execute(`
        SELECT project_id, job_number, project_name, description, 
               DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
               DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, 
               image, progress_summary_image, payment_image, design_image, 
               pre_construction_image, construction_image, cm_image, precast_image, 
               progress, status, owner, consusltant, contractor, address,
               show_design, show_pre_construction, show_construction, show_precast, show_cm
        FROM projects
        WHERE active = 1
      `);
    } else {
      [projects] = await connection.execute(`
        SELECT p.project_id, p.job_number, p.project_name, p.description, 
               DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date, 
               DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date, 
               p.image, p.progress_summary_image, p.payment_image, p.design_image, 
               p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, 
               p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
               p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm
        FROM projects p
        JOIN project_user_roles pur ON p.project_id = pur.project_id
        WHERE pur.user_id = ? AND p.active = 1
      `, [req.user.user_id]);
    }

    const projectsWithMembers = await Promise.all(projects.map(async (project) => {
      const [members] = await connection.execute(`
        SELECT u.user_id, u.username as name
        FROM project_user_roles pur
        JOIN users u ON pur.user_id = u.user_id
        WHERE pur.project_id = ?
      `, [project.project_id]);
      return {
        ...project,
        team_members: members,
        progress: Number(project.progress) || 0,
        status: project.status || 'Unknown',
        show_design: !!project.show_design,
        show_pre_construction: !!project.show_pre_construction,
        show_construction: !!project.show_construction,
        show_precast: !!project.show_precast,
        show_cm: !!project.show_cm
      };
    }));

    res.json({ projects: projectsWithMembers });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const getProjectById = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    connection = await getConnection();
    let projectRows;
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    if (isAdmin) {
      [projectRows] = await connection.execute(
        `SELECT project_id, job_number, project_name, description, 
                DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
                DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, 
                image, progress_summary_image, payment_image, design_image, 
                pre_construction_image, construction_image, cm_image, precast_image, 
                progress, status, owner, consusltant, contractor, address,
                show_design, show_pre_construction, show_construction, show_precast, show_cm
         FROM projects 
         WHERE project_id = ? AND active = 1`,
        [req.params.id]
      );
    } else {
      [projectRows] = await connection.execute(
        `SELECT p.project_id, p.job_number, p.project_name, p.description, 
                DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date, 
                DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date, 
                p.image, p.progress_summary_image, p.payment_image, p.design_image, 
                p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, 
                p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
                p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm
         FROM projects p
         WHERE p.project_id = ? AND active = 1 AND EXISTS (
             SELECT 1 FROM project_user_roles pur 
             WHERE pur.project_id = p.project_id AND pur.user_id = ?
         )`,
        [req.params.id, req.user.user_id]
      );
    }

    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือคุณไม่มีสิทธิ์' });
    }

    const project = projectRows[0];

    // แก้ตรงนี้: ดึงข้อมูลสมาชิกครบทุกอย่าง
    const [members] = await connection.execute(
      `SELECT 
         u.user_id,
         u.username,
         u.first_name,
         u.last_name,
         u.email,
         u.profile_image,
         COALESCE(r.role_name, 'member') as role
       FROM project_user_roles pur
       JOIN users u ON pur.user_id = u.user_id
       LEFT JOIN roles r ON pur.role_id = r.role_id
       WHERE pur.project_id = ?`,
      [project.project_id]
    );

    const projectWithMembers = {
      ...project,
      team_members: members,  // ส่งข้อมูลครบ!
      progress: Number(project.progress) || 0,
      status: project.status || 'Unknown',
      show_design: !!project.show_design,
      show_pre_construction: !!project.show_pre_construction,
      show_construction: !!project.show_construction,
      show_precast: !!project.show_precast,
      show_cm: !!project.show_cm
    };

    res.json({ project: projectWithMembers });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
const getProjectUsers = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const projectId = req.params.id;
    connection = await getConnection();

    const [projectRows] = await connection.execute(
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',
      [projectId]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการ' });
    }

    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    let users;
    if (isAdmin) {
      // ✅ แก้ไข: เพิ่ม u.profile_image, pu.role
      [users] = await connection.execute(
        `SELECT 
           u.user_id, 
           u.username, 
           u.first_name, 
           u.last_name,
           u.email,  -- เพิ่ม email
           u.profile_image,  -- ✅ ต้องมีบรรทัดนี้!
           pu.role  -- เพิ่ม role จาก project_user_roles
         FROM users u
         JOIN project_user_roles pur ON u.user_id = pur.user_id
         WHERE pur.project_id = ?`,
        [projectId]
      );
    } else {
      // ✅ แก้ไข: เพิ่ม u.profile_image, pu.role
      [users] = await connection.execute(
        `SELECT 
           u.user_id, 
           u.username, 
           u.first_name, 
           u.last_name,
           u.email,
           u.profile_image,  -- ✅ ต้องมี!
           pu.role
         FROM users u
         JOIN project_user_roles pur ON u.user_id = pur.user_id
         WHERE pur.project_id = ? AND EXISTS (
           SELECT 1 FROM project_user_roles pur2 
           WHERE pur2.project_id = ? AND pur2.user_id = ?
         )`,
        [projectId, projectId, req.user.user_id]
      );
    }

    if (!isAdmin && users.length === 0) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ดูรายชื่อผู้ใช้ในโครงการนี้' });
    }

    // ✅ เพิ่ม role ถ้าไม่มี
    const usersWithRole = users.map(user => ({
      ...user,
      role: user.role || 'member'  // default role
    }));

    res.json({ users: usersWithRole });  // ✅ ส่ง users ที่มี profile_image
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const createProject = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const {
      job_number, project_name, description, start_date, end_date, progress, status, owner, consusltant, contractor, address,
      show_design = 1, show_pre_construction = 1, show_construction = 1, show_precast = 1, show_cm = 1
    } = req.body;
    const files = req.files || {};

    if (!job_number || !project_name || !start_date || !end_date || !owner || !consusltant || !contractor || !address) {
      return res.status(400).json({
        message: 'กรุณาระบุข้อมูลที่จำเป็นทั้งหมด',
        missingFields: {
          job_number: !!job_number,
          project_name: !!project_name,
          start_date: !!start_date,
          end_date: !!end_date,
          owner: !!owner,
          consusltant: !!consusltant,
          contractor: !!contractor,
          address: !!address
        }
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD' });
    }

    const progressValue = progress !== undefined && progress !== '' ? Number(progress) : 0;
    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      return res.status(400).json({ message: 'ความคืบหน้าต้องเป็นตัวเลขระหว่าง 0-100' });
    }

    connection = await getConnection();
    const [result] = await connection.execute(
      `INSERT INTO projects (job_number, project_name, description, start_date, end_date, progress, status, active, created_at, updated_at, owner, consusltant, contractor, address, image, progress_summary_image, payment_image, design_image, pre_construction_image, construction_image, cm_image, precast_image, show_design, show_pre_construction, show_construction, show_precast, show_cm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_number,
        project_name,
        description || null,
        start_date,
        end_date,
        progressValue,
        status || 'Planning',
        1,
        owner,
        consusltant,
        contractor,
        address,
        null, // image
        null, // progress_summary_image
        null, // payment_image
        null, // design_image
        null, // pre_construction_image
        null, // construction_image
        null, // cm_image
        null,  // precast_image
        show_design,
        show_pre_construction,
        show_construction,
        show_precast,
        show_cm
      ]
    );
    const projectId = result.insertId;

    // Insert default payment record into payments table
    await connection.execute(
      `INSERT INTO payments (
        project_id, 
        total_installments, 
        total_amount, 
        submitted_installments, 
        submitted_amount, 
        current_installment, 
        current_installment_amount, 
        payment_date
      ) VALUES (?, 0, 0, 0, 0, 0, 0, CURRENT_DATE)`,
      [projectId]
    );

    const uploadDir = path.join(__dirname, '../Uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const imageFields = [
      { key: 'image', file: files.image },
      { key: 'progress_summary_image', file: files.progress_summary_image },
      { key: 'payment_image', file: files.payment_image },
      { key: 'design_image', file: files.design_image },
      { key: 'pre_construction_image', file: files.pre_construction_image },
      { key: 'construction_image', file: files.construction_image },
      { key: 'cm_image', file: files.cm_image },
      { key: 'precast_image', file: files.precast_image }, // เพิ่ม precast_image
    ];

    const imagePaths = {};
    for (const { key, file } of imageFields) {
      if (file && file[0]) {
        const fileName = `${key}-${projectId}-${Date.now()}${path.extname(file[0].originalname)}`;
        const uploadPath = path.join(uploadDir, fileName);
        await fs.writeFile(uploadPath, file[0].buffer);
        imagePaths[key] = `Uploads/${fileName}`;
      }
    }

    if (Object.keys(imagePaths).length > 0) {
      const fields = Object.keys(imagePaths).map(key => `${key} = ?`).join(', ');
      const values = Object.values(imagePaths);
      await connection.execute(
        `UPDATE projects SET ${fields}, updated_at = NOW() WHERE project_id = ?`,
        [...values, projectId]
      );
    }

    await connection.execute(
      'INSERT INTO project_user_roles (project_id, user_id, role_id, created_at) VALUES (?, ?, ?, NOW())',
      [projectId, req.user.user_id, 1]
    );

    res.json({ message: 'สร้างโครงการสำเร็จ', project_id: projectId, job_number });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const updateProject = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const project_id = req.params.id || req.body.project_id;
    const {
      job_number, project_name, description, start_date, end_date, progress, status, owner, consusltant, contractor, address,
      show_design, show_pre_construction, show_construction, show_precast, show_cm
    } = req.body;
    const files = req.files || {};

    if (!project_id) {
      return res.status(400).json({ message: 'กรุณาระบุ project_id' });
    }

    if (!project_name || !job_number || !owner || !consusltant || !contractor || !address) {
      return res.status(400).json({
        message: 'กรุณาระบุข้อมูลที่จำเป็นทั้งหมด',
        missingFields: {
          project_name: !!project_name,
          job_number: !!job_number,
          owner: !!owner,
          consusltant: !!consusltant,
          contractor: !!contractor,
          address: !!address
        },
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (start_date && !dateRegex.test(start_date)) {
      return res.status(400).json({ message: 'รูปแบบ start_date ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD' });
    }
    if (end_date && !dateRegex.test(end_date)) {
      return res.status(400).json({ message: 'รูปแบบ end_date ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD' });
    }

    const progressValue = progress !== undefined && progress !== '' ? Number(progress) : null;
    if (progressValue !== null && (isNaN(progressValue) || progressValue < 0 || progressValue > 100)) {
      return res.status(400).json({ message: 'ความคืบหน้าต้องเป็นตัวเลขระหว่าง 0-100' });
    }

    connection = await getConnection();

    const [projectRows] = await connection.execute(
      `SELECT project_id, job_number, project_name, description, start_date, end_date, 
              progress, status, owner, consusltant, contractor, address,
              image, progress_summary_image, payment_image, design_image, 
              pre_construction_image, construction_image, cm_image, precast_image,
              show_design, show_pre_construction, show_construction, show_precast, show_cm
       FROM projects WHERE project_id = ? AND active = 1`,
      [project_id]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือถูกลบแล้ว' });
    }

    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขโครงการนี้' });
    }

    const uploadDir = path.join(__dirname, '../Uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const imageFields = [
      { key: 'image', file: files.image },
      { key: 'progress_summary_image', file: files.progress_summary_image },
      { key: 'payment_image', file: files.payment_image },
      { key: 'design_image', file: files.design_image },
      { key: 'pre_construction_image', file: files.pre_construction_image },
      { key: 'construction_image', file: files.construction_image },
      { key: 'cm_image', file: files.cm_image },
      { key: 'precast_image', file: files.precast_image }, // เพิ่ม precast_image
    ];

    const imagePaths = {};
    for (const { key, file } of imageFields) {
      if (file && file[0]) {
        if (projectRows[0][key]) {
          const oldImagePath = path.join(__dirname, '../Uploads', path.basename(projectRows[0][key]));
          if (await fs.access(oldImagePath).then(() => true).catch(() => false)) {
            await fs.unlink(oldImagePath);
          }
        }
        const fileName = `${key}-${project_id}-${Date.now()}${path.extname(file[0].originalname)}`;
        const uploadPath = path.join(uploadDir, fileName);
        await fs.writeFile(uploadPath, file[0].buffer);
        imagePaths[key] = `Uploads/${fileName}`;
      }
    }

    const fields = [];
    const values = [];

    const compareField = (newValue, oldValue) => {
      if (newValue === undefined) return false;
      if (newValue === null && oldValue === null) return false;
      if (newValue === oldValue) return false;
      return true;
    };

    if (compareField(project_name, projectRows[0].project_name)) {
      fields.push('project_name = ?');
      values.push(project_name);
    }
    if (compareField(job_number, projectRows[0].job_number)) {
      fields.push('job_number = ?');
      values.push(job_number);
    }
    if (compareField(description, projectRows[0].description)) {
      fields.push('description = ?');
      values.push(description || null);
    }
    if (compareField(start_date, projectRows[0].start_date)) {
      fields.push('start_date = ?');
      values.push(start_date);
    }
    if (end_date && compareField(end_date, projectRows[0].end_date)) {
      fields.push('end_date = ?');
      values.push(end_date);
    }
    if (progressValue !== null && compareField(progressValue, projectRows[0].progress)) {
      fields.push('progress = ?');
      values.push(progressValue);
    }
    if (compareField(status, projectRows[0].status)) {
      fields.push('status = ?');
      values.push(status);
    }
    if (compareField(owner, projectRows[0].owner)) {
      fields.push('owner = ?');
      values.push(owner);
    }
    if (compareField(consusltant, projectRows[0].consusltant)) {
      fields.push('consusltant = ?');
      values.push(consusltant);
    }
    if (compareField(contractor, projectRows[0].contractor)) {
      fields.push('contractor = ?');
      values.push(contractor);
    }
    if (compareField(address, projectRows[0].address)) {
      fields.push('address = ?');
      values.push(address);
    }

    const parseBool = (val) => (val === true || val === "true" || val === 1 || val === "1") ? 1 : 0;
    if (show_design !== undefined) {
      fields.push('show_design = ?');
      values.push(parseBool(show_design));
    }
    if (show_pre_construction !== undefined) {
      fields.push('show_pre_construction = ?');
      values.push(parseBool(show_pre_construction));
    }
    if (show_construction !== undefined) {
      fields.push('show_construction = ?');
      values.push(parseBool(show_construction));
    }
    if (show_precast !== undefined) {
      fields.push('show_precast = ?');
      values.push(parseBool(show_precast));
    }
    if (show_cm !== undefined) {
      fields.push('show_cm = ?');
      values.push(parseBool(show_cm));
    }

    for (const key of Object.keys(imagePaths)) {
      fields.push(`${key} = ?`);
      values.push(imagePaths[key]);
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(project_id);
      const query = `UPDATE projects SET ${fields.join(', ')} WHERE project_id = ? AND active = 1`;
      await connection.execute(query, values);
    }

    res.json({
      message: 'แก้ไขโครงการสำเร็จ',
      project_id,
      job_number: job_number || projectRows[0].job_number,
      ...imagePaths
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const uploadProjectImage = async (req, res) => {
  const { project_id, image_type } = req.body;
  const projectImage = req.file;
  let connection;

  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    if (!project_id || !projectImage || !image_type) {
      return res.status(400).json({ message: 'กรุณาระบุ project_id, image_type และ projectImage' });
    }

    const validImageTypes = [
      'image', 'progress_summary_image', 'payment_image', 'design_image',
      'pre_construction_image', 'construction_image', 'cm_image', 'precast_image'
    ];
    if (!validImageTypes.includes(image_type)) {
      return res.status(400).json({ message: 'ประเภทรูปภาพไม่ถูกต้อง' });
    }

    connection = await getConnection();
    const [projectRows] = await connection.execute(
      `SELECT project_id, job_number, ${validImageTypes.join(', ')} 
       FROM projects WHERE project_id = ? AND active = 1`,
      [project_id]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือถูกลบแล้ว' });
    }

    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [project_id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อัปโหลดรูปภาพสำหรับโครงการนี้' });
    }

    const uploadDir = path.join(__dirname, '../Uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    if (projectRows[0][image_type]) {
      const oldImagePath = path.join(__dirname, '../Uploads', path.basename(projectRows[0][image_type]));
      if (await fs.access(oldImagePath).then(() => true).catch(() => false)) {
        await fs.unlink(oldImagePath);
      }
    }

    const fileName = `${image_type}-${project_id}-${Date.now()}${path.extname(projectImage.originalname)}`;
    const uploadPath = path.join(uploadDir, fileName);
    await fs.writeFile(uploadPath, projectImage.buffer);
    const imagePath = `Uploads/${fileName}`;

    await connection.execute(
      `UPDATE projects SET ${image_type} = ?, updated_at = NOW() WHERE project_id = ? AND active = 1`,
      [imagePath, project_id]
    );

    res.json({
      message: 'อัปโหลดรูปภาพสำเร็จ',
      project_id,
      job_number: projectRows[0].job_number,
      [image_type]: imagePath
    });
  } catch (error) {
    if (error.message === 'กรุณาอัปโหลดไฟล์รูปภาพ') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const deleteProject = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    if (!id) {
      return res.status(400).json({ message: 'กรุณาระบุ project_id' });
    }

    connection = await getConnection();
    const [userRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = userRoles.length > 0;

    const [projectRows] = await connection.execute(
      `SELECT project_id, job_number, image, progress_summary_image, payment_image, 
              design_image, pre_construction_image, construction_image, cm_image, precast_image 
       FROM projects WHERE project_id = ? AND active = 1`,
      [id]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือถูกลบแล้ว' });
    }

    const [roleRows] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE project_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );
    if (roleRows.length === 0 && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบโครงการนี้' });
    }

    const imageFields = [
      'image', 'progress_summary_image', 'payment_image', 'design_image',
      'pre_construction_image', 'construction_image', 'cm_image', 'precast_image'
    ];
    for (const key of imageFields) {
      if (projectRows[0][key]) {
        const imagePath = path.join(__dirname, '../Uploads', path.basename(projectRows[0][key]));
        if (await fs.access(imagePath).then(() => true).catch(() => false)) {
          await fs.unlink(imagePath);
        }
      }
    }

    await connection.execute(
      'UPDATE projects SET active = 0, updated_at = NOW() WHERE project_id = ?',
      [id]
    );

    res.json({ message: 'ลบโครงการสำเร็จ', project_id: id, job_number: projectRows[0].job_number });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const getAllRoles = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [roles] = await connection.execute(
      'SELECT role_id, role_name FROM roles'
    );
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  uploadProjectImage,
  deleteProject,
  getAllRoles,
  getProjectUsers,
};