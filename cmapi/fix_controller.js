const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/actualController.js');
let content = fs.readFileSync(filePath, 'utf8');

// ---------- โค้ดใหม่ที่จะใส่แทน ----------
const newBlock = `    try {
      // ✅ สร้าง WHERE clause แบบ smart - ใช้ระดับที่เจาะจงที่สุดที่ส่งมา
      // ไม่บังคับ root_id/category_id เพื่อป้องกัน 404 เมื่อไม่มีในฐานข้อมูล
      let whereClause = 'a.project_id = ?';
      let whereParams = [projectId];

      if (subsubtype_id) {
        // ระดับ subsubtype
        whereClause += ' AND a.subsubtype_id = ?';
        whereParams.push(subsubtype_id);
      } else if (subtype_id) {
        // ระดับ subtype
        whereClause += ' AND a.subtype_id = ? AND a.subsubtype_id IS NULL';
        whereParams.push(subtype_id);
      } else if (type_id) {
        // ระดับ type
        whereClause += ' AND a.type_id = ? AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(type_id);
      } else if (category_id) {
        // ระดับ category
        whereClause += ' AND a.category_id = ? AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(category_id);
      } else if (root_id) {
        // ระดับ root
        whereClause += ' AND a.root_id = ? AND a.category_id IS NULL AND a.type_id IS NULL AND a.subtype_id IS NULL AND a.subsubtype_id IS NULL';
        whereParams.push(root_id);
      }

      console.log('🔍 Final WHERE clause:', whereClause);
      console.log('📦 Final Params:', whereParams);

      // ✅ หา actual_id
      const [actualData] = await connection.query(
        \`SELECT actual_id FROM s_curve_actual a WHERE \${whereClause}\`,
        whereParams
      );

      if (actualData.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูล Actual ที่ตรงกับเงื่อนไข (ข้อมูลอาจถูกลบไปแล้ว)'
        });
      }

      const actualId = actualData[0].actual_id;
      console.log('✅ Found actual_id:', actualId);

      // ✅ ลบรูปภาพใน history ก่อน (ถ้ามี)
      const [historyRows] = await connection.query(
        'SELECT history_id FROM s_curve_actual_history WHERE actual_id = ?',
        [actualId]
      );

      if (historyRows.length > 0) {
        const ids = historyRows.map(h => h.history_id);
        const placeholders = ids.map(() => '?').join(',');
        await connection.query(
          \`DELETE FROM s_curve_actual_history_photos WHERE history_id IN (\${placeholders})\`,
          ids
        );
        console.log('🗑️ Deleted photos for', ids.length, 'history records');
      }

      // ✅ ลบประวัติทั้งหมด
      const [deleteResult] = await connection.query(
        'DELETE FROM s_curve_actual_history WHERE actual_id = ?',
        [actualId]
      );

      console.log('🗑️ Deleted', deleteResult.affectedRows, 'history records');

      // ✅ ลบ Actual Progress
      await connection.query(
        'DELETE FROM s_curve_actual WHERE actual_id = ?',
        [actualId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'ลบประวัติทั้งหมดสำเร็จ',
        data: {
          deleted_count: deleteResult.affectedRows,
          actual_id: actualId
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }`;

// ---------- หาจุดเริ่มต้นและสิ้นสุดของ try block ใน deleteAllHistoryByItem ----------
// หา marker: exports.deleteAllHistoryByItem
const fnMarker = 'exports.deleteAllHistoryByItem = async (req, res) => {';
const fnStart = content.indexOf(fnMarker);
if (fnStart === -1) {
    console.error('❌ Cannot find deleteAllHistoryByItem function!');
    process.exit(1);
}

// หา "    try {" ถัดจาก fnStart (inner try)
const innerTryMarker = '\r\n    try {\r\n';
const innerTryStart = content.indexOf(innerTryMarker, fnStart);
if (innerTryStart === -1) {
    console.error('❌ Cannot find inner try block!');
    process.exit(1);
}

// หา "    } catch (error) {\r\n      await connection.rollback();\r\n      throw error;\r\n    }" ถัดจาก innerTryStart
const innerCatchEnd = '    } catch (error) {\r\n      await connection.rollback();\r\n      throw error;\r\n    }';
const innerCatchPos = content.indexOf(innerCatchEnd, innerTryStart);
if (innerCatchPos === -1) {
    console.error('❌ Cannot find inner catch block!');
    process.exit(1);
}

const blockEnd = innerCatchPos + innerCatchEnd.length;

// สร้าง content ใหม่โดยแทนที่ inner try...catch ทั้งหมด
const before = content.substring(0, innerTryStart + 2); // +2 เพื่อเก็บ \r\n ก่อน "    try {"
const after = content.substring(blockEnd);

const newContent = before + newBlock.replace(/\n/g, '\r\n') + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Successfully patched deleteAllHistoryByItem!');
console.log('📝 New file size:', newContent.length, 'bytes');
