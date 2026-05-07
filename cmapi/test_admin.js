
const { getConnection } = require('./src/config/db');

async function testAdmin() {
    let connection;
    try {
        connection = await getConnection();
        
        // Let's get a user who might be admin
        const [users] = await connection.execute('SELECT * FROM users LIMIT 10');
        console.log('Users:');
        console.table(users.map(u => ({ id: u.user_id, username: u.username })));

        const [adminRoles] = await connection.execute(
            'SELECT user_id, project_id, role_id FROM project_user_roles WHERE role_id = 1 LIMIT 10'
        );
        console.log('Admin Roles:');
        console.table(adminRoles);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testAdmin();
