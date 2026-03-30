//projectController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const getProjects = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    connection = await getConnection();
    let projects;
    const companyId = req.headers['x-company-id'] || req.companyId;
    const [globalRoles] = await connection.execute(
      'SELECT role_id FROM user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const [projectRoles] = await connection.execute(
      'SELECT role_id FROM project_user_roles WHERE user_id = ? AND role_id = 1',
      [req.user.user_id]
    );
    const isAdmin = globalRoles.length > 0 || projectRoles.length > 0 || req.user.username === 'adminspk' || req.user.username === 'admin';

    // สร้าง company filter - บังคับให้ต้องมี companyId เสมอ
    if (!companyId) {
      return res.status(400).json({ message: 'กรุณาระบุ Company ID ใน Header (X-Company-Id)' });
    }
    const companyFilter = 'AND p.company_id = ?';
    const companyParam = [companyId];

    if (isAdmin) {
      [projects] = await connection.execute(`
        SELECT project_id, job_number, project_name, description, 
               DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
               DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, 
               p.image, p.progress_summary_image, p.payment_image, p.design_image, 
               p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, p.bidding_image, p.job_status_image,
               p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
               p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm, p.show_bidding, p.show_progress_summary, p.show_payment, p.show_job_status,
               p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status,
               p.company_id
        FROM projects p
        WHERE active = 1 ${companyFilter}
        ORDER BY p.job_number DESC
      `, companyParam);
    } else {
      [projects] = await connection.execute(`
        SELECT p.project_id, p.job_number, p.project_name, p.description, 
               DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date, 
               DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date, 
               p.image, p.progress_summary_image, p.payment_image, p.design_image, 
               p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, p.bidding_image, p.job_status_image,
               p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
               p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm, p.show_bidding, p.show_progress_summary, p.show_payment, p.show_job_status,
               p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status,
               p.company_id
        FROM projects p
        JOIN project_user_roles pur ON p.project_id = pur.project_id
        WHERE pur.user_id = ? AND p.active = 1 ${companyFilter}
        ORDER BY p.job_number DESC
      `, [req.user.user_id, ...companyParam]);
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
        show_cm: !!project.show_cm,
        show_bidding: !!project.show_bidding,
        show_progress_summary: project.show_progress_summary !== undefined ? !!project.show_progress_summary : true,
        show_payment: project.show_payment !== undefined ? !!project.show_payment : true,
        show_job_status: project.show_job_status !== undefined ? !!project.show_job_status : true,
        tender_status: project.tender_status || 'tender_in_progress',
      };
    }));

    res.json({ projects: projectsWithMembers });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
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
                p.image, p.progress_summary_image, p.payment_image, p.design_image, 
                p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, p.bidding_image, p.job_status_image,
                p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
                p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm, p.show_bidding, p.show_progress_summary, p.show_payment, p.show_job_status,
                p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status
         FROM projects p
         WHERE p.project_id = ? AND p.company_id = ? AND p.active = 1`,
        [req.params.id, req.companyId]
      );
    } else {
      [projectRows] = await connection.execute(
        `SELECT p.project_id, p.job_number, p.project_name, p.description, 
                DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date, 
                DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date, 
                p.image, p.progress_summary_image, p.payment_image, p.design_image, 
                p.pre_construction_image, p.construction_image, p.cm_image, p.precast_image, p.bidding_image, p.job_status_image,
                p.progress, p.status, p.owner, p.consusltant, p.contractor, p.address,
                p.show_design, p.show_pre_construction, p.show_construction, p.show_precast, p.show_cm, p.show_bidding, p.show_progress_summary, p.show_payment, p.show_job_status,
                p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status
         FROM projects p
         WHERE p.project_id = ? AND p.company_id = ? AND p.active = 1 AND EXISTS (
             SELECT 1 FROM project_user_roles pur 
             WHERE pur.project_id = p.project_id AND pur.user_id = ?
         )`,
        [req.params.id, req.companyId, req.user.user_id]
      );
    }

    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือคุณไม่มีสิทธิ์' });
    }

    const project = projectRows[0];

    // ดึงข้อมูลสมาชิกครบทุกอย่าง พร้อม role_name
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
      team_members: members,
      progress: Number(project.progress) || 0,
      status: project.status || 'Unknown',
      show_design: !!project.show_design,
      show_pre_construction: !!project.show_pre_construction,
      show_construction: !!project.show_construction,
      show_precast: !!project.show_precast,
      show_cm: !!project.show_cm,
      show_bidding: !!project.show_bidding,
      show_progress_summary: project.show_progress_summary !== undefined ? !!project.show_progress_summary : true,
      show_payment: project.show_payment !== undefined ? !!project.show_payment : true,
      show_job_status: project.show_job_status !== undefined ? !!project.show_job_status : true,
      tender_status: project.tender_status || 'tender_in_progress',
    };

    res.json({ project: projectWithMembers });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
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
      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?',
      [projectId, req.companyId]
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
      [users] = await connection.execute(
        `SELECT 
           u.user_id, 
           u.username, 
           u.first_name, 
           u.last_name,
           u.email,
           u.profile_image,
           COALESCE(r.role_name, 'member') as role
         FROM users u
         JOIN project_user_roles pur ON u.user_id = pur.user_id
         LEFT JOIN roles r ON pur.role_id = r.role_id
         WHERE pur.project_id = ?`,
        [projectId]
      );
    } else {
      [users] = await connection.execute(
        `SELECT 
           u.user_id, 
           u.username, 
           u.first_name, 
           u.last_name,
           u.email,
           u.profile_image,
           COALESCE(r.role_name, 'member') as role
         FROM users u
         JOIN project_user_roles pur ON u.user_id = pur.user_id
         LEFT JOIN roles r ON pur.role_id = r.role_id
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

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
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
      show_bidding = 1, show_progress_summary = 1, show_payment = 1, show_job_status = 1,
      bidding_progress = 0, design_progress = 0, pre_construction_progress = 0, construction_progress = 0, precast_progress = 0, cm_progress = 0, job_status_progress = 0, tender_status = 'tender_in_progress'
    } = req.body;
    const files = req.files || {};
    const companyId = req.headers['x-company-id'] || req.companyId || req.body.company_id;

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
    const projectId = uuidv4();
    await connection.execute(
      `INSERT INTO projects (
        project_id, job_number, project_name, description, start_date, end_date, progress, status, active, created_at, updated_at, 
        owner, consusltant, contractor, address, image, progress_summary_image, payment_image, design_image, 
        pre_construction_image, construction_image, cm_image, precast_image, bidding_image, job_status_image,
        show_design, show_pre_construction, show_construction, show_precast, show_cm, show_bidding, show_progress_summary, show_payment, show_job_status,
        bidding_progress, design_progress, pre_construction_progress, construction_progress, precast_progress, cm_progress, job_status_progress, tender_status,
        company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
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
        null,  // bidding_image
        null,  // job_status_image
        show_design,
        show_pre_construction,
        show_construction,
        show_precast,
        show_cm,
        show_bidding,
        show_progress_summary,
        show_payment,
        show_job_status,
        Number(bidding_progress) || 0,
        Number(design_progress) || 0,
        Number(pre_construction_progress) || 0,
        Number(construction_progress) || 0,
        Number(precast_progress) || 0,
        Number(cm_progress) || 0,
        Number(job_status_progress) || 0,
        tender_status,
        companyId
      ]
    );

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
      { key: 'precast_image', file: files.precast_image },
      { key: 'bidding_image', file: files.bidding_image },
      { key: 'job_status_image', file: files.job_status_image },
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
    console.error('❌ Create Project Database/File Error:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการสร้างโครงการ (Server Error)', 
      error: error.message,
      detail: error.code || 'No error code',
      sqlState: error.sqlState,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) {
      await connection.release();
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
      show_bidding, show_progress_summary, show_payment, show_job_status,
      bidding_progress, design_progress, pre_construction_progress, construction_progress, precast_progress, cm_progress, job_status_progress, tender_status
    } = req.body;
    const files = req.files || {};

    if (!project_id) {
      return res.status(400).json({ message: 'กรุณาระบุ project_id' });
    }

    connection = await getConnection();

    // Verify company isolation
    const [projectRows] = await connection.execute(
      `SELECT * FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?`,
      [project_id, req.companyId]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการในบริษัทปัจจุบันหรือถูกลบแล้ว' });
    }

    const final_project_name = project_name !== undefined ? project_name : projectRows[0].project_name;
    const final_job_number = job_number !== undefined ? job_number : projectRows[0].job_number;
    const final_owner = owner !== undefined ? owner : projectRows[0].owner;
    const final_consusltant = consusltant !== undefined ? consusltant : projectRows[0].consusltant;
    const final_contractor = contractor !== undefined ? contractor : projectRows[0].contractor;
    const final_address = address !== undefined ? address : projectRows[0].address;

    if (!final_project_name || !final_job_number || !final_owner || !final_consusltant || !final_contractor || !final_address) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูลที่จำเป็นทั้งหมด' });
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
      { key: 'precast_image', file: files.precast_image },
      { key: 'bidding_image', file: files.bidding_image },
      { key: 'job_status_image', file: files.job_status_image },
    ];

    const imagePaths = {};
    for (const { key, file } of imageFields) {
      if (file && file[0]) {
        if (projectRows[0][key]) {
          const oldImagePath = path.join(__dirname, '../Uploads', path.basename(projectRows[0][key]));
          try { await fs.unlink(oldImagePath); } catch (e) {}
        }
        const fileName = `${key}-${project_id}-${Date.now()}${path.extname(file[0].originalname)}`;
        const uploadPath = path.join(uploadDir, fileName);
        await fs.writeFile(uploadPath, file[0].buffer);
        imagePaths[key] = `Uploads/${fileName}`;
      }
    }

    const fields = [];
    const values = [];

    const addField = (fieldName, newValue) => {
        if (newValue !== undefined) {
            fields.push(`${fieldName} = ?`);
            values.push(newValue);
        }
    };

    addField('project_name', project_name);
    addField('job_number', job_number);
    addField('description', description === undefined ? undefined : (description || null));
    addField('start_date', start_date);
    addField('end_date', end_date);
    addField('progress', progressValue);
    addField('status', status);
    addField('owner', owner);
    addField('consusltant', consusltant);
    addField('contractor', contractor);
    addField('address', address);

    const parseBool = (val) => (val === true || val === "true" || val === 1 || val === "1") ? 1 : 0;
    if (show_design !== undefined) addField('show_design', parseBool(show_design));
    if (show_pre_construction !== undefined) addField('show_pre_construction', parseBool(show_pre_construction));
    if (show_construction !== undefined) addField('show_construction', parseBool(show_construction));
    if (show_precast !== undefined) addField('show_precast', parseBool(show_precast));
    if (show_cm !== undefined) addField('show_cm', parseBool(show_cm));
    if (show_bidding !== undefined) addField('show_bidding', parseBool(show_bidding));
    if (show_progress_summary !== undefined) addField('show_progress_summary', parseBool(show_progress_summary));
    if (show_payment !== undefined) addField('show_payment', parseBool(show_payment));
    if (show_job_status !== undefined) addField('show_job_status', parseBool(show_job_status));

    if (bidding_progress !== undefined) addField('bidding_progress', Number(bidding_progress) || 0);
    if (design_progress !== undefined) addField('design_progress', Number(design_progress) || 0);
    if (pre_construction_progress !== undefined) addField('pre_construction_progress', Number(pre_construction_progress) || 0);
    if (construction_progress !== undefined) addField('construction_progress', Number(construction_progress) || 0);
    if (precast_progress !== undefined) addField('precast_progress', Number(precast_progress) || 0);
    if (cm_progress !== undefined) addField('cm_progress', Number(cm_progress) || 0);
    if (job_status_progress !== undefined) addField('job_status_progress', Number(job_status_progress) || 0);
    if (tender_status !== undefined) addField('tender_status', tender_status);

    for (const key of Object.keys(imagePaths)) {
      addField(key, imagePaths[key]);
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(project_id);
      const query = `UPDATE projects SET ${fields.join(', ')} WHERE project_id = ? AND active = 1`;
      await connection.execute(query, values);
    }

    res.json({ message: 'แก้ไขโครงการสำเร็จ', project_id, ...imagePaths });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
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
      'pre_construction_image', 'construction_image', 'cm_image', 'precast_image', 'bidding_image', 'job_status_image'
    ];
    if (!validImageTypes.includes(image_type)) {
      return res.status(400).json({ message: 'ประเภทรูปภาพไม่ถูกต้อง' });
    }

    connection = await getConnection();
    const [projectRows] = await connection.execute(
      `SELECT * FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?`,
      [project_id, req.companyId]
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
      try { await fs.unlink(oldImagePath); } catch (e) {}
    }

    const fileName = `${image_type}-${project_id}-${Date.now()}${path.extname(projectImage.originalname)}`;
    const uploadPath = path.join(uploadDir, fileName);
    await fs.writeFile(uploadPath, projectImage.buffer);
    const imagePath = `Uploads/${fileName}`;

    await connection.execute(
      `UPDATE projects SET ${image_type} = ?, updated_at = NOW() WHERE project_id = ? AND active = 1`,
      [imagePath, project_id]
    );

    res.json({ message: 'อัปโหลดรูปภาพสำเร็จ', project_id, [image_type]: imagePath });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
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
      `SELECT * FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?`,
      [id, req.companyId]
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

    // ลบรูปภาพที่เกี่ยวข้อง
    const imageFields = ['image', 'progress_summary_image', 'payment_image', 'design_image', 'pre_construction_image', 'construction_image', 'cm_image', 'precast_image', 'bidding_image'];
    for (const key of imageFields) {
      if (projectRows[0][key]) {
        const imagePath = path.join(__dirname, '../Uploads', path.basename(projectRows[0][key]));
        try { await fs.unlink(imagePath); } catch (e) {}
      }
    }

    await connection.execute(
      'UPDATE projects SET active = 0, updated_at = NOW() WHERE project_id = ?',
      [id]
    );

    res.json({ message: 'ลบโครงการสำเร็จ', project_id: id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

const getAllRoles = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [roles] = await connection.execute(
      'SELECT role_id, role_name, description FROM roles ORDER BY role_id ASC'
    );
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

const createRole = async (req, res) => {
  const { role_name, description } = req.body;
  let connection;
  try {
    if (!role_name) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อบทบาท' });
    }

    connection = await getConnection();
    const [result] = await connection.execute(
      'INSERT INTO roles (role_name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [role_name, description || null]
    );

    res.json({ message: 'สร้างบทบาทสำเร็จ', role_id: result.insertId, role_name });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างบทบาท', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

const updateRole = async (req, res) => {
  const { id } = req.params;
  const { role_name, description } = req.body;
  let connection;
  try {
    if (!role_name) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อบทบาท' });
    }

    connection = await getConnection();
    await connection.execute(
      'UPDATE roles SET role_name = ?, description = ?, updated_at = NOW() WHERE role_id = ?',
      [role_name, description || null, id]
    );

    res.json({ message: 'อัปเดตบทบาทสำเร็จ', role_id: id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาท', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await getConnection();
    
    // ตรวจสอบว่ามีผู้ใช้ใช้งานบทบาทนี้อยู่หรือไม่
    const [userCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM project_user_roles WHERE role_id = ?',
      [id]
    );

    if (userCount[0].count > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบบทบาทนี้ได้ เนื่องจากมีผู้ใช้งานอยู่ในโครงการ' });
    }

    await connection.execute('DELETE FROM roles WHERE role_id = ?', [id]);
    res.json({ message: 'ลบบทบาทสำเร็จ' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'ไม่สามารถลบบทบาทนี้ได้ เนื่องจากมีการอ้างอิงข้อมูลในส่วนอื่น' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบทบาท', error: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

/**
 * ย้ายโปรเจ็กต์จาก Tender เป็นงานจริง (Win Tender)
 * 1. อัปเดต company_id และ job_number
 * 2. ย้ายโฟลเดอร์ Root เดิมไปที่ [00] Bidding Documents
 * 3. สร้างโครงสร้างโฟลเดอร์มาตรฐานใหม่
 */
const moveProject = async (req, res) => {
  const { id } = req.params;
  const { new_company_id, new_job_number } = req.body;
  let connection;

  try {
    if (!new_company_id || !new_job_number) {
      return res.status(400).json({ message: 'กรุณาระบุบริษัทปลายทางและรหัส Job Number ใหม่' });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    // 1. ตรวจสอบว่าโปรเจ็กต์มีจริงไหม
    const [projectRows] = await connection.execute(
      'SELECT project_id, project_name FROM projects WHERE project_id = ? AND active = 1',
      [id]
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'ไม่พบโครงการ' });
    }

    // 2. อัปเดตข้อมูลโครงการ
    await connection.execute(
      'UPDATE projects SET company_id = ?, job_number = ?, updated_at = NOW() WHERE project_id = ?',
      [new_company_id, new_job_number, id]
    );

    // 3. จัดการโครงสร้างโฟลเดอร์
    // 3.1 ค้นหา Root Folders เดิม (ที่ parent_folder_id เป็น NULL หรือ 0)
    const [rootFolders] = await connection.execute(
      'SELECT folder_id FROM folders WHERE project_id = ? AND (parent_folder_id IS NULL OR parent_folder_id = 0 OR parent_folder_id = "0") AND active = 1',
      [id]
    );

    let biddingFolderId = null;
    if (rootFolders.length > 0) {
      // 3.2 สร้างโฟลเดอร์รวมงานประมูล [00] Bidding Documents
      biddingFolderId = uuidv4();
      await connection.execute(
        'INSERT INTO folders (folder_id, folder_name, parent_folder_id, project_id, created_at, updated_at) VALUES (?, ?, NULL, ?, NOW(), NOW())',
        [biddingFolderId, '[00] Bidding Documents', id]
      );

      // 3.3 ย้าย Root Folders ทั้งหมดเข้าไปอยู่ใต้โฟลเดอร์ประมูล
      for (const folder of rootFolders) {
        await connection.execute(
          'UPDATE folders SET parent_folder_id = ? WHERE folder_id = ?',
          [biddingFolderId, folder.folder_id]
        );
      }
    }

    // 4. สร้างโครงสร้างโฟลเดอร์ทำงานจริงมาตรฐาน (Template)
    const standardFolders = [
      'P-100 Payment / งวดงาน',
      'P-200 Drawing / แบบก่อสร้าง',
      'P-300 Schedule / แผนงาน',
      'P-400 Progress / ความคืบหน้า',
      'P-500 Variation / งานเพิ่ม-ลด',
      'P-600 Material / วัสดุอุปกรณ์',
      'P-700 Manpower / แรงงาน',
      'P-800 Site Photos / รูปภาพหน้างาน',
      'P-900 Safety / ความปลอดภัย'
    ];

    for (const folderName of standardFolders) {
      const folderId = uuidv4();
      await connection.execute(
        'INSERT INTO folders (folder_id, folder_name, parent_folder_id, project_id, created_at, updated_at) VALUES (?, ?, NULL, ?, NOW(), NOW())',
        [folderId, folderName, id]
      );
    }

    await connection.commit();
    res.json({ message: 'ย้ายโครงการและเตรียมโครงสร้างโฟลเดอร์ใหม่เรียบร้อยแล้ว', project_id: id });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Move Project Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการย้ายโครงการ', error: error.message });
  } finally {
    if (connection) await connection.release();
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
  createRole,
  updateRole,
  deleteRole,
  moveProject,
};