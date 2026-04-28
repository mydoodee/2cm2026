/**
 * Migration Script: Fix tender_lost → tender_loss
 * 
 * ใช้ script นี้เพื่ออัพเดทค่า tender_status ใน database
 * จาก 'tender_lost' (ค่าเก่า) เป็น 'tender_loss' (ค่าใหม่ที่ถูกต้อง)
 * 
 * Run: node fix_tender_lost.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config(); // loads from cmapi/.env

async function fixTenderLost() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cm2026',
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Connected to database');

    // ตรวจสอบก่อนว่ามีข้อมูลที่ต้องแก้ไขกี่ record
    const [checkRows] = await connection.execute(
      `SELECT project_id, project_name, tender_status FROM projects WHERE tender_status = 'tender_lost'`
    );

    if (checkRows.length === 0) {
      console.log('✅ ไม่มีข้อมูลที่ต้องแก้ไข (ไม่พบ tender_lost ในฐานข้อมูล)');
      return;
    }

    console.log(`\n🔍 พบ ${checkRows.length} record ที่มีค่า tender_lost:`);
    checkRows.forEach(row => {
      console.log(`  - [${row.project_id}] ${row.project_name}`);
    });

    // อัพเดทค่า
    const [result] = await connection.execute(
      `UPDATE projects SET tender_status = 'tender_loss', updated_at = NOW() WHERE tender_status = 'tender_lost'`
    );

    console.log(`\n✅ อัพเดทสำเร็จ! แก้ไข ${result.affectedRows} record จาก 'tender_lost' → 'tender_loss'`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Disconnected from database');
    }
  }
}

fixTenderLost();
