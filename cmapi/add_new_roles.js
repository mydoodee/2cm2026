const { getConnection } = require('./src/config/db');

async function addRoles() {
  let connection;
  try {
    connection = await getConnection();
    console.log('Database: Connection acquired');

    const rolesToAdd = [
      { name: 'Purchasing', description: 'ฝ่ายจัดซื้อ มีหน้าที่จัดการการสั่งซื้อวัสดุและอุปกรณ์' },
      { name: 'Support', description: 'ฝ่ายสนับสนุน มีหน้าที่ช่วยเหลือและดูแลความเรียบร้อยทั่วไป' }
    ];

    for (const role of rolesToAdd) {
      // ตรวจสอบก่อนว่ามีอยู่แล้วหรือไม่
      const [existing] = await connection.execute(
        'SELECT role_id FROM roles WHERE role_name = ?',
        [role.name]
      );

      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO roles (role_name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [role.name, role.description]
        );
        console.log(`Added role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    console.log('Role insertion completed successfully');
  } catch (error) {
    console.error('Error adding roles:', error);
  } finally {
    if (connection) {
      // release connections from pool
      if (typeof connection.release === 'function') {
        connection.release();
      } else if (typeof connection.end === 'function') {
        await connection.end();
      }
    }
    process.exit();
  }
}

addRoles();
