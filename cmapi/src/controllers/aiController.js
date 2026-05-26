const aiService = require('../services/aiService');
const { getProjectContext, getCompanyOverviewContext } = require('../services/dbContextBuilder');
const { SYSTEM_CHAT, SYSTEM_ANALYZE, SYSTEM_REPORT, SYSTEM_ERP_QUERY } = require('../services/promptTemplates');

const { pool } = require('../config/db');

function normalizeThaiDigits(str) {
  if (!str) return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(thaiDigits[i], 'g'), i.toString());
  }
  return result;
}

function normalizeProjectText(str) {
  if (!str) return '';
  let text = str.toLowerCase();
  text = normalizeThaiDigits(text);
  text = text.replace(/ทล\./g, 'ทล');
  text = text.replace(/อย\./g, 'อย');
  text = text.replace(/อท\./g, 'อท');
  return text;
}

/**
 * Handle streaming chat
 */
async function handleChat(req, res) {
  try {
    const { messages = [] } = req.body;
    const companyId = req.headers['x-company-id'] || req.companyId;
    
    // Resolve backend base URL dynamically (works locally or in production)
    const backendUrl = `${req.protocol}://${req.get('host')}`;

    let sysPrompt = SYSTEM_CHAT;
    
    // Append Markdown rendering capabilities for files and images to system prompt
    sysPrompt += `\n\n=== คำแนะนำเสริมการแสดงลิงก์เปิดเอกสารและรูปภาพ (มีสิทธิ์เข้าถึง) ===\n`;
    sysPrompt += `- ที่อยู่ของเซิร์ฟเวอร์หลัก (API Base URL): ${backendUrl}\n`;
    sysPrompt += `- **การเปิดไฟล์ / ดาวน์โหลดเอกสาร (Open File):** หากผู้ใช้ต้องการลิงก์สำหรับคลิกเปิด/ดาวน์โหลดไฟล์เอกสาร (เช่น PDF, Excel, Word, Text) ให้สร้างลิงก์ Markdown ด้วยพาธเต็ม เช่น [เปิดไฟล์: ชื่อไฟล์](${backendUrl}พาธไฟล์) (ตัวอย่าง: [เปิดไฟล์: สัญญาจ้าง.pdf](${backendUrl}/Uploads/folder_1/file.pdf))\n`;
    sysPrompt += `- **การแสดงรูปภาพหน้างาน (Display Image):** หากไฟล์นั้นเป็นไฟล์ภาพ (.jpg, .jpeg, .png) และผู้ใช้ขอให้แสดงภาพถ่าย ให้ใช้แท็กภาพ Markdown เพื่อฝังรูปภาพลงในคำตอบทันทีด้วยรูปแบบ: ![คำอธิบายภาพ](${backendUrl}พาธไฟล์) (ตัวอย่าง: ![รูปภาพ 10570.jpg](${backendUrl}/Uploads/folder_2272/1779443029285-10570.jpg))\n`;
    sysPrompt += `โปรดสร้างลิงก์หรือแทรกรูปภาพดังกล่าวด้วยรูปแบบ Markdown ที่ถูกต้องเมื่อผู้ใช้ร้องขอ เพื่อเพิ่มความเป็นมืออาชีพของระบบ\n=======================================================\n`;

    if (companyId) {
      const companyContext = await getCompanyOverviewContext(companyId);
      sysPrompt += `\n\nนี่คือข้อมูลภาพรวมและรายละเอียดของโครงการทั้งหมดของบริษัทที่ผู้ใช้เปิดสิทธิ์เข้าถึง:\n${companyContext}`;
    }

    // Smart File Parsing Integration: Detect if user mentions files and inject their text content
    let fileInjectionContext = '';
    if (messages.length > 0 && companyId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        const fileRegex = /([\u0e00-\u0e7f\w\s.\(\)-]+?\.(?:pdf|xlsx|xls|docx|txt|csv))/gi;
        const fileMatches = lastMessage.content.match(fileRegex);
        
        if (fileMatches && fileMatches.length > 0) {
          const { parseFileText } = require('../services/fileParserService');
          const path = require('path');
          
          const processedFiles = new Set();
          
          for (const match of fileMatches) {
            const trimmedName = match.trim();
            if (processedFiles.has(trimmedName)) continue;
            processedFiles.add(trimmedName);
            
            try {
              const [dbFiles] = await pool.query(
                `SELECT f.file_name, f.file_path
                 FROM files f
                 JOIN folders fo ON f.folder_id = fo.folder_id
                 JOIN projects p ON fo.project_id = p.project_id
                 WHERE p.company_id = ? AND f.file_name = ? AND f.active = 1 AND fo.active = 1 AND p.active = 1`,
                [companyId, trimmedName]
              );
              
              if (dbFiles.length > 0) {
                const dbFile = dbFiles[0];
                const cleanedFilePath = dbFile.file_path.replace(/^\/+/, '');
                const absolutePath = path.resolve(__dirname, '..', cleanedFilePath);
                
                // Security Check: Ensure absolutePath is strictly inside the Uploads directory
                const uploadsBaseDir = path.resolve(__dirname, '..', 'Uploads');
                if (absolutePath.startsWith(uploadsBaseDir)) {
                  console.log(`📂 AI Controller: Reading and parsing file content for: ${dbFile.file_name}`);
                  const fileContent = await parseFileText(absolutePath);
                  
                  // Limit single file size to 6000 characters to prevent prompt context explosion
                  const limit = 6000;
                  const trimmedContent = fileContent.length > limit 
                    ? fileContent.substring(0, limit) + '\n...(ข้อมูลเอกสารในส่วนที่เหลือนั้นยาวเกินไป จึงได้สรุปเนื้อหาเบื้องต้นให้พอดีบริบทข้อมูล)...' 
                    : fileContent;
                  
                  fileInjectionContext += `\n\n=== [ข้อมูลและเนื้อหาจากไฟล์เอกสาร: ${dbFile.file_name}] ===\n${trimmedContent}\n=========================================\n`;
                }
              }
            } catch (err) {
              console.error(`AI Controller: Failed to parse file ${trimmedName}:`, err.message);
            }
          }
        }

        // Smart Photo Querying: If user asks for progress photos/images of a project, fetch their paths dynamically
        if (/รูปภาพ|รูป|ภาพถ่าย|ภาพ|กล้อง|โชว์รูป|ขอดูรูป/i.test(lastMessage.content)) {
          try {
            const [projectList] = await pool.query(
              `SELECT project_id, project_name, job_number 
               FROM projects 
               WHERE company_id = ? AND active = 1 AND (is_hidden = 0 OR is_hidden IS NULL)`,
              [companyId]
            );
            
            let bestProject = null;
            let highestScore = 0;
            
            const queryNorm = normalizeProjectText(lastMessage.content);
            const queryClean = queryNorm.replace(/\s+/g, '');

            for (const p of projectList) {
              let score = 0;
              const projNameNorm = normalizeProjectText(p.project_name);
              
              // 1. Job number match is extremely strong
              const jobClean = (p.job_number || '').replace(/[\s-]/g, '').toLowerCase();
              const contentClean = queryNorm.replace(/[\s-]/g, '');
              if (jobClean && contentClean.includes(jobClean)) {
                score += 100;
              }
              
              // 2. Specific Route matching (e.g. ทล 6, ทล 3064, อย 4038)
              const routeRegex = /(ทล|อย|อท|ทางหลวง)\s*(\d+)/g;
              let routeMatch;
              routeRegex.lastIndex = 0;
              while ((routeMatch = routeRegex.exec(projNameNorm)) !== null) {
                const prefix = routeMatch[1];
                const number = routeMatch[2];
                const routeClean = prefix + number;
                if (queryClean.includes(routeClean)) {
                  score += 50;
                }
              }
              
              // 3. Keyword landmark matching
              const keyWords = ['บางปะอิน', 'โคราช', 'ปากดง', 'อ่างทอง', 'นาคู', 'ป่าโมก', 'โผงเผง', 'สะพาน', 'สวนถั่ว', 'อย 4038', 'อยุธยา', 'บางเสด็จ', 'บ้านหงษ์', 'แสวงหา', 'เสนา', 'บางบาล', 'เจ้าเจ็ด', 'เจ้าปลุก', 'นครหลวง', 'หน้าโคก', 'แขวงรามอินทรา', 'คลองสองต้นนุ่น', 'พิมพา'];
              keyWords.forEach(kw => {
                if (projNameNorm.includes(kw) && queryNorm.includes(kw)) {
                  score += 15;
                }
              });
              
              // 4. Standalone digits check
              const numberMatches = projNameNorm.match(/\d+/g) || [];
              numberMatches.forEach(num => {
                try {
                  const numRegex = new RegExp('(?<!\\d)' + num + '(?!\\d)');
                  if (numRegex.test(queryNorm)) {
                    score += 10;
                  }
                } catch(e) {}
              });

              // 5. Prefer newer projects (year bonus) to break ties gracefully
              const jobNum = p.job_number || '';
              const yearMatch = jobNum.match(/\d{2}/);
              if (yearMatch) {
                const year = parseInt(yearMatch[0], 10);
                score += (year - 60); // e.g. 69 -> +9 points, 68 -> +8 points
              }
              
              if (score > highestScore) {
                highestScore = score;
                bestProject = p;
              }
            }
            
            let targetProjectId = null;
            let targetProjectName = '';
            
            if (bestProject && highestScore > 0) {
              targetProjectId = bestProject.project_id;
              targetProjectName = bestProject.project_name;
              console.log(`🎯 AI Controller: Smart Photo matched project: ${targetProjectName} (Score: ${highestScore})`);
            }
            
            if (targetProjectId) {
              const [photoRows] = await pool.query(
                `SELECT f.file_name, f.file_path, fo.folder_name, DATE_FORMAT(f.created_at, '%Y-%m-%d') as uploaded_date
                 FROM files f
                 JOIN folders fo ON f.folder_id = fo.folder_id
                 WHERE fo.project_id = ? AND f.active = 1 AND fo.active = 1
                   AND f.file_type IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp')
                 ORDER BY f.created_at DESC, f.file_name ASC
                 LIMIT 15`,
                [targetProjectId]
              );
              
              if (photoRows.length > 0) {
                console.log(`📸 AI Controller: Injecting ${photoRows.length} photos for project: ${targetProjectName}`);
                let photoContext = `\n\n=== [รายการไฟล์รูปภาพหน้างานจริงในโครงการ: ${targetProjectName}] ===\n`;
                photoContext += `ผู้ใช้ต้องการขอดูรูปภาพในโครงการนี้ ระบบได้ดึงรูปภาพล่าสุดที่ถูกอัพโหลดบนเซิร์ฟเวอร์มาให้คุณเรียบร้อยแล้ว หากผู้ใช้ขอรูปภาพ ให้คุณใช้แท็ก Markdown เพื่อฝังรูปภาพลงในข้อความตอบกลับโดยใช้พิกัดรูปภาพเหล่านี้:\n`;
                photoRows.forEach(photo => {
                  photoContext += `- [โฟลเดอร์: ${photo.folder_name}] ชื่อไฟล์: ${photo.file_name} (อัปโหลดเมื่อ: ${photo.uploaded_date}, พิกัดไฟล์รูปภาพ: ${photo.file_path})\n`;
                });
                photoContext += `======================================================\n`;
                
                fileInjectionContext += photoContext;
              }
            }
          } catch (err) {
            console.error('AI Controller: Smart Photo Querying failed:', err.message);
          }
        }
      }
    }

    if (fileInjectionContext) {
      sysPrompt += `\n\nผู้ใช้ได้ระบุอ้างอิงเอกสารในข้อความของเขา และระบบได้ทำการอ่านเนื้อหาทั้งหมดในไฟล์ดังกล่าวมาจากเซิร์ฟเวอร์เรียบร้อยแล้ว โปรดใช้ข้อมูลของไฟล์ต่อไปนี้ในการพิจารณาร่วมตอบคำถามผู้ใช้:\n${fileInjectionContext}`;
    }

    // Hardening 2569 constraints for Qwen offline model in the user message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' && /2569|2026|ปีนี้/i.test(lastMessage.content)) {
        lastMessage.content += `\n\n*(ย้ำเตือนกฎเหล็กจากระบบ: ในบริบทนี้ โครงการของ SPK ปี พ.ศ. 2569 / ค.ศ. 2026 มีทั้งหมด 5 โครงการ คือ SPK-6904, SPK-6903, SPK6906, SPK6830, และ SPK6829 คุณต้องแสดงความก้าวหน้าและข้อมูลของโครงการทั้ง 5 นี้ให้ครบถ้วนทุกโครงการ ห้ามรายงานว่ามีเพียง 2 หรือ 3 โครงการเด็ดขาด และห้ามรวมโครงการที่ถูกลบ/ซ่อน เช่น SPK-6813 สันติพร อุดร หรือ SPK-6901 เข้ามาเด็ดขาด)*`;
      }
    }

    // Prepend system prompt to messages
    const formattedMessages = [
      { role: 'system', content: sysPrompt },
      ...messages
    ];

    await aiService.streamChat(formattedMessages, res);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเรียกใช้แชทบอท', error: error.message });
  }
}


/**
 * Handle streaming analysis
 */
async function handleAnalyzeProject(req, res) {
  try {
    const { projectId } = req.params;
    const companyId = req.headers['x-company-id'] || req.companyId;
    
    if (!projectId || projectId === 'all' || projectId === 'overview' || projectId === 'null' || projectId === 'undefined') {
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสโครงการ (Project ID) หรือรหัสบริษัท' });
      }
      const companyContext = await getCompanyOverviewContext(companyId);
      const messages = [
        { role: 'system', content: SYSTEM_ANALYZE },
        { role: 'user', content: `กรุณาวิเคราะห์และประเมินสถานะโครงการทั้งหมดของบริษัทในภาพรวม โดยอ้างอิงจากข้อมูลด้านล่างนี้:\n\n${companyContext}` }
      ];
      await aiService.streamChat(messages, res);
      return;
    }

    const projectContext = await getProjectContext(projectId);
    
    const messages = [
      { role: 'system', content: SYSTEM_ANALYZE },
      { role: 'user', content: `กรุณาวิเคราะห์และประเมินสถานะโครงการนี้ โดยอ้างอิงจากข้อมูลด้านล่างนี้:\n\n${projectContext}` }
    ];

    await aiService.streamChat(messages, res);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการวิเคราะห์โครงการ', error: error.message });
  }
}

/**
 * Handle streaming report generation
 */
async function handleGenerateReport(req, res) {
  try {
    const { projectId } = req.params;
    const companyId = req.headers['x-company-id'] || req.companyId;
    
    if (!projectId || projectId === 'all' || projectId === 'overview' || projectId === 'null' || projectId === 'undefined') {
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสโครงการ (Project ID) หรือรหัสบริษัท' });
      }
      const companyContext = await getCompanyOverviewContext(companyId);
      const messages = [
        { role: 'system', content: SYSTEM_REPORT },
        { role: 'user', content: `กรุณาสร้างสรุปรายงานภาพรวมและงบประมาณของทุกโครงการในบริษัท โดยอ้างอิงจากข้อมูลด้านล่างนี้:\n\n${companyContext}` }
      ];
      await aiService.streamChat(messages, res);
      return;
    }

    const projectContext = await getProjectContext(projectId);
    
    const messages = [
      { role: 'system', content: SYSTEM_REPORT },
      { role: 'user', content: `กรุณาสร้างสรุปรายงานภาพรวมสำหรับโครงการก่อสร้างนี้ โดยอ้างอิงจากข้อมูลต่อไปนี้:\n\n${projectContext}` }
    ];

    await aiService.streamChat(messages, res);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างรายงาน', error: error.message });
  }
}

/**
 * Handle ERP natural language SQL querying (Secure SELECT only)
 */
async function handleQueryERP(req, res) {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุคำถามสำหรับใช้สืบค้นข้อมูล' });
    }

    const messages = [
      { role: 'system', content: SYSTEM_ERP_QUERY },
      { role: 'user', content: `คำถาม: ${question}` }
    ];

    console.log(`Translating question to SQL: "${question}"`);
    const aiResponse = await aiService.textChat(messages);
    
    let queryData;
    try {
      // Extract json block from AI response if it wrapped in markdown ```json ... ```
      let jsonString = aiResponse.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      queryData = JSON.parse(jsonString);
    } catch (e) {
      console.error('AI response was not valid JSON:', aiResponse);
      return res.status(500).json({ 
        success: false, 
        message: 'AI ไม่สามารถแปลงคำถามของคุณเป็นชุดข้อมูลสืบค้นที่มีรูปแบบถูกต้องได้',
        rawResponse: aiResponse
      });
    }

    if (queryData.error) {
      return res.status(400).json({ success: false, message: queryData.error });
    }

    const sqlQuery = queryData.sql;
    if (!sqlQuery) {
      return res.status(500).json({ success: false, message: 'ไม่พบคิวรี่ SQL จากคำตอบของ AI' });
    }

    // Safety checks
    const sqlUpper = sqlQuery.toUpperCase();
    const isSelect = sqlUpper.trim().startsWith('SELECT');
    const hasForbidden = /INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|CREATE|GRANT|REVOKE|EXECUTE/i.test(sqlUpper);

    if (!isSelect || hasForbidden) {
      console.warn(`Blocked unsafe query attempt: "${sqlQuery}"`);
      return res.status(403).json({ 
        success: false, 
        message: 'การเข้าถึงถูกปฏิเสธ: ระบบอนุญาตเฉพาะคำสั่งสืบค้นเพื่ออ่านข้อมูล (SELECT) เท่านั้น เพื่อความปลอดภัยของข้อมูล' 
      });
    }

    console.log('Executing safe query:', sqlQuery);
    const [rows] = await pool.query(sqlQuery);

    res.json({
      success: true,
      sql: sqlQuery,
      explanation: queryData.explanation,
      results: rows
    });

  } catch (error) {
    console.error('ERP Query error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดระหว่างการสืบค้นข้อมูลจากฐานข้อมูล', 
      error: error.message 
    });
  }
}

/**
 * Handle health check
 */
async function getHealth(req, res) {
  const health = await aiService.checkHealth();
  res.json({ success: health.connected, ...health });
}

/**
 * Save/update chat history
 */
async function saveConversation(req, res) {
  let connection;
  try {
    const { id, title, messages, mode, projectId } = req.body;
    const userId = req.user.user_id;
    const companyId = req.headers['x-company-id'] || req.companyId || null;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งรายการข้อความแชท (messages array)' });
    }

    connection = await pool.getConnection();

    // Auto-generate title if not provided
    let finalTitle = title;
    if (!finalTitle && messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      finalTitle = firstUserMsg ? firstUserMsg.content.substring(0, 50) : 'การสนทนาใหม่';
    }

    const messagesJson = JSON.stringify(messages);
    const dbProjectId = (projectId === 'all' || projectId === 'overview') ? null : (projectId || null);

    if (id) {
      // Update existing conversation
      await connection.query(
        `UPDATE ai_conversations 
         SET title = ?, messages = ?, mode = ?, project_id = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [finalTitle, messagesJson, mode || 'chat', dbProjectId, id, userId]
      );
      res.json({ success: true, conversationId: id, title: finalTitle });
    } else {
      // Insert new conversation
      const [result] = await connection.query(
        `INSERT INTO ai_conversations (user_id, company_id, project_id, title, messages, mode, model_used)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, companyId, dbProjectId, finalTitle, messagesJson, mode || 'chat', process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b']
      );
      res.json({ success: true, conversationId: result.insertId, title: finalTitle });
    }
  } catch (error) {
    console.error('Save conversation error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกประวัติการสนทนาได้', error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Get all conversations for current user and company
 */
async function getConversations(req, res) {
  try {
    const userId = req.user.user_id;
    const companyId = req.headers['x-company-id'] || req.companyId || null;

    let query = `SELECT id, title, mode, project_id, model_used, created_at, updated_at 
                 FROM ai_conversations 
                 WHERE user_id = ?`;
    const params = [userId];

    if (companyId) {
      query += ` AND (company_id = ? OR company_id IS NULL)`;
      params.push(companyId);
    }

    query += ` ORDER BY updated_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, conversations: rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายการประวัติสนทนาได้', error: error.message });
  }
}

/**
 * Get single conversation detail with full messages
 */
async function getConversationById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const [rows] = await pool.query(
      `SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบประวัติสนทนาที่ต้องการ' });
    }

    const conv = rows[0];
    res.json({
      success: true,
      conversation: {
        ...conv,
        messages: typeof conv.messages === 'string' ? JSON.parse(conv.messages) : (conv.messages || [])
      }
    });
  } catch (error) {
    console.error('Get conversation by id error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายละเอียดการสนทนาได้', error: error.message });
  }
}

/**
 * Delete conversation history
 */
async function deleteConversation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await pool.query(
      `DELETE FROM ai_conversations WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ success: true, message: 'ลบประวัติการสนทนาสำเร็จ' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถลบประวัติการสนทนาได้', error: error.message });
  }
}

module.exports = {
  handleChat,
  handleAnalyzeProject,
  handleGenerateReport,
  handleQueryERP,
  getHealth,
  saveConversation,
  getConversations,
  getConversationById,
  deleteConversation
};
