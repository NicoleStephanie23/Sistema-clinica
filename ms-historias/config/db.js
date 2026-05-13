const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3307,
  database: process.env.DB_NAME || 'historias_clinicas',
  user:     process.env.DB_USER || 'hc_user',
  password: process.env.DB_PASS || 'hc_pass123',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
