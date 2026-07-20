const mysql = require('mysql2/promise')
const { streamSummary } = require('../openai');
const config = require('../config');
// 配置连接参数
const db = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// SSE 流式摘要
exports.handleStreamSummary = async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const taskId = req.params.taskId;
  const lastEventId = req.query.lastEventId || null; // 前端传入断点位置

  try {
    const [rows] = await db.query('SELECT * FROM task WHERE id = ?', [taskId]);
    if (!rows || rows.length === 0) {
      res.write(`event: error\ndata: {"message": "任务不存在"}\n\n`);
      return res.end();
    }

    const task = rows[0];
    const previous = '';
    // 传递断点
    await streamSummary(task.description, res, { lastEventId , previous });
  } catch (err) {
    console.error('AI摘要失败：', err);
    res.write(`event: error\ndata: {"message": "AI摘要失败"}\n\n`);
    res.end();
  }
};
