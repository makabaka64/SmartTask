// 导入 mysql 模块
const mysql = require('mysql')

// 创建数据库连接对象
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'smarttask',
})
db.getConnection((err, conn) => {
    if (err) {
      console.error('数据库连接失败:', err)
    } else {
      console.log('数据库连接成功')
      conn.release()
    }
  })
// 向外共享 db 数据库连接对象
module.exports = db