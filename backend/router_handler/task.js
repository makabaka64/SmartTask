const db = require('../db/index');

exports.createTask = (req, res) => {
  const { name, description } = req.body;
  const userId = req.auth.id;

  const insertTask = 'INSERT INTO task (name, description, created_by) VALUES (?, ?, ?)';
  db.query(insertTask, [name, description, userId], (err, result) => {
    if (err) return res.cc(err);
    const taskId = result.insertId;

    // 绑定创建者为 admin
    const getAdminRoleId = 'SELECT id FROM role WHERE name="admin"';
    db.query(getAdminRoleId, (err2, roleResult) => {
      if (err2) return res.cc(err2);
      const adminRoleId = roleResult[0].id;

      const insertUserTaskRole = 'INSERT INTO user_task_role (user_id, task_id, role_id) VALUES (?, ?, ?)';
      db.query(insertUserTaskRole, [userId, taskId, adminRoleId], (err3) => {
        if (err3) return res.cc(err3);
        res.send({ status: 0, message: '任务创建成功', taskId });
      });
    });
  });
};

exports.getTaskDetail = (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.auth.id;
  
    // 1. 查询任务基本信息
    const getTaskSql = 'SELECT * FROM task WHERE id = ?';
    db.query(getTaskSql, [taskId], (err, taskResults) => {
      if (err) return res.cc(err);
      if (taskResults.length === 0) return res.cc('任务不存在');
  
      const task = taskResults[0];
  
      // 2. 查询该用户对该任务的权限
      const getPermSql = `
        SELECT p.name FROM user_task_role utr
        JOIN role r ON utr.role_id = r.id
        JOIN role_permission rp ON r.id = rp.role_id
        JOIN permission p ON rp.permission_id = p.id
        WHERE utr.user_id = ? AND utr.task_id = ?`;
  
      db.query(getPermSql, [userId, taskId], (err2, permResults) => {
        if (err2) return res.cc(err2);
  
        const permissions = permResults.map(p => p.name);
  
        // 3. 返回任务数据 + 当前用户权限
        res.send({
          status: 0,
          message: '获取成功',
          data: {
            ...task,
            permissions,
          },
        });
      });
    });
  };

exports.updateTask = (req, res) => {
  const taskId = req.params.taskId;
  const { name, description } = req.body;
  db.query('UPDATE task SET name=?, description=? WHERE id=?', [name, description, taskId], (err, result) => {
    if (err) return res.cc(err);
    res.send({ status: 0, message: '更新成功' });
  });
};

exports.deleteTask = (req, res) => {
  const taskId = req.params.taskId;
  db.query('DELETE FROM task WHERE id=?', [taskId], (err) => {
    if (err) return res.cc(err);
    res.send({ status: 0, message: '删除成功' });
  });
};

exports.inviteUser = (req, res) => {
  const { email } = req.body;
  const taskId = req.params.taskId;

  db.query('SELECT id FROM user WHERE email=?', [email], (err, userResults) => {
    if (err) return res.cc(err);
    if (userResults.length === 0) return res.cc('用户不存在');
    const userId = userResults[0].id;

    // 添加为 admin
    const getAdminRole = 'SELECT id FROM role WHERE name="admin"';
    db.query(getAdminRole, (err2, roleResults) => {
      if (err2) return res.cc(err2);
      const roleId = roleResults[0].id;
      const insert = 'INSERT IGNORE INTO user_task_role (user_id, task_id, role_id) VALUES (?, ?, ?)';
      db.query(insert, [userId, taskId, roleId], (err3) => {
        if (err3) return res.cc(err3);
        res.send({ status: 0, message: '邀请成功' });
      });
    });
  });
};
