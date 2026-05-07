const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/it/Desktop/WEB-MENU2GO/SPK/CM 2026/cmapi/.env' });

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [users] = await connection.execute('SELECT user_id, username FROM users WHERE user_id IN (15, 7)');
        console.log('Users:', users);

        const [tigerRoles] = await connection.execute('SELECT COUNT(*) as count FROM project_user_roles WHERE user_id = 15');
        console.log('Tiger Total Roles:', tigerRoles[0].count);

        const [basRoles] = await connection.execute('SELECT COUNT(*) as count FROM project_user_roles WHERE user_id = 7');
        console.log('Bas Total Roles:', basRoles[0].count);

        const [basSpkRoles] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM project_user_roles pur 
            JOIN projects p ON pur.project_id = p.project_id 
            WHERE pur.user_id = 7 AND p.company_id = 'spk-default'
        `);
        console.log('Bas SPK Roles:', basSpkRoles[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

check();
