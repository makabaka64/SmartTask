const db = require('../db/index');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

function toMysqlDatetime(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.replace('T', ' ').replace('Z', '').split('.')[0];
  }
  return value;
}

async function getRoleIdByName(roleName) {
  const roles = await query('SELECT id FROM role WHERE name = ?', [roleName]);
  if (!roles.length) {
    throw new Error(`${roleName} role not found`);
  }
  return roles[0].id;
}

async function createTaskForUser(userId, task) {
  const createdAt = toMysqlDatetime(task.created_at);
  const createdEnd = toMysqlDatetime(task.created_end);
  const insertTaskSql =
    'INSERT INTO task (name, description, userId, created_at, created_end, item_index, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const result = await query(insertTaskSql, [
    task.name,
    task.description,
    userId,
    createdAt,
    createdEnd,
    task.index,
    task.status ?? 0
  ]);

  const adminRoleId = await getRoleIdByName('admin');
  await query('INSERT INTO user_task_role (user_id, task_id, role_id) VALUES (?, ?, ?)', [
    userId,
    result.insertId,
    adminRoleId
  ]);

  return result.insertId;
}

async function getUserTasks(userId) {
  const sql = `
    SELECT t.*
    FROM task t
    JOIN user_task_role utr ON t.id = utr.task_id
    WHERE utr.user_id = ?
    ORDER BY t.item_index ASC, t.created_end ASC
  `;
  return query(sql, [userId]);
}

function summarizeTasks(tasks) {
  const now = Date.now();
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 1).length,
    overdue: tasks.filter((task) => task.status !== 1 && new Date(task.created_end).getTime() < now).length,
    inProgress: tasks.filter((task) => {
      if (task.status === 1) return false;
      const start = new Date(task.created_at).getTime();
      const end = new Date(task.created_end).getTime();
      return start <= now && now <= end;
    }).length,
    upcoming: tasks.filter((task) => task.status !== 1 && new Date(task.created_at).getTime() > now).length
  };
}

module.exports = {
  query,
  toMysqlDatetime,
  createTaskForUser,
  getUserTasks,
  summarizeTasks
};
