//projectController.js
const { getConnection } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'spkbkk@gmail.com',
    pass: process.env.SMTP_PASS || 'bdjd hwrr gbrq srlm',
  },
});

const sendNewTenderEmails = async (projectData, userIds, creatorName) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;

  let connection;
  try {
    connection = await getConnection();
    const placeholders = userIds.map(() => '?').join(',');
    const [users] = await connection.execute(
      `SELECT email, first_name FROM users WHERE user_id IN (${placeholders}) AND active = 1`,
      userIds
    );

    const validEmails = users.map(u => u.email).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (validEmails.length === 0) return;

    const projectLink = `${process.env.FRONTEND_URL || 'https://app.spkconstruction.co.th/cm'}/project/${projectData.project_id}`;
    
    const mailOptions = {
      from: `"SPK Construction" <${process.env.SMTP_USER || 'spkbkk@gmail.com'}>`,
      to: validEmails,
      subject: `🔔 New Tender Created: ${projectData.job_number} - ${projectData.project_name}`,
      html: `
        <div style="font-family: 'sans-serif'; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">พบ Tender ใหม่ในระบบ</h2>
          </div>
          <div style="padding: 24px; color: #1e293b;">
            <p>สวัสดีทีมงาน,</p>
            <p>มีการสร้าง Tender ใหม่ในระบบโดยคุณ <strong>${creatorName}</strong> รายละเอียดเบื้องต้นมีดังนี้:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;">เลขที่งาน (Job #):</td>
                  <td style="padding: 8px 0; font-weight: bold;">${projectData.job_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">ชื่อโครงการ:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${projectData.project_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">เจ้าของโครงการ:</td>
                  <td style="padding: 8px 0;">${projectData.owner}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">วันที่เริ่มงาน:</td>
                  <td style="padding: 8px 0;">${projectData.start_date}</td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${projectLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">ดูรายละเอียดโครงการ</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 SPK Construction - Project Management System
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 New tender email sent to ${validEmails.length} users for project ${projectData.job_number}`);

  } catch (error) {
    console.error('❌ Send New Tender Email Error:', error);
  } finally {
    if (connection) await connection.release();
  }
};

const sendJobCreatedEmails = async (projectData, userIds, creatorName) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;

  let connection;
  try {
    connection = await getConnection();
    const placeholders = userIds.map(() => '?').join(',');
    const [users] = await connection.execute(
      `SELECT email, first_name FROM users WHERE user_id IN (${placeholders}) AND active = 1`,
      userIds
    );

    const validEmails = users.map(u => u.email).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (validEmails.length === 0) return;

    const projectLink = `${process.env.FRONTEND_URL || 'https://app.spkconstruction.co.th/cm'}/project/${projectData.project_id}`;
    
    const mailOptions = {
      from: `"SPK Construction" <${process.env.SMTP_USER || 'spkbkk@gmail.com'}>`,
      to: validEmails,
      subject: `🎉 Job Created (Win Tender): ${projectData.job_number} - ${projectData.project_name}`,
      html: `
        <div style="font-family: 'sans-serif'; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">โครงการประมูลเข้าสู่ระยะก่อสร้างจริง</h2>
          </div>
          <div style="padding: 24px; color: #1e293b;">
            <p>สวัสดีทีมงาน,</p>
            <p>มีการย้าย Tender เข้าสู่ช่วงงานจริงโดยคุณ <strong>${creatorName}</strong> รายละเอียดเบื้องต้นมีดังนี้:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;">เลขที่งาน (Job #):</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #10b981;">${projectData.job_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">จาก Tender:</td>
                  <td style="padding: 8px 0;">${projectData.old_job_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">ชื่อโครงการ:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${projectData.project_name}</td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${projectLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">ดูรายละเอียดโครงการ</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 SPK Construction - Project Management System
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Job Created email sent to ${validEmails.length} users for project ${projectData.job_number}`);

  } catch (error) {
    console.error('❌ Send Job Created Email Error:', error);
  } finally {
    if (connection) await connection.release();
  }
};

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
               p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status, p.is_job_created,
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
               p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status, p.is_job_created,
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
        is_job_created: project.is_job_created || 0,
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
                p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status, p.is_job_created,
                p.company_id
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
                p.bidding_progress, p.design_progress, p.pre_construction_progress, p.construction_progress, p.precast_progress, p.cm_progress, p.job_status_progress, p.tender_status, p.is_job_created,
                p.company_id
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
      is_job_created: project.is_job_created || 0,
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
      show_bidding = 1, show_design = 1, show_pre_construction = 1, show_construction = 1, show_precast = 1, show_cm = 1, show_progress_summary = 1, show_payment = 1, show_job_status = 1,
      bidding_progress = 0, design_progress = 0, pre_construction_progress = 0, construction_progress = 0, precast_progress = 0, cm_progress = 0, job_status_progress = 0, tender_status = 'tender_in_progress',
      template_id, notified_users
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
    await connection.beginTransaction();

    const projectId = uuidv4();
    await connection.execute(
      `INSERT INTO projects (
        project_id, job_number, project_name, description, start_date, end_date, progress, status, active, created_at, updated_at, 
        owner, consusltant, contractor, address, image, progress_summary_image, payment_image, design_image, 
        pre_construction_image, construction_image, cm_image, precast_image, bidding_image, job_status_image,
        show_design, show_pre_construction, show_construction, show_precast, show_cm, show_bidding, show_progress_summary, show_payment, show_job_status,
        bidding_progress, design_progress, pre_construction_progress, construction_progress, precast_progress, cm_progress, job_status_progress, tender_status,
        company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // --- Folder Template Initialization ---
    if (template_id) {
      const [templateItems] = await connection.execute(
        'SELECT * FROM folder_template_items WHERE template_id = ?',
        [template_id]
      );

      if (templateItems.length > 0) {
        const idMap = new Map();
        const userId = req.user.user_id;

        // 1. Get root items (parent_item_id is NULL or 0)
        const roots = templateItems.filter(item => !item.parent_item_id || item.parent_item_id === 0 || item.parent_item_id === '0');
        const queue = [...roots];

        while (queue.length > 0) {
          const item = queue.shift();
          const parentFolderId = item.parent_item_id ? idMap.get(item.parent_item_id) : null;

          const [result] = await connection.execute(
            'INSERT INTO folders (folder_name, parent_folder_id, project_id, created_by, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
            [item.folder_name, parentFolderId, projectId, userId]
          );

          idMap.set(item.item_id, result.insertId);

          const children = templateItems.filter(child => child.parent_item_id === item.item_id);
          queue.push(...children);
        }
      }
    }
    // --------------------------------------

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

    await connection.commit();

    // Trigger email notifications
    if (notified_users) {
      try {
        const userIds = typeof notified_users === 'string' ? JSON.parse(notified_users) : notified_users;
        const [userRows] = await connection.execute('SELECT first_name FROM users WHERE user_id = ?', [req.user.user_id]);
        const creatorName = userRows.length > 0 ? userRows[0].first_name : req.user.username;
        
        // เราไม่รอให้ส่งเสร็จ (Fire and forget) เพื่อความเร็วของ API
        sendNewTenderEmails({
          project_id: projectId,
          job_number,
          project_name,
          owner,
          start_date
        }, userIds, creatorName);
      } catch (err) {
        console.error('❌ Error parsing notified_users or sending emails:', err);
      }
    }

    res.json({ message: 'สร้างโครงการสำเร็จ', project_id: projectId, job_number });
  } catch (error) {
    if (connection) await connection.rollback();
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
      show_design, show_pre_construction, show_construction, show_precast, show_cm,
      bidding_progress, design_progress, pre_construction_progress, construction_progress, precast_progress, cm_progress, job_status_progress, tender_status
    } = req.body;
    const files = req.files || {};

    if (!project_id) {
      console.warn('⚠️ UpdateProject Warning: Missing project_id');
      return res.status(400).json({ message: 'กรุณาระบุ project_id' });
    }

    console.log(`📝 Attempting to update project: ${project_id}`);
    console.log(`📦 Request Body:`, req.body);
    console.log(`🏢 Company ID from header: ${req.companyId}`);

    connection = await getConnection();

    // Verify company isolation
    if (!req.companyId) {
      console.error('❌ UpdateProject Error: Missing companyId in request');
      return res.status(400).json({ message: 'กรุณาระบุ Company ID (X-Company-Id header required)' });
    }

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

    // Detailed check for mandatory fields
    const missingFields = [];
    if (!final_project_name) missingFields.push('project_name');
    if (!final_job_number) missingFields.push('job_number');
    if (!final_owner) missingFields.push('owner');
    if (!final_consusltant) missingFields.push('consusltant');
    if (!final_contractor) missingFields.push('contractor');
    if (!final_address) missingFields.push('address');

    if (missingFields.length > 0) {
      console.warn(`⚠️ UpdateProject Warning: Missing mandatory fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        message: `กรุณาระบุข้อมูลที่จำเป็น: ${missingFields.join(', ')}`,
        missing_fields: missingFields 
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
      
      console.log(`🔍 Executing Update Query: ${query}`);
      console.log(`🔢 With Values:`, values);
      
      await connection.execute(query, values);
      console.log(`✅ Project ${project_id} updated successfully`);
    } else {
      console.warn(`⚠️ No fields to update for project ${project_id}`);
    }

    res.json({ message: 'แก้ไขโครงการสำเร็จ', project_id, ...imagePaths });
  } catch (error) {
    console.error(`❌ UpdateProject Error:`, error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์', 
      error: error.message,
      debug: {
        project_id: req.params.id || req.body.project_id,
        company_id: req.companyId,
        query: error.sql || 'N/A'
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
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
  const { new_company_id, new_job_number, template_id, notified_users } = req.body;
  let connection;

  try {
    if (!new_company_id || !new_job_number) {
      return res.status(400).json({ message: 'กรุณาระบุบริษัทปลายทางและรหัส Job Number ใหม่' });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    // 1. ตรวจสอบและดึงข้อมูลโปรเจ็กต์เดิม
    const [projectRows] = await connection.execute(
      'SELECT * FROM projects WHERE project_id = ? AND active = 1',
      [id]
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'ไม่พบโครงการต้นฉบับ' });
    }

    const oldProject = projectRows[0];
    const newProjectId = uuidv4();
    const userId = req.user.user_id;

    // 2. สร้างโครงการใหม่ (สำเนาจากที่เดิม) 
    // เราจะใช้ข้อมูลทั้งหมดจากโครงการเดิม แต่เปลี่ยน company_id, job_number และ reset progress บางส่วน
    await connection.execute(
      `INSERT INTO projects (
        project_id, job_number, project_name, description, start_date, end_date, progress, status, active, created_at, updated_at, 
        owner, consusltant, contractor, address, image, progress_summary_image, payment_image, design_image, 
        pre_construction_image, construction_image, cm_image, precast_image, bidding_image, job_status_image,
        show_design, show_pre_construction, show_construction, show_precast, show_cm, show_bidding, show_progress_summary, show_payment, show_job_status,
        bidding_progress, design_progress, pre_construction_progress, construction_progress, precast_progress, cm_progress, job_status_progress, tender_status,
        company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newProjectId, new_job_number, oldProject.project_name, oldProject.description, 
        oldProject.start_date, oldProject.end_date, 0, 'Planning', 1,
        oldProject.owner, oldProject.consusltant, oldProject.contractor, oldProject.address,
        oldProject.image, oldProject.progress_summary_image, oldProject.payment_image, oldProject.design_image,
        oldProject.pre_construction_image, oldProject.construction_image, oldProject.cm_image, oldProject.precast_image, oldProject.bidding_image, oldProject.job_status_image,
        oldProject.show_design, oldProject.show_pre_construction, oldProject.show_construction, oldProject.show_precast, oldProject.show_cm, oldProject.show_bidding, oldProject.show_progress_summary, oldProject.show_payment, oldProject.show_job_status,
        0, 0, 0, 0, 0, 0, 0, 'tender_in_progress', // สถานะในโครงการใหม่ 
        new_company_id
      ]
    );

    // 3. คัดลอกรหัสพนักงานและสิทธิ์ (Project User Roles)
    await connection.execute(
      'INSERT INTO project_user_roles (project_id, user_id, role_id) SELECT ?, user_id, role_id FROM project_user_roles WHERE project_id = ?',
      [newProjectId, id]
    );

    // 4. อัปเดตสถานะโครงการเดิมในหน้า Tender ให้เป็น 'ได้งาน (Win)' และ ล็อคไม่ให้เปลี่ยนสถานะอีก
    await connection.execute(
      "UPDATE projects SET tender_status = 'tender_win', is_job_created = 1, updated_at = NOW() WHERE project_id = ?",
      [id]
    );

    // 5. จัดการโครงสร้างโฟลเดอร์ในโครงการใหม่
    if (template_id) {
      const [templateItems] = await connection.execute(
        'SELECT * FROM folder_template_items WHERE template_id = ?',
        [template_id]
      );

      if (templateItems.length > 0) {
        const idMap = new Map();
        const roots = templateItems.filter(item => !item.parent_item_id);
        const queue = [...roots];

        while (queue.length > 0) {
          const item = queue.shift();
          const parentFolderId = item.parent_item_id ? idMap.get(item.parent_item_id) : null;

          const [result] = await connection.execute(
            'INSERT INTO folders (folder_name, parent_folder_id, project_id, created_by, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
            [item.folder_name, parentFolderId, newProjectId, userId]
          );

          idMap.set(item.item_id, result.insertId);
          const children = templateItems.filter(child => child.parent_item_id === item.item_id);
          queue.push(...children);
        }
      }
    }

    await connection.commit();

    // Trigger email notifications
    if (notified_users) {
      try {
        const userIds = typeof notified_users === 'string' ? JSON.parse(notified_users) : notified_users;
        const [userRows] = await connection.execute('SELECT first_name FROM users WHERE user_id = ?', [req.user.user_id]);
        const creatorName = userRows.length > 0 ? userRows[0].first_name : req.user.username;
        
        sendJobCreatedEmails({
          project_id: newProjectId,
          job_number: new_job_number,
          old_job_number: oldProject.job_number,
          project_name: oldProject.project_name
        }, userIds, creatorName);
      } catch (err) {
        console.error('❌ Error parsing notified_users or sending emails:', err);
      }
    }

    res.json({ message: 'คัดลอกโครงการสู่ช่วงงานจริงเรียบร้อยแล้ว ( Tender เดิมยังคงอยู่ )', original_project_id: id, new_project_id: newProjectId });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Move (Clone) Project Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการคัดลอกโครงการ', error: error.message });
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