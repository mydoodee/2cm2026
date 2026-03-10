require('dotenv').config();
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'not set');
console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'set' : 'not set');
console.log('LOGGING_ENABLED:', process.env.LOGGING_ENABLED);