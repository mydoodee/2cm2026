// backend/routes/userRoles.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

router.get('/user-roles/:user_id', async (req, res) => {
  let connection;
  try {
    const { user_id } = req.params;
    connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT role_id FROM user_roles WHERE user_id = ?',
      [user_id]
    );
    
    res.json({ roles: rows.map((row) => row.role_id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลบทบาทได้' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;