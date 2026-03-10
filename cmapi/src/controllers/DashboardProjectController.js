// DashboardProjectController.js - แก้ไขให้ดึง payment ล่าสุดและสร้าง S-Curve จากงวดชำระเงิน
const { getConnection } = require('../config/db');

// ================================
// API ดึงภาพรวมทั้งหมด
// ================================
const getOverallStats = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    connection = await getConnection();

    // ดึงโครงการของผู้ใช้ (กรอง active = 1 เท่านั้น)
    const [projects] = await connection.execute(
      `SELECT p.project_id, p.project_name, p.status, p.progress
       FROM projects p
       JOIN project_user_roles pur ON p.project_id = pur.project_id
       WHERE pur.user_id = ? AND p.active = 1
       ORDER BY p.project_name`,
      [req.user.user_id]
    );

    // คำนวณภาพรวม
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalProjects = projects.length;
    let totalProgress = 0;
    let hasReceivedData = false;

    for (const project of projects) {
      // ดึงรายได้รวม (total_amount) จาก record ล่าสุด
      const [payments] = await connection.execute(
        `SELECT 
          COALESCE(total_amount, 0) as total_amount
         FROM payments
         WHERE project_id = ?
         ORDER BY updated_at DESC, payment_id DESC
         LIMIT 1`,
        [project.project_id]
      );

      // คำนวณรายได้ที่ได้รับจริง (SUM ของ current_installment_amount ที่ payment_status = 'paid')
      const [receivedData] = await connection.execute(
        `SELECT COALESCE(SUM(current_installment_amount), 0) as total_received
         FROM payments
         WHERE project_id = ? AND payment_status = 'paid'`,
        [project.project_id]
      );

      const revenue = parseFloat(payments[0]?.total_amount || 0);
      const received = parseFloat(receivedData[0]?.total_received || 0);

      totalRevenue += revenue;
      totalReceived += received;
      if (received > 0) hasReceivedData = true;
      totalProgress += parseFloat(project.progress || 0);
    }

    const averageProgress = totalProjects > 0 ? (totalProgress / totalProjects) : 0;

    res.status(200).json({
      message: 'ดึงข้อมูลภาพรวมสำเร็จ',
      overall: {
        totalProjects,
        totalRevenue,
        totalReceived,
        hasReceivedData,
        averageProgress
      }
    });

  } catch (error) {
    console.error('Error in getOverallStats:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาพรวม',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// ฟังก์ชันสร้าง S-Curve จากข้อมูลงวดชำระเงิน
// ================================
const generateSCurveFromInstallments = (totalInstallments, payments) => {
  const scurveData = [];
  
  if (totalInstallments <= 0) return scurveData;

  const planPerInstallment = 100 / totalInstallments;

  for (let i = 1; i <= totalInstallments; i++) {
    // หา payment record ที่ current_installment ตรงกับงวดนี้
    const payment = payments.find(p => p.current_installment === i);
    
    // เช็คว่างวดนี้ชำระแล้วหรือยัง (ดูจาก payment_status)
    const isPaid = payment && payment.payment_status === 'paid';
    
    // คำนวณ actual cumulative - นับเฉพาะงวดที่ชำระแล้ว
    let actualCumulative = 0;
    for (let j = 1; j <= i; j++) {
      const prevPayment = payments.find(p => p.current_installment === j);
      if (prevPayment && prevPayment.payment_status === 'paid') {
        actualCumulative += planPerInstallment;
      }
    }

    scurveData.push({
      installment: i,
      date: payment?.payment_date || null,
      plan: parseFloat((i * planPerInstallment).toFixed(2)),
      actual: parseFloat(actualCumulative.toFixed(2)),
      paid: isPaid,
      payment_status: payment?.payment_status || null,
      amount: payment?.current_installment_amount || 0
    });
  }

  return scurveData;
};

// ================================
// API ดึงรายละเอียดโครงการทั้งหมด (แก้ไข)
// ================================
const getProjectStats = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    connection = await getConnection();

    const [projects] = await connection.execute(
      `SELECT 
        p.project_id, 
        p.project_name, 
        p.status, 
        p.progress, 
        p.start_date, 
        p.end_date,
        p.owner,
        p.address
       FROM projects p
       JOIN project_user_roles pur ON p.project_id = pur.project_id
       WHERE pur.user_id = ? AND p.active = 1
       ORDER BY p.created_at DESC`,
      [req.user.user_id]
    );

    const projectsWithStats = [];
    
    for (const project of projects) {
      const [latestPayment] = await connection.execute(
        `SELECT 
          COALESCE(total_amount, 0) as total_amount,
          COALESCE(total_installments, 0) as total_installments,
          COALESCE(current_installment, 0) as current_installment,
          payment_date
         FROM payments
         WHERE project_id = ?
         ORDER BY updated_at DESC, payment_id DESC
         LIMIT 1`,
        [project.project_id]
      );

      // ดึงข้อมูล payments ทั้งหมดของโครงการ พร้อม payment_status
      const [allPayments] = await connection.execute(
        `SELECT 
          current_installment,
          current_installment_amount,
          payment_date,
          payment_status,
          created_at
         FROM payments
         WHERE project_id = ? AND current_installment > 0
         ORDER BY current_installment`,
        [project.project_id]
      );

      // คำนวณรายได้ที่ได้รับจริง (เฉพาะ paid)
      const [receivedData] = await connection.execute(
        `SELECT COALESCE(SUM(current_installment_amount), 0) as total_received
         FROM payments
         WHERE project_id = ? AND payment_status = 'paid'`,
        [project.project_id]
      );

      const totalRevenue = parseFloat(latestPayment[0]?.total_amount || 0);
      const received = parseFloat(receivedData[0]?.total_received || 0);
      const hasReceived = received > 0;
      const totalInstallments = parseInt(latestPayment[0]?.total_installments || 0);

      const scurveData = generateSCurveFromInstallments(totalInstallments, allPayments);

      const completionRate = totalRevenue > 0 ? ((received / totalRevenue) * 100).toFixed(1) : 0;

      // นับจำนวนงวดที่ชำระแล้ว
      const paidInstallments = allPayments.filter(p => p.payment_status === 'paid').length;

      projectsWithStats.push({
        project_id: project.project_id,
        project_name: project.project_name,
        status: project.status,
        progress: parseFloat(project.progress || 0),
        start_date: project.start_date,
        end_date: project.end_date,
        owner: project.owner || '-',
        address: project.address || '-',
        total_revenue: totalRevenue,
        received_revenue: received,
        completion_rate: parseFloat(completionRate),
        hasReceivedData: hasReceived,
        payment_info: {
          total_installments: totalInstallments,
          current_installment: latestPayment[0]?.current_installment || 0,
          paid_installments: paidInstallments,
          payment_date: latestPayment[0]?.payment_date || null
        },
        scurve_data: scurveData
      });
    }

    res.status(200).json({
      message: 'ดึงข้อมูลโครงการสำเร็จ',
      projects: projectsWithStats
    });

  } catch (error) {
    console.error('Error in getProjectStats:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// API ดึงรายละเอียดโครงการเฉพาะ (แก้ไข)
// ================================
const getProjectDetails = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const projectId = req.params.projectId;

    connection = await getConnection();

    const [projectAccess] = await connection.execute(
      `SELECT p.*, pur.role
       FROM projects p
       JOIN project_user_roles pur ON p.project_id = pur.project_id
       WHERE p.project_id = ? AND pur.user_id = ? AND p.active = 1`,
      [projectId, req.user.user_id]
    );

    if (projectAccess.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือไม่มีสิทธิ์เข้าถึง' });
    }

    const project = projectAccess[0];

    const [payments] = await connection.execute(
      `SELECT 
        payment_id,
        payment_date,
        total_installments,
        total_amount,
        submitted_installments,
        submitted_amount,
        current_installment,
        current_installment_amount,
        payment_status,
        payment_method,
        payment_note,
        approved_by,
        approved_date,
        file1,
        file2,
        file3,
        created_at,
        updated_at
       FROM payments
       WHERE project_id = ?
       ORDER BY current_installment ASC`,
      [projectId]
    );

    const [latestPayment] = await connection.execute(
      `SELECT 
        COALESCE(total_installments, 0) as total_installments
       FROM payments
       WHERE project_id = ?
       ORDER BY updated_at DESC, payment_id DESC
       LIMIT 1`,
      [projectId]
    );

    const [allPayments] = await connection.execute(
      `SELECT 
        current_installment,
        current_installment_amount,
        payment_date,
        payment_status,
        created_at
       FROM payments
       WHERE project_id = ? AND current_installment > 0
       ORDER BY current_installment`,
      [projectId]
    );

    const [receivedData] = await connection.execute(
      `SELECT COALESCE(SUM(current_installment_amount), 0) as total_received
       FROM payments
       WHERE project_id = ? AND payment_status = 'paid'`,
      [projectId]
    );

    const totalInstallments = parseInt(latestPayment[0]?.total_installments || 0);
    const scurveData = generateSCurveFromInstallments(totalInstallments, allPayments);

    const latestPaymentData = payments[payments.length - 1] || {};
    const totalRevenue = parseFloat(latestPaymentData.total_amount || 0);
    const received = parseFloat(receivedData[0]?.total_received || 0);
    const completionRate = totalRevenue > 0 ? ((received / totalRevenue) * 100).toFixed(1) : 0;

    // นับจำนวนงวดที่ชำระแล้ว
    const paidInstallments = allPayments.filter(p => p.payment_status === 'paid').length;

    res.status(200).json({
      message: 'ดึงรายละเอียดโครงการสำเร็จ',
      project: {
        ...project,
        total_revenue: totalRevenue,
        received_revenue: received,
        completion_rate: parseFloat(completionRate),
        hasReceivedData: received > 0,
        paid_installments: paidInstallments,
        payments: payments,
        scurve_data: scurveData
      }
    });

  } catch (error) {
    console.error('Error in getProjectDetails:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดโครงการ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// API ดึงสถิติการเงินตามช่วงเวลา
// ================================
const getFinancialStatsByPeriod = async (req, res) => {
  let connection;
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้ใน token' });
    }

    const { projectId, period = 'month' } = req.query;

    connection = await getConnection();

    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
    }

    let query = `
      SELECT 
        DATE_FORMAT(p.payment_date, ?) as period,
        COUNT(DISTINCT p.project_id) as project_count,
        SUM(latest.total_amount) as total_revenue,
        SUM(received.total_received) as total_received
      FROM payments p
      LEFT JOIN (
        SELECT p1.project_id, p1.total_amount
        FROM payments p1
        INNER JOIN (
          SELECT project_id, MAX(updated_at) as max_updated
          FROM payments
          GROUP BY project_id
        ) p2 ON p1.project_id = p2.project_id AND p1.updated_at = p2.max_updated
      ) latest ON p.project_id = latest.project_id
      LEFT JOIN (
        SELECT project_id, SUM(current_installment_amount) as total_received
        FROM payments
        WHERE payment_status = 'paid'
        GROUP BY project_id
      ) received ON p.project_id = received.project_id
      JOIN projects pr ON p.project_id = pr.project_id
      JOIN project_user_roles pur ON pr.project_id = pur.project_id
      WHERE pur.user_id = ? AND pr.active = 1
    `;

    const params = [dateFormat, req.user.user_id];

    if (projectId && projectId !== 'all') {
      query += ` AND p.project_id = ?`;
      params.push(projectId);
    }

    query += ` GROUP BY period ORDER BY period DESC LIMIT 12`;

    const [stats] = await connection.execute(query, params);

    res.status(200).json({
      message: 'ดึงสถิติการเงินสำเร็จ',
      period: period,
      data: stats
    });

  } catch (error) {
    console.error('Error in getFinancialStatsByPeriod:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการดึงสถิติการเงิน',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// API อัพเดทสถานะการชำระเงิน
// ================================
const updatePaymentStatus = async (req, res) => {
  let connection;
  try {
    const { projectId, paymentId } = req.params;
    const { payment_status, payment_method, payment_note, approved_by } = req.body;

    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }

    connection = await getConnection();

    const [projectCheck] = await connection.execute(
      `SELECT p.project_id 
       FROM projects p
       JOIN project_user_roles pur ON p.project_id = pur.project_id
       WHERE p.project_id = ? AND pur.user_id = ? AND p.active = 1`,
      [projectId, req.user.user_id]
    );

    if (projectCheck.length === 0) {
      return res.status(404).json({ message: 'ไม่พบโครงการหรือไม่มีสิทธิ์' });
    }

    const updateFields = ['payment_status = ?'];
    const updateParams = [payment_status];

    if (payment_method) {
      updateFields.push('payment_method = ?');
      updateParams.push(payment_method);
    }

    if (payment_note !== undefined) {
      updateFields.push('payment_note = ?');
      updateParams.push(payment_note);
    }

    if (payment_status === 'paid') {
      updateFields.push('approved_by = ?');
      updateFields.push('approved_date = NOW()');
      updateParams.push(approved_by || req.user.username || req.user.user_id);
    }

    updateFields.push('updated_at = NOW()');
    updateParams.push(paymentId, projectId);

    const [result] = await connection.execute(
      `UPDATE payments 
       SET ${updateFields.join(', ')}
       WHERE payment_id = ? AND project_id = ?`,
      updateParams
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการชำระเงิน' });
    }

    res.status(200).json({
      message: 'อัพเดทสถานะสำเร็จ',
      data: { paymentId, payment_status }
    });

  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// API เพิ่มงวดชำระเงิน (Deprecated - ใช้เพื่อ backward compatibility)
// ================================
const addInstallment = async (req, res) => {
  res.status(410).json({ 
    success: false,
    message: 'API นี้ถูกยกเลิกแล้ว เนื่องจากโครงสร้าง DB เปลี่ยนแปลง',
    suggestion: 'กรุณาเพิ่มข้อมูลผ่าน payments table โดยตรง'
  });
};

// ================================
// API อัพเดทสถานะงวดชำระเงิน (Deprecated - ใช้ updatePaymentStatus แทน)
// ================================
const updateInstallmentStatus = async (req, res) => {
  res.status(410).json({ 
    success: false,
    message: 'API นี้ถูกยกเลิกแล้ว เนื่องจากโครงสร้าง DB เปลี่ยนแปลง',
    suggestion: 'กรุณาใช้ PUT /api/dashboard/project/:projectId/payment/:paymentId/status แทน'
  });
};

module.exports = {
  getOverallStats,
  getProjectStats,
  getProjectDetails,
  getFinancialStatsByPeriod,
  updatePaymentStatus,
  addInstallment,          // Deprecated
  updateInstallmentStatus  // Deprecated
};