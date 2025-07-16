// reminder.js
const schedule = require('node-schedule');
const db = require('./db');

// 调度任务提醒
function scheduleTaskReminder(task) {
  // const remindTime = new Date(new Date(task.created_end).getTime() - 24 * 60 * 60 * 1000); // 提前一天
   const remindTime = new Date(new Date(task.created_end).getTime() - 11 * 60 * 60 * 1000); // 提前一天

  // 如果提醒时间已过，不调度
  if (remindTime < new Date()) return;

  schedule.scheduleJob(`reminder-${task.id}`, remindTime, () => {
    // 1. 查询任务参与者
    db.query(
      'SELECT user_id FROM user_task_role WHERE task_id = ?',
      [task.id],
      (err, users) => {
        if (err) {
          console.error('查询用户失败:', err);
          return;
        }

        // 2. 插入提醒通知
        const message = `任务“${task.name}”即将截止，请及时处理。`;
        users.forEach(user => {
          db.query(
            `INSERT INTO notification (user_id, sender_id, task_id, type, message)
             VALUES (?, NULL, ?, 'reminder', ?)`,
            [user.user_id, task.id, message],
            (insertErr) => {
              if (insertErr) {
                console.error('插入通知失败:', insertErr);
              }
            }
          );
        });

        console.log(`任务 ${task.id} 的提醒已发送`);
      }
    );
  });
}


module.exports = { scheduleTaskReminder };
