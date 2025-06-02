const db = require('../db/index');

module.exports = (taskIdParam = 'taskId', requiredPermission) => {
  return async (req, res, next) => {
    const userId = req.auth.id;
    const taskId = parseInt(req.params[taskIdParam] || req.body[taskIdParam]);

    if (!taskId) return res.cc('任务 ID 缺失');

    const sql = `
      SELECT p.name FROM user_task_role utr
      JOIN role r ON utr.role_id = r.id
      JOIN role_permission rp ON r.id = rp.role_id
      JOIN permission p ON rp.permission_id = p.id
      WHERE utr.user_id = ? AND utr.task_id = ?`;

    db.query(sql, [userId, taskId], (err, results) => {
      if (err) return res.cc(err);
      const userPermissions = results.map(r => r.name);
      if (!userPermissions.includes(requiredPermission)) {
        return res.cc('无权限执行该操作', 403);
      }
      next();
    });
  };
};