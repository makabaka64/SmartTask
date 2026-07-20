const mysql = require('mysql');
const config = require('../config');

const db = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

db.getConnection((err, conn) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }

  console.log('Database connected successfully');
  conn.release();
});

module.exports = db;
