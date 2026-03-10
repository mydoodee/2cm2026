const bcrypt = require('bcrypt');
const { getConnection } = require('./src/config/db');

async function resetPassword() {
    const username = 'user2';
    const newPassword = 'U12356';

    try {
        const connection = await getConnection();
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [password_hash, username]
        );

        if (result.affectedRows === 0) {
            console.log(`No user found with username: ${username}`);
            await connection.end();
            return;
        }

        console.log(`Password hash updated for user: ${username}`);
        console.log(`New hash: ${password_hash}`);

        await connection.execute(
            'INSERT INTO logs (message) VALUES (?)',
            [`Password reset for user: ${username}`]
        );

        await connection.end();
    } catch (error) {
        console.error('Error updating password:', error);
    }
}

resetPassword();