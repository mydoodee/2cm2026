
const { getConnection } = require('../cmapi/src/config/db');

async function checkProjects() {
    let connection;
    try {
        connection = await getConnection();
        const [projects] = await connection.execute('SELECT project_id, job_number, company_id FROM projects WHERE active = 1 LIMIT 20');
        console.log('--- Projects ---');
        projects.forEach(p => {
            console.log(`ID: ${p.project_id} (Type: ${typeof p.project_id}), Job: ${p.job_number}, Company: ${p.company_id}`);
        });

        const [roles] = await connection.execute('SELECT * FROM project_user_roles LIMIT 10');
        console.log('\n--- Project User Roles ---');
        roles.forEach(r => {
            console.log(`User: ${r.user_id}, Project: ${r.project_id} (Type: ${typeof r.project_id}), Role: ${r.role_id}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.release();
        process.exit();
    }
}

checkProjects();
