const fs = require('fs');
const filePath = './src/controllers/projectController.js';

let content = fs.readFileSync(filePath, 'utf8');

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

// 1. getProjectById (Admin)
const pAdminOld = `         FROM projects p\r\n         WHERE project_id = ? AND active = 1\`,\r\n        [req.params.id]`;
const pAdminNew = `         FROM projects p\r\n         WHERE p.project_id = ? AND p.company_id = ? AND p.active = 1\`,\r\n        [req.params.id, req.companyId]`;
content = applyPatch(content, pAdminOld, pAdminNew, 'getProjectById (Admin)');

// 2. getProjectById (Non-admin)
const pNonAdminOld = `         FROM projects p\r\n         WHERE p.project_id = ? AND active = 1 AND EXISTS (\r\n             SELECT 1 FROM project_user_roles pur \r\n             WHERE pur.project_id = p.project_id AND pur.user_id = ?\r\n         )\`,\r\n        [req.params.id, req.user.user_id]`;
const pNonAdminNew = `         FROM projects p\r\n         WHERE p.project_id = ? AND p.company_id = ? AND p.active = 1 AND EXISTS (\r\n             SELECT 1 FROM project_user_roles pur \r\n             WHERE pur.project_id = p.project_id AND pur.user_id = ?\r\n         )\`,\r\n        [req.params.id, req.companyId, req.user.user_id]`;
content = applyPatch(content, pNonAdminOld, pNonAdminNew, 'getProjectById (Non-admin)');

// 3. getProjectUsers
const pUsersOld = `    const [projectRows] = await connection.execute(\r\n      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1',\r\n      [projectId]\r\n    );`;
const pUsersNew = `    const [projectRows] = await connection.execute(\r\n      'SELECT project_id FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?',\r\n      [projectId, req.companyId]\r\n    );`;
content = applyPatch(content, pUsersOld, pUsersNew, 'getProjectUsers');

// 4. deleteProject
const delOld = `    const [projectRows] = await connection.execute(\r\n      \`SELECT * FROM projects WHERE project_id = ? AND active = 1\`,\r\n      [id]\r\n    );`;
const delNew = `    const [projectRows] = await connection.execute(\r\n      \`SELECT * FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?\`,\r\n      [id, req.companyId]\r\n    );`;
content = applyPatch(content, delOld, delNew, 'deleteProject');

// 5. uploadProjectImage
const upImgOld = `    const [projectRows] = await connection.execute(\r\n      \`SELECT * FROM projects WHERE project_id = ? AND active = 1\`,\r\n      [project_id]\r\n    );`;
const upImgNew = `    const [projectRows] = await connection.execute(\r\n      \`SELECT * FROM projects WHERE project_id = ? AND active = 1 AND company_id = ?\`,\r\n      [project_id, req.companyId]\r\n    );`;
content = applyPatch(content, upImgOld, upImgNew, 'uploadProjectImage');

// 6. fix createProject 500 error (Number of placeholders matching number of columns)
// Target: ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
const valOld = `) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,`;
// Add one more ? at the end for companyId
const valNew = `) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,`;
content = applyPatch(content, valOld, valNew, 'createProject VALUES mismatch');


fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ projectController.js fully patched for Data Isolation and 500 Bug fix.');
