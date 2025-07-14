// reminder.js
const schedule = require('node-schedule');
const db = require('./db');

// 调度任务提醒
function scheduleTaskReminder(task) {
  const remindTime = new Date(new Date(task.created_end).getTime() - 24 * 60 * 60 * 1000); // 提前一天

  // 时间已过则不调度
  if (remindTime < new Date()) return;

 schedule.scheduleJob(`reminder-${task.id}`, remindTime, async () => {
    try {
      // 1. 查询任务参与者
      const [users] = await db.promise().query(
        'SELECT user_id FROM user_task_role WHERE task_id = ?',
        [task.id]
      );

      // 2. 插入每个人的提醒通知
      const message = `任务“${task.name}”即将截止，请及时处理。`;
      for (const user of users) {
        await db.promise().query(
          `INSERT INTO notification (user_id, sender_id, task_id, type, message)
           VALUES (?, NULL, ?, 'reminder', ?)`,
          [user.user_id, task.id, message]
        );
      }

      console.log(`任务 ${task.id} 的提醒已发送`);
    } catch (err) {
      console.error('提醒任务出错:', err);
    }
  });
}

module.exports = { scheduleTaskReminder };
