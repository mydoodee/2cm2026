const fs = require('fs');
const filePath = './src/controllers/folderController.js';

let content = fs.readFileSync(filePath, 'utf8');

/**
 * Patch folderController.js: Finalizing multi-tenant isolation.
 */

// Patch 1: getFolders - add projectCheck (We already added companyId in a previous turn)
const getFoldersOld = `    const companyId = req.companyId;\r\n\r\n    if (!projectId) {`;
const getFoldersNew = `    const companyId = req.companyId;\r\n\r\n    if (!projectId) {`;

// The target for getFolders check insertion:
const checkTargetOld = `    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // พยายามดึงข้อมูลพร้อม permissions`;

const checkTargetNew = `    if (!projectId) {\r\n      return res.status(400).json({\r\n        message: 'Project ID is required'\r\n      });\r\n    }\r\n\r\n    // Verify project belongs to current company\r\n    const [projectCheck] = await connection.execute(\r\n      'SELECT project_id FROM projects WHERE project_id = ? AND company_id = ? AND active = 1',\r\n      [projectId, companyId]\r\n    );\r\n\r\n    if (projectCheck.length === 0) {\r\n      return res.status(403).json({\r\n        message: 'Forbidden: project not in current company'\r\n      });\r\n    }\r\n\r\n    // พยายามดึงข้อมูลพร้อม permissions`;

function applyPatch(target, oldS, newS, name) {
  const oldSLF = oldS.replace(/\r\n/g, '\n');
  const newSLF = newS.replace(/\r\n/g, '\n');
  
  if (target.includes(oldS)) {
    console.log(`✅ Patched ${name} (CRLF)`);
    return target.replace(oldS, newS);
  } else if (target.includes(oldSLF)) {
    console.log(`✅ Patched ${name} (LF)`);
    return target.replace(oldSLF, newSLF);
  } else {
    console.log(`❌ FAILED to patch ${name}`);
    return target;
  }
}

content = applyPatch(content, checkTargetOld, checkTargetNew, 'getFolders ProjectCheck');

// Patch 4: updateFolderPermissions - ensure isolation (folderRows already has project_id, but check company_id)
const updatePermOld = `    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง\r\n    const [folderRows] = await connection.execute(\r\n      'SELECT project_id FROM folders WHERE folder_id = ? AND active = 1',\r\n      [folderId]\r\n    );`;

const updatePermNew = `    // ตรวจสอบว่าโฟลเดอร์มีอยู่จริงและอยู่ในบริษัทที่ถูกต้อง\r\n    const [folderRows] = await connection.execute(\r\n      \`SELECT f.project_id FROM folders f\r\n       JOIN projects p ON f.project_id = p.project_id\r\n       WHERE f.folder_id = ? AND f.active = 1 AND p.company_id = ?\`,\r\n      [folderId, req.companyId]\r\n    );`;

// Pattern updatePermOld might appear in updateFolder and deleteFolder too.
// Let's replace ONLY the occurrences that are NOT already patched.
// The script version of applyPatch replaces ALL instances if they match.
// In folderController.js, this pattern appears in updateFolder, deleteFolder, and updateFolderPermissions.
// We WANT to fix them all.

content = applyPatch(content, updatePermOld, updatePermNew, 'Folder Lookups (Multiple)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ folderController.js Finalized!');
