// reminder.js
const schedule = require('node-schedule');
const db = require('./db');

// 每分钟扫描一次所有未来 24 小时内到期、且从未提醒过的任务列表
schedule.scheduleJob('*/1 * * * *', async () => {
    const now = new Date();
    const aheadTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
   
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');
    const aheadStr = aheadTime.toISOString().slice(0, 19).replace('T', ' ');
     
    const time = 'SELECT id, name FROM task WHERE created_end <= ? AND created_end > ? AND reminded = 0';
    db.query(time, [aheadStr, nowStr], (err, results) => {
      if (err) {
        console.error('[提醒扫描] 查询任务失败:', err);
        return;
      }
      if(!results || results.length === 0) {
        // console.log('[提醒扫描] 没有即将到期的任务');
        return;
      }
      results.forEach(task => {
        // 查询任务的参与者
        db.query('SELECT user_id FROM user_task_role WHERE task_id = ?', [task.id], (err2, users) => {
          if (err2) {
            console.error(`[提醒扫描] 查询任务 ${task.id} 成员失败:`, err2);
            return;
          }
          
          const message = `任务 "${task.name}" 即将到期，请及时处理！`;
          users.forEach(user => {
            // 发送提醒给每个参与者
            db.query(
              `INSERT INTO notification (recipient_id, sender_id, task_id, type, message)
               VALUES (?, NULL, ?, 'reminder', ?)`,
              [user.user_id, task.id, message],
              (insertErr) => {
                if (insertErr) console.error(`[提醒扫描] 插入提醒失败`, insertErr);
              }
            );
          })
       // 更新任务为已提醒状态
          db.query('UPDATE task SET reminded = 1 WHERE id = ?', [task.id], (updateErr) => {
            if (updateErr) {
              console.error(`[提醒扫描] 更新任务 ${task.id} 为已提醒状态失败:`, updateErr);
        } })
      })
    });
  });
});
