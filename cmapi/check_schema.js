
const { getConnection } = require('./src/config/db');

async function checkSchema() {
    let connection;
    try {
        connection = await getConnection();
        console.log('Checking project_user_roles:');
        const [pur] = await connection.query('DESCRIBE project_user_roles');
        console.table(pur);

        console.log('Checking folder_permissions:');
        const [fp] = await connection.query('DESCRIBE folder_permissions');
        console.table(fp);
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
