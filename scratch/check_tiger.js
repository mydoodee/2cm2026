const mysql = require('mysql2/promise');

async function checkTigerRoles() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '192.168.1.146',
            user: 'spk2024',
            password: 'Password@99',
            database: 'spk_cm2025',
            port: 27019
        });
        // Tiger is user_id 15
        const [roles] = await connection.execute(`
            SELECT pur.project_id, p.job_number, p.company_id, p.active
            FROM project_user_roles pur
            LEFT JOIN projects p ON pur.project_id = p.project_id
            WHERE pur.user_id = 15
        `);
        
        console.log(`--- Tiger (ID: 15) Roles (Total: ${roles.length}) ---`);
        roles.forEach(r => {
            console.log(`Project: ${r.project_id}, Job: ${r.job_number}, Company: ${r.company_id}, Active: ${r.active}`);
        });

        const [companyCount] = await connection.execute(`
            SELECT p.company_id, COUNT(*) as count
            FROM project_user_roles pur
            JOIN projects p ON pur.project_id = p.project_id
            WHERE pur.user_id = 15
            GROUP BY p.company_id
        `);
        console.log('\n--- Roles by Company ---');
        companyCount.forEach(c => {
            console.log(`Company: ${c.company_id}, Count: ${c.count}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

checkTigerRoles();
