// jobStatusController.js
const { getConnection } = require('../config/db');

const getJobStatusDetails = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await getConnection();

        const [details] = await connection.execute(
            'SELECT * FROM project_job_status_details WHERE project_id = ? ORDER BY id ASC',
            [id]
        );

        res.json({ success: true, data: details });
    } catch (error) {
        console.error('Error fetching job status details:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลรายละเอียดสถานะงาน' });
    } finally {
        if (connection) await connection.release();
    }
};

const updateJobStatusDetails = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { details } = req.body; // Array of { category_name, system_1, system_2, system_3, system_4 }
        connection = await getConnection();

        await connection.beginTransaction();

        // 1. Delete existing details
        await connection.execute(
            'DELETE FROM project_job_status_details WHERE project_id = ?',
            [id]
        );

        // 2. Insert new details
        if (details && details.length > 0) {
            for (const item of details) {
                await connection.execute(
                    `INSERT INTO project_job_status_details 
                    (project_id, category_name, system_1, system_2, system_3, system_4, 
                     system_1_link, system_2_link, system_3_link, system_4_link) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id, 
                        item.category_name, 
                        Number(item.system_1) || 0, 
                        Number(item.system_2) || 0, 
                        Number(item.system_3) || 0, 
                        Number(item.system_4) || 0,
                        item.system_1_link || null,
                        item.system_2_link || null,
                        item.system_3_link || null,
                        item.system_4_link || null
                    ]
                );
            }
        }

        // 3. Calculate Overall Progress
        // Progress = Average of all non-zero cells? Or average of all defined systems?
        // Let's assume average of all cells that have been defined (even if 0)
        let totalProgress = 0;
        let cellCount = 0;

        if (details && details.length > 0) {
            details.forEach(item => {
                totalProgress += (Number(item.system_1) || 0);
                totalProgress += (Number(item.system_2) || 0);
                totalProgress += (Number(item.system_3) || 0);
                totalProgress += (Number(item.system_4) || 0);
                cellCount += 4;
            });
        }

        const averageProgress = cellCount > 0 ? (totalProgress / cellCount) : 0;

        // 4. Update the main project's job_status_progress
        await connection.execute(
            'UPDATE projects SET job_status_progress = ?, updated_at = NOW() WHERE project_id = ?',
            [averageProgress.toFixed(2), id]
        );

        await connection.commit();
        res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ', averageProgress });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating job status details:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
        if (connection) await connection.release();
    }
};

module.exports = {
    getJobStatusDetails,
    updateJobStatusDetails
};
