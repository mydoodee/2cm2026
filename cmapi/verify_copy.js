const { pool } = require('./src/config/db');

async function check() {
    try {
        const [users] = await pool.execute('SELECT user_id, username FROM users WHERE user_id IN (15, 7)');
        console.log('Users:', users);

        const [tigerRoles] = await pool.execute('SELECT COUNT(*) as count FROM project_user_roles WHERE user_id = 15');
        console.log('Tiger Total Roles:', tigerRoles[0].count);

        const [basRoles] = await pool.execute('SELECT COUNT(*) as count FROM project_user_roles WHERE user_id = 7');
        console.log('Bas Total Roles:', basRoles[0].count);

        const [basSpkRoles] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM project_user_roles pur 
            JOIN projects p ON pur.project_id = p.project_id 
            WHERE pur.user_id = 7 AND p.company_id = 'spk-default'
        `);
        console.log('Bas SPK Roles:', basSpkRoles[0].count);

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

check();
