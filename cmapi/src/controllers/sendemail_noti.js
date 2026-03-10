// controllers/sendemail_noti.js
const nodemailer = require('nodemailer');
const { getConnection } = require('../config/db');
require('dotenv').config();

// ✅ แก้ไข: ใช้ createTransport (ไม่มี 's' ท้าย)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // ใช้ TLS สำหรับ port 587
  auth: {
    user: process.env.SMTP_USER || 'spkbkk@gmail.com',
    pass: process.env.SMTP_PASS || 'bdjd hwrr gbrq srlm',
  },
});

// ตรวจสอบการเชื่อมต่อ SMTP เมื่อเริ่มต้น
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error.message);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// ฟังก์ชันสำหรับ query emails จาก usernames (bulk)
const getUserEmails = async (connection, usernames) => {
  if (!usernames || !Array.isArray(usernames) || usernames.length === 0) return [];

  const placeholders = usernames.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT username, email FROM users WHERE username IN (${placeholders}) AND active = 1`,
    usernames
  );

  const validEmails = rows.map(row => row.email).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  console.log(`📧 Found valid emails for ${usernames.length} users: ${validEmails.length} emails (${validEmails.join(', ')})`);
  return validEmails;
};

// ฟังก์ชันสำหรับสร้าง HTML template ที่รองรับ multiple files
const createEmailTemplate = (fileCount, folderName, projectName, projectLink, uploadedBy) => {
  const currentDate = new Date().toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>แจ้งเตือนไฟล์ใหม่</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Kanit', sans-serif;
                line-height: 1.4;
                color: #262626;
                background-color: #f5f5f5;
                padding: 8px;
            }
            
            .container {
                max-width: 480px;
                margin: 0 auto;
                background: white;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                overflow: hidden;
                border: 1px solid #d9d9d9;
            }
            
            .header {
                background: #1890ff;
                color: white;
                padding: 16px;
                text-align: center;
            }
            
            .header-icon {
                font-size: 24px;
                margin-bottom: 4px;
            }
            
            .header-title {
                font-size: 16px;
                font-weight: 400;
            }
            
            .content {
                padding: 16px;
            }
            
            .alert {
                background: #e6f7ff;
                border: 1px solid #91d5ff;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .alert-title {
                font-size: 14px;
                font-weight: 500;
                color: #1890ff;
                margin-bottom: 4px;
            }
            
            .alert-text {
                font-size: 12px;
                color: #595959;
            }
            
            .file-card {
                background: #fafafa;
                border: 1px solid #d9d9d9;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .file-name {
                font-size: 14px;
                font-weight: 500;
                color: #262626;
                margin-bottom: 8px;
                word-break: break-word;
            }
            
            .file-details {
                display: grid;
                gap: 4px;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
            }
            
            .detail-label {
                color: #8c8c8c;
                min-width: 60px;
            }
            
            .detail-value {
                color: #262626;
                text-align: right;
                font-weight: 400;
                max-width: 60%;
                word-break: break-word;
            }
            
            .btn-container {
                text-align: center;
                margin: 16px 0;
            }
            
            .btn {
                display: inline-block;
                background: #1890ff;
                color: white;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 400;
                transition: background-color 0.3s;
            }
            
            .btn:hover {
                background: #40a9ff;
            }
            
            .timestamp {
                background: #f0f0f0;
                border: 1px solid #d9d9d9;
                padding: 8px;
                border-radius: 6px;
                font-size: 11px;
                color: #595959;
                text-align: center;
                margin: 12px 0;
            }
            
            .footer {
                background: #001529;
                color: white;
                padding: 12px;
                text-align: center;
            }
            
            .footer-title {
                font-size: 13px;
                font-weight: 500;
                margin-bottom: 2px;
            }
            
            .footer-subtitle {
                font-size: 11px;
                color: #8c8c8c;
            }
            
            .note {
                background: #fffbe6;
                border: 1px solid #ffe58f;
                border-radius: 6px;
                padding: 8px;
                margin-top: 12px;
            }
            
            .note-text {
                font-size: 10px;
                color: #d48806;
                text-align: center;
            }
            
            @media (max-width: 480px) {
                body {
                    padding: 4px;
                }
                
                .container {
                    border-radius: 6px;
                }
                
                .header {
                    padding: 12px;
                }
                
                .content {
                    padding: 12px;
                }
                
                .file-card {
                    padding: 10px;
                }
                
                .detail-row {
                    font-size: 11px;
                }
                
                .btn {
                    padding: 8px 16px;
                    font-size: 12px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-icon">📁</div>
                <div class="header-title">แจ้งเตือนไฟล์ใหม่</div>
            </div>
            
            <div class="content">
                <div class="alert">
                    <div class="alert-title">อัพโหลดไฟล์ใหม่ ${fileCount} ไฟล์</div>
                    <div class="alert-text">มีไฟล์ใหม่เพิ่มเข้ามาในโปรเจกต์</div>
                </div>

                <div class="file-card">
                    <div class="file-name">📄 ไฟล์ใหม่ ${fileCount} ไฟล์</div>
                    <div class="file-details">
                        <div class="detail-row">
                            <span class="detail-label">โฟลเดอร์:</span>
                            <span class="detail-value">${folderName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">โปรเจกต์:</span>
                            <span class="detail-value">${projectName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">อัพโหลดโดย:</span>
                            <span class="detail-value">${uploadedBy}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">จำนวนไฟล์:</span>
                            <span class="detail-value">${fileCount} ไฟล์</span>
                        </div>
                    </div>
                </div>

                <div class="btn-container">
                    <a href="${projectLink}" class="btn">ดูโปรเจกต์</a>
                </div>

                <div class="timestamp">
                    📅 ${currentDate}
                </div>

                <div class="note">
                    <div class="note-text">
                        💡 หากไม่ต้องการรับแจ้งเตือน กรุณาติดต่อผู้ดูแลระบบ
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="footer-title">SPK Construction</div>
                <div class="footer-subtitle">ระบบจัดการโปรเจกต์</div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Controller สำหรับส่งอีเมลแจ้งเตือน (ปรับให้ match frontend)
const sendEmailNotification = async (req, res) => {
  let connection;
  try {
    const { id: projectId } = req.params;
    const { folderId, users, fileCount, folderName } = req.body;  // ✅ รับจาก frontend: users (usernames), fileCount

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!folderId || !users || !Array.isArray(users) || users.length === 0 || !fileCount || !folderName) {
      return res.status(400).json({ 
        message: 'ข้อมูลที่จำเป็นไม่ครบถ้วน',
        required: ['folderId', 'users (array of usernames)', 'fileCount', 'folderName']
      });
    }

    connection = await getConnection();

    // Query project_name
    const [projects] = await connection.execute(
      'SELECT project_name FROM projects WHERE project_id = ? AND active = 1',
      [projectId]
    );
    if (projects.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโปรเจกต์' });
    }
    const projectName = projects[0].project_name;

    // Verify folder
    const [folders] = await connection.execute(
      'SELECT folder_name FROM folders WHERE folder_id = ? AND project_id = ? AND active = 1',
      [folderId, projectId]
    );
    if (folders.length === 0 || folders[0].folder_name !== folderName) {
      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์หรือชื่อไม่ตรง' });
    }

    // Query recent uploaded_by (สมมติจากไฟล์ล่าสุดใน folder, LIMIT 1)
    const [files] = await connection.execute(
      `SELECT uploaded_by FROM files 
       WHERE folder_id = ? AND active = 1 
       ORDER BY created_at DESC LIMIT 1`,
      [folderId]
    );
    if (files.length === 0) {
      return res.status(404).json({ message: 'ไม่พบไฟล์ในโฟลเดอร์ (ใช้สำหรับหา uploaded_by)' });
    }
    const uploadedById = files[0].uploaded_by;

    // Query uploadedBy name
    const [userRows] = await connection.execute(
      'SELECT first_name FROM users WHERE user_id = ? AND active = 1',
      [uploadedById]
    );
    const uploadedBy = userRows.length > 0 ? userRows[0].first_name || 'ไม่ระบุ' : 'ไม่ระบุ';

    // ✅ Query emails จาก usernames
    const validEmails = await getUserEmails(connection, users);

    if (validEmails.length === 0) {
      return res.status(400).json({ message: 'ไม่มีอีเมลที่ถูกต้องสำหรับผู้ใช้ที่เลือก' });
    }

    // สร้างลิงก์ไปยังหน้าโปรเจกต์
    const projectLink = `${process.env.FRONTEND_URL || 'https://app.spkconstruction.co.th'}/project/${projectId}`;

    // สร้าง HTML template (ปรับสำหรับ multiple files)
    const htmlContent = createEmailTemplate(fileCount, folderName, projectName, projectLink, uploadedBy);

    // กำหนดเนื้อหาอีเมล
    const mailOptions = {
      from: `"SPK Construction" <${process.env.SMTP_USER || 'spkbkk@gmail.com'}>`,
      to: validEmails,  // ✅ Array ของ emails
      subject: `🔔 ไฟล์ใหม่ ${fileCount} ไฟล์: ${projectName}`,
      html: htmlContent,
      text: `
แจ้งเตือนไฟล์ใหม่

จำนวนไฟล์: ${fileCount} ไฟล์
โฟลเดอร์: ${folderName}
โปรเจกต์: ${projectName}
อัพโหลดโดย: ${uploadedBy}

ดูที่: ${projectLink}

SPK Construction
      `,
    };

    // ส่งอีเมล
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent:', {
      messageId: info.messageId,
      recipients: validEmails.length,
      fileCount,
      projectName,
      projectLink,
      environment: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'https://app.spkconstruction.co.th',
      skippedUsers: users.length - validEmails.length
    });

    res.status(200).json({ 
      message: 'ส่งแจ้งเตือนสำเร็จ',
      messageId: info.messageId,
      recipientCount: validEmails.length,
      projectName,
      fileCount,
      skipped: users.length - validEmails.length
    });

  } catch (error) {
    console.error('Email error:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      body: req.body,  // Log body สำหรับ debug
      environment: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'https://app.spkconstruction.co.th'
    });
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการส่งอีเมล',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { sendEmailNotification };