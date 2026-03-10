// controllers/scheduleController.js
const { getConnection } = require('../config/db');

// =============================================
// TASKS - GET ALL BY PROJECT
// =============================================
exports.getTasksByProject = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();
    
    const [tasks] = await connection.query(
      `SELECT * FROM schedule_tasks 
       WHERE project_id = ? 
       ORDER BY display_order, task_number`,
      [projectId]
    );
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TASKS - GET ONE
// =============================================
exports.getTaskById = async (req, res) => {
  let connection;
  try {
    const { taskId } = req.params;
    connection = await getConnection();
    
    const [tasks] = await connection.query(
      `SELECT * FROM schedule_tasks WHERE task_id = ?`,
      [taskId]
    );
    
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบงาน' });
    }
    
    res.json({ success: true, data: tasks[0] });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TASKS - CREATE
// =============================================
exports.createTask = async (req, res) => {
  let connection;
  try {
    const {
      project_id,
      task_number,
      task_name,
      task_type,
      parent_task_id,
      start_date,
      end_date,
      duration_days,
      progress_percent,
      status,
      color,
      display_order,
      is_milestone,
      responsible_person,
      notes
    } = req.body;

    connection = await getConnection();
    
    // Validate required fields
    if (!project_id || !task_name || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลที่จำเป็น' 
      });
    }

    const [result] = await connection.query(
      `INSERT INTO schedule_tasks 
       (project_id, task_number, task_name, task_type, parent_task_id, 
        start_date, end_date, duration_days, progress_percent, status, 
        color, display_order, is_milestone, responsible_person, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        task_number || null,
        task_name,
        task_type || 'main',
        parent_task_id || null,
        start_date,
        end_date,
        duration_days || 0,
        progress_percent || 0,
        status || 'not_started',
        color || '#1890ff',
        display_order || 0,
        is_milestone || 0,
        responsible_person || null,
        notes || null
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'เพิ่มงานสำเร็จ',
      data: { task_id: result.insertId } 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TASKS - UPDATE
// =============================================
exports.updateTask = async (req, res) => {
  let connection;
  try {
    const { taskId } = req.params;
    const {
      task_number,
      task_name,
      start_date,
      end_date,
      duration_days,
      progress_percent,
      status,
      color,
      display_order,
      responsible_person,
      notes
    } = req.body;

    connection = await getConnection();
    
    await connection.query(
      `UPDATE schedule_tasks 
       SET task_number = ?, task_name = ?, start_date = ?, end_date = ?, 
           duration_days = ?, progress_percent = ?, status = ?, color = ?,
           display_order = ?, responsible_person = ?, notes = ?
       WHERE task_id = ?`,
      [
        task_number,
        task_name,
        start_date,
        end_date,
        duration_days || 0,
        progress_percent || 0,
        status || 'not_started',
        color || '#1890ff',
        display_order || 0,
        responsible_person || null,
        notes || null,
        taskId
      ]
    );
    
    res.json({ success: true, message: 'แก้ไขงานสำเร็จ' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// TASKS - DELETE
// =============================================
exports.deleteTask = async (req, res) => {
  let connection;
  try {
    const { taskId } = req.params;
    connection = await getConnection();
    
    // Check if task has subtasks
    const [subTasks] = await connection.query(
      `SELECT task_id FROM schedule_tasks WHERE parent_task_id = ?`,
      [taskId]
    );
    
    if (subTasks.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ไม่สามารถลบงานที่มีงานย่อยได้' 
      });
    }
    
    await connection.query(
      `DELETE FROM schedule_tasks WHERE task_id = ?`,
      [taskId]
    );
    
    res.json({ success: true, message: 'ลบงานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// MILESTONES - GET BY PROJECT
// =============================================
exports.getMilestonesByProject = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.params;
    connection = await getConnection();
    
    const [milestones] = await connection.query(
      `SELECT * FROM schedule_milestones 
       WHERE project_id = ? 
       ORDER BY milestone_date`,
      [projectId]
    );
    
    res.json({ success: true, data: milestones });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// MILESTONES - CREATE
// =============================================
exports.createMilestone = async (req, res) => {
  let connection;
  try {
    const {
      project_id,
      task_id,
      milestone_name,
      milestone_date,
      milestone_type,
      description,
      icon_color
    } = req.body;

    connection = await getConnection();
    
    const [result] = await connection.query(
      `INSERT INTO schedule_milestones 
       (project_id, task_id, milestone_name, milestone_date, milestone_type, description, icon_color) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        task_id || null,
        milestone_name,
        milestone_date,
        milestone_type || 'custom',
        description || null,
        icon_color || '#FF0000'
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'เพิ่ม Milestone สำเร็จ',
      data: { milestone_id: result.insertId } 
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// MILESTONES - UPDATE
// =============================================
exports.updateMilestone = async (req, res) => {
  let connection;
  try {
    const { milestoneId } = req.params;
    const {
      milestone_name,
      milestone_date,
      milestone_type,
      is_completed,
      completed_date,
      description,
      icon_color
    } = req.body;

    connection = await getConnection();
    
    await connection.query(
      `UPDATE schedule_milestones 
       SET milestone_name = ?, milestone_date = ?, milestone_type = ?,
           is_completed = ?, completed_date = ?, description = ?, icon_color = ?
       WHERE milestone_id = ?`,
      [
        milestone_name,
        milestone_date,
        milestone_type,
        is_completed || 0,
        completed_date || null,
        description || null,
        icon_color || '#FF0000',
        milestoneId
      ]
    );
    
    res.json({ success: true, message: 'แก้ไข Milestone สำเร็จ' });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// MILESTONES - DELETE
// =============================================
exports.deleteMilestone = async (req, res) => {
  let connection;
  try {
    const { milestoneId } = req.params;
    connection = await getConnection();
    
    await connection.query(
      `DELETE FROM schedule_milestones WHERE milestone_id = ?`,
      [milestoneId]
    );
    
    res.json({ success: true, message: 'ลบ Milestone สำเร็จ' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// HOLIDAYS - GET ALL
// =============================================
exports.getHolidays = async (req, res) => {
  let connection;
  try {
    const { projectId } = req.query;
    connection = await getConnection();
    
    let query = `SELECT * FROM schedule_holidays WHERE 1=1`;
    const params = [];
    
    if (projectId) {
      query += ` AND (project_id IS NULL OR project_id = ?)`;
      params.push(projectId);
    } else {
      query += ` AND project_id IS NULL`;
    }
    
    query += ` ORDER BY holiday_date`;
    
    const [holidays] = await connection.query(query, params);
    
    res.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// PROGRESS LOGS - GET BY TASK
// =============================================
exports.getProgressLogsByTask = async (req, res) => {
  let connection;
  try {
    const { taskId } = req.params;
    connection = await getConnection();
    
    const [logs] = await connection.query(
      `SELECT * FROM schedule_progress_logs 
       WHERE task_id = ? 
       ORDER BY log_date DESC`,
      [taskId]
    );
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching progress logs:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// PROGRESS LOGS - CREATE
// =============================================
exports.createProgressLog = async (req, res) => {
  let connection;
  try {
    const {
      task_id,
      log_date,
      progress_percent,
      actual_start_date,
      actual_end_date,
      status,
      comments,
      images,
      recorded_by
    } = req.body;

    connection = await getConnection();
    
    const [result] = await connection.query(
      `INSERT INTO schedule_progress_logs 
       (task_id, log_date, progress_percent, actual_start_date, actual_end_date, 
        status, comments, images, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task_id,
        log_date,
        progress_percent,
        actual_start_date || null,
        actual_end_date || null,
        status || 'on_schedule',
        comments || null,
        images || null,
        recorded_by || null
      ]
    );
    
    // Update task progress
    await connection.query(
      `UPDATE schedule_tasks SET progress_percent = ? WHERE task_id = ?`,
      [progress_percent, task_id]
    );
    
    res.json({ 
      success: true, 
      message: 'บันทึกความคืบหน้าสำเร็จ',
      data: { log_id: result.insertId } 
    });
  } catch (error) {
    console.error('Error creating progress log:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// =============================================
// HEALTH CHECK
// =============================================
exports.healthCheck = (req, res) => {
  res.json({
    success: true,
    message: 'Schedule routes are working',
    user: {
      id: req.user.user_id,
      email: req.user.email
    },
    timestamp: new Date().toISOString(),
    features: [
      'Task Management (Main & Sub Tasks)',
      'Milestone Tracking',
      'Holiday Management',
      'Progress Logging',
      'Gantt Chart Support',
      'S-Curve Integration'
    ]
  });
};

module.exports = exports;