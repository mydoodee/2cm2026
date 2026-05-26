const { pool } = require('../config/db');

/**
 * Get project details as text context for LLM
 * @param {string} projectId 
 * @returns {Promise<string>}
 */
async function getProjectContext(projectId) {
  let contextText = '';
  
  try {
    // 1. Get Project main details
    const [projectRows] = await pool.query(
      `SELECT p.*, c.company_name 
       FROM projects p
       LEFT JOIN companies c ON p.company_id = c.company_id
       WHERE p.project_id = ? AND p.active = 1`,
      [projectId]
    );

    if (projectRows.length === 0) {
      return 'ไม่พบข้อมูลโครงการในระบบ';
    }

    const project = projectRows[0];
    contextText += `=== ข้อมูลโครงการ ===\n`;
    contextText += `ชื่อโครงการ: ${project.project_name || '-'}\n`;
    contextText += `เลขที่งาน (Job Number): ${project.job_number || '-'}\n`;
    contextText += `รายละเอียด: ${project.description || '-'}\n`;
    contextText += `บริษัท: ${project.company_name || '-'}\n`;
    contextText += `เจ้าของโครงการ (Owner): ${project.owner || '-'}\n`;
    contextText += `ผู้ควบคุมงาน (Consultant): ${project.consusltant || '-'}\n`;
    contextText += `ผู้รับเหมา (Contractor): ${project.contractor || '-'}\n`;
    contextText += `ที่อยู่โครงการ: ${project.address || '-'}\n`;
    contextText += `สถานะโครงการ: ${project.status || project.tender_status || '-'}\n`;
    contextText += `ความคืบหน้าภาพรวม (Progress): ${project.progress || 0}%\n`;
    contextText += `วันเริ่มต้นโครงการ: ${project.start_date ? new Date(project.start_date).toLocaleDateString('th-TH') : '-'}\n`;
    contextText += `วันสิ้นสุดโครงการ: ${project.end_date ? new Date(project.end_date).toLocaleDateString('th-TH') : '-'}\n`;
    contextText += `งบประมาณโครงการ (Total Amount): ${project.total_amount ? Number(project.total_amount).toLocaleString('th-TH') + ' บาท' : 'ไม่ระบุ'}\n\n`;

    // 2. Get S-Curve Roots (Categories)
    const [roots] = await pool.query(
      `SELECT root_id, root_code, root_name, root_total_price, start_date, end_date, status, total_price 
       FROM s_curve_root 
       WHERE project_id = ? AND is_active = 1`,
      [projectId]
    );

    if (roots.length > 0) {
      contextText += `=== หมวดงานหลัก (S-Curve) ===\n`;
      roots.forEach((r, idx) => {
        contextText += `${idx + 1}. [${r.root_code}] ${r.root_name} | ราคาตามแผน: ${Number(r.total_price || r.root_total_price || 0).toLocaleString('th-TH')} บาท | ระยะเวลา: ${r.start_date ? new Date(r.start_date).toLocaleDateString('th-TH') : '-'} ถึง ${r.end_date ? new Date(r.end_date).toLocaleDateString('th-TH') : '-'}\n`;
      });
      contextText += `\n`;
    }

    // 3. Get Payment installments
    const [payments] = await pool.query(
      `SELECT installment_id, installment_number, amount, DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date 
       FROM payment_installments 
       WHERE project_id = ? 
       ORDER BY installment_number ASC`,
      [projectId]
    );

    if (payments.length > 0) {
      contextText += `=== ข้อมูลการเบิกจ่าย/งวดงาน ===\n`;
      payments.forEach(p => {
        contextText += `งวดที่ ${p.installment_number} | จำนวนเงิน: ${p.amount ? Number(p.amount).toLocaleString('th-TH') + ' บาท' : '-'} | วันที่ชำระ: ${p.payment_date || '-'}\n`;
      });
      contextText += `\n`;
    }

    // 4. Get Project Files (latest 15 files of any type)
    const [projectFiles] = await pool.query(
      `SELECT f.file_name, f.file_size, f.file_path, fo.folder_name,
              DATE_FORMAT(f.created_at, '%Y-%m-%d') as uploaded_date
       FROM files f
       JOIN folders fo ON f.folder_id = fo.folder_id
       WHERE fo.project_id = ? AND f.active = 1 AND fo.active = 1
       ORDER BY f.created_at DESC
       LIMIT 15`,
      [projectId]
    );

    if (projectFiles.length > 0) {
      contextText += `=== ไฟล์อัปโหลดล่าสุด (${projectFiles.length} ไฟล์) ===\n`;
      projectFiles.forEach(f => {
        const sizeMb = (f.file_size / (1024 * 1024)).toFixed(2);
        contextText += `- [โฟลเดอร์: ${f.folder_name}] ${f.file_name} (ขนาด: ${sizeMb} MB, วันอัปโหลด: ${f.uploaded_date}, พาธไฟล์: ${f.file_path})\n`;
      });
      contextText += `\n`;
    }

  } catch (error) {
    console.error('Error building project context:', error);
    contextText += `(เกิดข้อผิดพลาดในการดึงข้อมูลประกอบบริบท: ${error.message})\n`;
  }

  return contextText;
}

/**
 * Get company projects overview as text context for LLM
 * @param {string} companyId 
 * @returns {Promise<string>}
 */
async function getCompanyOverviewContext(companyId) {
  let contextText = '';
  if (!companyId) return 'ไม่พบรหัสบริษัทสำหรับประมวลผลบริบท';

  try {
    const [projectRows] = await pool.query(
      `SELECT p.project_id, p.job_number, p.project_name, p.description, p.status, p.progress, p.total_amount, 
              DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date, 
              DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date, p.owner
       FROM projects p
       WHERE p.company_id = ? AND p.active = 1 AND (p.is_hidden = 0 OR p.is_hidden IS NULL)
       ORDER BY p.job_number DESC`,
      [companyId]
    );

    if (projectRows.length === 0) {
      return 'บริษัทนี้ยังไม่มีโครงการก่อสร้างลงทะเบียนในระบบ';
    }

    // Helper: Determine the "business year" (พ.ศ.) for a project.
    // Some projects (e.g., SPK6830, SPK6829) have start_date in 2025 (พ.ศ. 2568)
    // but are considered "ปี 2569" projects by business rules.
    // We use the job_number prefix to determine the correct year when applicable.
    // Query files uploaded under these projects (ordered by created_at DESC to fetch latest files first, including images)
    const [fileRows] = await pool.query(
      `SELECT f.file_id, f.file_name, f.file_size, f.file_path, fo.folder_name, fo.project_id,
              DATE_FORMAT(f.created_at, '%Y-%m-%d') as uploaded_date
       FROM files f
       JOIN folders fo ON f.folder_id = fo.folder_id
       JOIN projects p ON fo.project_id = p.project_id
       WHERE p.company_id = ? AND f.active = 1 AND fo.active = 1 AND p.active = 1
       ORDER BY f.created_at DESC`,
      [companyId]
    );

    const filesByProject = {};
    fileRows.forEach(file => {
      const pId = file.project_id;
      if (!filesByProject[pId]) {
        filesByProject[pId] = [];
      }
      filesByProject[pId].push(file);
    });

    // Helper: Determine the "business year" (พ.ศ.) for a project.
    // Some projects (e.g., SPK6830, SPK6829) have start_date in 2025 (พ.ศ. 2568)
    // but are considered "ปี 2569" projects by business rules.
    // We use the job_number prefix to determine the correct year when applicable.
    const getProjectYearTh = (p) => {
      const jobNum = (p.job_number || '').replace(/[\s-]/g, '').toUpperCase();
      // SPK69xx projects → 2569
      if (jobNum.startsWith('SPK69')) return '2569';
      // SPK6830 and SPK6829 → 2569 (carried over)
      if (jobNum === 'SPK6830' || jobNum === 'SPK6829') return '2569';
      // Fallback to start_date year
      if (p.start_date) {
        const yearEn = new Date(p.start_date).getFullYear();
        return (yearEn + 543).toString();
      }
      return 'ไม่ระบุปี';
    };

    // Group projects by Buddhist year for a clean summary at the top
    const summaryByYear = {};
    projectRows.forEach(p => {
      const yearTh = getProjectYearTh(p);
      if (!summaryByYear[yearTh]) {
        summaryByYear[yearTh] = [];
      }
      summaryByYear[yearTh].push(p);
    });

    contextText += `=== สรุปโครงการแยกตามปี พ.ศ. ===\n`;
    Object.keys(summaryByYear).sort((a, b) => b.localeCompare(a)).forEach(year => {
      contextText += `ปี พ.ศ. ${year}: มีทั้งหมด ${summaryByYear[year].length} โครงการ\n`;
      summaryByYear[year].forEach(p => {
        contextText += `  - [Job: ${p.job_number || '-'}] ${p.project_name} (สถานะ: ${p.status || '-'}, ความก้าวหน้า: ${p.progress || 0}%)\n`;
      });
    });
    contextText += `\n`;

    contextText += `=== รายละเอียดโครงการทั้งหมด (แยกตามปี พ.ศ.) ===\n\n`;
    Object.keys(summaryByYear).sort((a, b) => b.localeCompare(a)).forEach(year => {
      contextText += `--- ปี พ.ศ. ${year} (มีทั้งหมด ${summaryByYear[year].length} โครงการ) ---\n`;
      summaryByYear[year].forEach((p, idx) => {
        contextText += `${idx + 1}. [Job: ${p.job_number || '-'}] ${p.project_name || '-'}\n`;
        contextText += `   - สถานะ: ${p.status || '-'} | ความก้าวหน้า: ${p.progress || 0}%\n`;
        if (p.total_amount && Number(p.total_amount) > 0) {
          contextText += `   - งบประมาณ: ${Number(p.total_amount).toLocaleString('th-TH')} บาท\n`;
        }
        contextText += `   - ระยะเวลา: ${p.start_date || '-'} ถึง ${p.end_date || '-'}\n`;
        contextText += `   - เจ้าของ (Owner): ${p.owner || '-'}\n`;
        if (p.description) {
          contextText += `   - รายละเอียดสั้น: ${p.description.trim()}\n`;
        }
        
        // Append uploaded files if any (Limit to latest 15 files of any type to prevent context flooding)
        const pFiles = filesByProject[p.project_id] || [];
        if (pFiles.length > 0) {
          const recentFiles = pFiles.slice(0, 15);
          contextText += `   - ไฟล์อัปโหลดล่าสุด (${recentFiles.length} จากทั้งหมด ${pFiles.length} ไฟล์):\n`;
          recentFiles.forEach(f => {
            const sizeMb = (f.file_size / (1024 * 1024)).toFixed(2);
            contextText += `     * [โฟลเดอร์: ${f.folder_name}] ${f.file_name} (ขนาด: ${sizeMb} MB, วันอัปโหลด: ${f.uploaded_date}, พาธไฟล์: ${f.file_path})\n`;
          });
        }
        contextText += `\n`;
      });
    });
  } catch (error) {
    console.error('Error building company overview context:', error);
    contextText += `(เกิดข้อผิดพลาดในการดึงข้อมูลบริบทของบริษัท: ${error.message})\n`;
  }
  return contextText;
}

module.exports = {
  getProjectContext,
  getCompanyOverviewContext
};

