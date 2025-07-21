const mysql = require('mysql2/promise')
const { streamSummary } = require('../openai');
// 配置连接参数
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'smarttask',
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

  try {
    const [rows] = await db.query('SELECT * FROM task WHERE id = ?', [taskId]);
    if (!rows || rows.length === 0) {
      res.write(`event: error\ndata: {"message": "任务不存在"}\n\n`);
      return res.end();
    }

    const task = rows[0];
    await streamSummary(task.description, res);
  } catch (err) {
    console.error('AI摘要失败：', err);
    res.write(`event: error\ndata: {"message": "AI摘要失败"}\n\n`);
    res.end();
  }
};