const fs = require('fs');
const filePath = './src/controllers/folderController.js';

let content = fs.readFileSync(filePath, 'utf8');

// Patch 1: getFolders - add company check after "const projectId = req.query.project_id;"
// Find the FIRST occurrence only (getFolders function around line 15)
const getFoldersOld = `    const projectId = req.query.project_id;\r\n\r\n    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // พยายามดึงข้อมูลพร้อม permissions`;

const getFoldersNew = `    const projectId = req.query.project_id;\r\n    const companyId = req.companyId;\r\n\r\n    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // Verify project belongs to current company\r\n    const [projectCheck] = await connection.execute(\r\n      'SELECT project_id FROM projects WHERE project_id = ? AND company_id = ? AND active = 1',\r\n      [projectId, companyId]\r\n    );\r\n\r\n    if (projectCheck.length === 0) {\r\n      return res.status(403).json({\r\n        message: 'Forbidden: project not in current company'\r\n      });\r\n    }\r\n\r\n    // พยายามดึงข้อมูลพร้อม permissions`;

// Only replace first occurrence
const idx1 = content.indexOf(getFoldersOld);
if (idx1 !== -1) {
  content = content.substring(0, idx1) + getFoldersNew + content.substring(idx1 + getFoldersOld.length);
  console.log('✅ Patched getFolders');
} else {
  console.log('❌ getFolders patch target not found, trying LF...');
  // Try LF only
  const getFoldersOldLF = getFoldersOld.replace(/\r\n/g, '\n');
  const getFoldersNewLF = getFoldersNew.replace(/\r\n/g, '\n');
  const idx1b = content.indexOf(getFoldersOldLF);
  if (idx1b !== -1) {
    content = content.substring(0, idx1b) + getFoldersNewLF + content.substring(idx1b + getFoldersOldLF.length);
    console.log('✅ Patched getFolders (LF)');
  } else {
    console.log('❌ getFolders patch FAILED');
  }
}

// Patch 2: getFoldersWithSubfolders - add company check
const getSubOld = `    const projectId = req.query.project_id;\r\n\r\n    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // ดึงข้อมูลโฟลเดอร์ทั้งหมด`;

const getSubNew = `    const projectId = req.query.project_id;\r\n    const companyId = req.companyId;\r\n\r\n    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // Verify project belongs to current company\r\n    const [projectCheck2] = await connection.execute(\r\n      'SELECT project_id FROM projects WHERE project_id = ? AND company_id = ? AND active = 1',\r\n      [projectId, companyId]\r\n    );\r\n\r\n    if (projectCheck2.length === 0) {\r\n      return res.status(403).json({\r\n        message: 'Forbidden: project not in current company'\r\n      });\r\n    }\r\n\r\n    // ดึงข้อมูลโฟลเดอร์ทั้งหมด`;

const idx2 = content.indexOf(getSubOld);
if (idx2 !== -1) {
  content = content.substring(0, idx2) + getSubNew + content.substring(idx2 + getSubOld.length);
  console.log('✅ Patched getFoldersWithSubfolders');
} else {
  const getSubOldLF = getSubOld.replace(/\r\n/g, '\n');
  const getSubNewLF = getSubNew.replace(/\r\n/g, '\n');
  const idx2b = content.indexOf(getSubOldLF);
  if (idx2b !== -1) {
    content = content.substring(0, idx2b) + getSubNewLF + content.substring(idx2b + getSubOldLF.length);
    console.log('✅ Patched getFoldersWithSubfolders (LF)');
  } else {
    console.log('❌ getFoldersWithSubfolders patch FAILED');
  }
}

// Patch 3: getFiles - add company check on folder lookup
const getFilesOld = `    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง\r\n    const [folderRows] = await connection.execute(\r\n      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',\r\n      [folderId]\r\n    );\r\n    if (folderRows.length === 0) {\r\n      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์' });\r\n    }`;

const getFilesNew = `    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริงและอยู่ในบริษัทที่ถูกต้อง\r\n    const [folderRows] = await connection.execute(\r\n      \`SELECT f.project_id FROM folders f\r\n       JOIN projects p ON f.project_id = p.project_id\r\n       WHERE f.folder_id = ? AND f.active = 1 AND p.company_id = ?\`,\r\n      [folderId, req.companyId]\r\n    );\r\n    if (folderRows.length === 0) {\r\n      return res.status(404).json({ message: 'ไม่พบโฟลเดอร์ในบริษัทปัจจุบัน' });\r\n    }`;

// This pattern appears multiple times, but we only need to change the one in getFiles
const idx3 = content.indexOf(getFilesOld);
if (idx3 !== -1) {
  content = content.substring(0, idx3) + getFilesNew + content.substring(idx3 + getFilesOld.length);
  console.log('✅ Patched getFiles');
} else {
  const getFilesOldLF = getFilesOld.replace(/\r\n/g, '\n');
  const getFilesNewLF = getFilesNew.replace(/\r\n/g, '\n');
  const idx3b = content.indexOf(getFilesOldLF);
  if (idx3b !== -1) {
    content = content.substring(0, idx3b) + getFilesNewLF + content.substring(idx3b + getFilesOldLF.length);
    console.log('✅ Patched getFiles (LF)');
  } else {
    console.log('❌ getFiles patch FAILED');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ folderController.js patched and saved!');
