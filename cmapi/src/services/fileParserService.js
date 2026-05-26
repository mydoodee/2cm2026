const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const mammoth = require('mammoth');

/**
 * Extract clean text content from a file depending on its extension.
 * Supported: .pdf, .xlsx, .xls, .docx, .txt, .csv, .json, .sql
 * @param {string} absolutePath 
 * @returns {Promise<string>}
 */
async function parseFileText(absolutePath) {
  try {
    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error('ไม่พบไฟล์เอกสารบนเซิร์ฟเวอร์');
    }

    const ext = path.extname(absolutePath).toLowerCase();
    
    // 1. Text & Code files (.txt, .csv, .json, .sql)
    if (['.txt', '.csv', '.json', '.sql', '.html', '.xml'].includes(ext)) {
      const content = await fs.readFile(absolutePath, 'utf8');
      return content;
    }

    // 2. PDF documents (.pdf)
    if (ext === '.pdf') {
      const buffer = await fs.readFile(absolutePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    // 3. Word documents (.docx)
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: absolutePath });
      return result.value || '';
    }

    // 4. Excel spreadsheets (.xlsx, .xls)
    if (['.xlsx', '.xls'].includes(ext)) {
      const workbook = xlsx.readFile(absolutePath);
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        // Convert sheet to CSV format which is very concise and structured for AI
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        if (csv && csv.trim() !== '') {
          text += `--- แผ่นงาน (Sheet): ${sheetName} ---\n${csv}\n\n`;
        }
      });
      return text;
    }

    throw new Error(`ไม่รองรับประเภทไฟล์นามสกุล ${ext}`);
  } catch (error) {
    console.error('Error parsing file:', absolutePath, error.message);
    throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูลจากไฟล์: ${error.message}`);
  }
}

module.exports = {
  parseFileText
};
