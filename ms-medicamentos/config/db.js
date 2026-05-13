const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3308,
  database: process.env.DB_NAME || 'medicamentos',
  user:     process.env.DB_USER || 'med_user',
  password: process.env.DB_PASS || 'med_pass123',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
