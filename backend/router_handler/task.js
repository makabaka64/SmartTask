const db = require('../db/index');
const { scheduleTaskReminder } = require('../reminder');
// 时间格式转换函数
function toMysqlDatetime(isoString) {
    return isoString ? isoString.replace('T', ' ').replace('Z', '').split('.')[0] : null;
  }
// 创建任务
exports.createTask = (req, res) => {
  const { name, description, created_at, created_end, index } = req.body;
  const userId = req.user.id;
  const createdAt = toMysqlDatetime(created_at);
   const createdEnd = toMysqlDatetime(created_end);
  const insertTask = 'INSERT INTO task (name, description, userId, created_at, created_end, item_index) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(insertTask, [name, description, userId, createdAt, createdEnd, index], (err, result) => {
    if (err) return res.cc(err);
    const taskId = result.insertId;

    // 绑定创建者为 admin
    const getAdminRoleId = 'SELECT id FROM role WHERE name = ?';
    db.query(getAdminRoleId, ['admin'],(err2, roleResult) => {
      if (err2) return res.cc(err2);
      console.log('roleResult 查询结果：', roleResult); 
      if (!roleResult || roleResult.length === 0) {
        console.error('未查到 admin 角色，role 表中可能没有符合条件的数据');
        return res.cc('admin角色不存在，请检查数据库数据');
      }
    
      const adminRoleId = roleResult[0].id;

      const insertUserTaskRole = 'INSERT INTO user_task_role (user_id, task_id, role_id) VALUES (?, ?, ?)';
      db.query(insertUserTaskRole, [userId, taskId, adminRoleId], (err3) => {
        if (err3) return res.cc(err3);
            // 截止日期提醒
            scheduleTaskReminder({
                id: taskId,
                name,
                created_end: createdEnd,
              });

        res.send({ status: 0, message: '任务创建成功', taskId });
      });
    });
  });
};
// 获取任务列表
exports.getTaskList = (req, res) => {
    const userId = req.user.id;

    const sql = `
    SELECT t.* 
    FROM task t
    JOIN user_task_role utr ON t.id = utr.task_id
    WHERE utr.user_id = ?`;

    db.query(sql, [userId],(err, results) => {
      if (err) return res.cc(err);
      
      res.send({
        status: 0,
        message: '获取任务列表成功',
        data: results,
      });
    });
  };

// 获取任务详情
exports.getTaskDetail = (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user.id;
  
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
// 更新任务
exports.updateTask = (req, res) => {
  const taskId = req.params.taskId;
  const { description,status } = req.body;
  db.query('UPDATE task SET description=?, status=? WHERE id=?', [ description, status, taskId], (err, result) => {
    if (err) return res.cc(err);
    res.send({ status: 0, message: '更新成功' });
  });
};
// 删除任务
exports.deleteTask = (req, res) => {
  const taskId = req.params.taskId;
  db.query('DELETE FROM task WHERE id=?', [taskId], (err) => {
    if (err) return res.cc(err);
    res.send({ status: 0, message: '删除成功' });
  });
};

// 邀请用户加入任务（生成通知）
exports.inviteUser = (req, res) => {
    const { email } = req.body;
    const taskId = req.params.taskId;
  
    // 1. 验证权限
    const checkPermission = `
      SELECT utr.user_id FROM user_task_role utr
      JOIN role_permission rp ON utr.role_id = rp.role_id
      JOIN permission p ON rp.permission_id = p.id
      WHERE utr.task_id = ? AND p.name = 'member_manage'
    `;
    db.query(checkPermission, [taskId], (permErr, permResults) => {
      if (permErr) return res.cc(permErr);
      if (!permResults.some(r => r.user_id === req.user.id)) {
        return res.cc('无权邀请成员', 403);
      }
  
      // 2. 获取被邀请用户
      db.query('SELECT id FROM user WHERE email = ?', [email], (userErr, userResults) => {
        if (userErr) return res.cc(userErr);
        if (userResults.length === 0) return res.cc('该用户不存在');
  
        const recipientId = userResults[0].id;
        const message = `${req.user.nickname} 邀请你参与任务 ${taskId}`;
        // 3. 插入一条“邀请”通知
       
        const insertNotification = `
          INSERT INTO notification (recipient_id, sender_id, task_id, type, message)
          VALUES (?, ?, ?, 'invite', ?)
        `;
  
       
        db.query(insertNotification, [recipientId, req.user.id, taskId, message], (notiErr, notiRes) => {
          if (notiErr) return res.cc(notiErr);
          res.cc('邀请已发送，等待对方确认', 0);
        });
      });
    });
  };

  // 同意邀请
exports.acceptInvitation = (req, res) => {
    const { notificationId } = req.body;
    const userId = req.user.id;
  
    // 1. 获取通知详情
    const getNoti = 'SELECT * FROM notification WHERE id = ? AND recipient_id = ? AND type = "invite" AND status = "pending"';
    db.query(getNoti, [notificationId, userId], (err, results) => {
      if (err) return res.cc(err);
      if (results.length === 0) return res.cc('邀请不存在或已处理');
  
      const { task_id } = results[0];
  
      // 2. 获取 Participant 角色 ID
      db.query('SELECT id FROM role WHERE name = "Participant"', (roleErr, roleResults) => {
        if (roleErr) return res.cc(roleErr);
        const roleId = roleResults[0].id;
  
        // 3. 插入用户任务关系
        const insert = 'INSERT IGNORE INTO user_task_role (user_id, task_id, role_id) VALUES (?, ?, ?)';
        db.query(insert, [userId, task_id, roleId], (relErr) => {
          if (relErr) return res.cc(relErr);
  
          // 4. 更新通知状态
          const updateNoti = 'UPDATE notification SET status = "accepted" WHERE id = ?';
          db.query(updateNoti, [notificationId]);
  
          res.cc('已成功加入任务', 0);
        });
      });
    });
  };

  // 获取任务成员列表
  exports.getTaskMembers = (req, res) => {
    const taskId = req.params.taskId;
  
    const sql = `
      SELECT 
     u.id, u.nickname, u.email, u.avater_url,
     r.name AS role
    FROM user_task_role utr
    JOIN user u ON utr.user_id = u.id
    JOIN role r ON utr.role_id = r.id
    WHERE utr.task_id = ?
    `;
  
    db.query(sql, [taskId], (err, results) => {
      if (err) return res.cc(err);
      res.send({
        status: 0,
        message: '获取任务成员成功',
        data: results,
      });
    });
  };

  // 删除任务成员
exports.removeMember = (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { userId } = req.body;
  const currentUserId = req.user.id;

  if (!userId) return res.cc('缺少成员 userId');

  // 阻止删除自己
  if (userId === currentUserId) {
    return res.cc('不能删除自己');
  }

    const deleteSql = `DELETE FROM user_task_role WHERE user_id = ? AND task_id = ?`;
    db.query(deleteSql, [userId, taskId], (delErr, result) => {
      if (delErr) return res.cc(delErr);
      if (result.affectedRows === 0) return res.cc('该用户不在任务中');
      return res.cc('成员删除成功', 0);
    });
  }


  // 拖拽排序处理
  exports.taskSort = (req, res) => {
    const {oldIndex, newIndex, userId} = req.body
    if(+oldIndex === +newIndex) {
      return res.cc('修改成功！', 0)
    }
    const low = +oldIndex < +newIndex ? +oldIndex : +newIndex
    const high = +oldIndex > +newIndex ? +oldIndex : +newIndex
    const type = +newIndex < +oldIndex ? 1 : -1
    const offest = +newIndex
    const strsql = `select id from task where userId=? and item_index=?`
    db.query(strsql, [userId, +oldIndex], (err, result) => {
      if(err) return res.cc(err)
      if(result.length !== 1) return res.cc('查询参数错误！')
      const task_id = result[0].id
      
      const sql = `update task set item_index=item_index+? where userId=? and item_index>=? and item_index<=?`
      db.query(sql, [type, +userId, low, high], (err, result) => {
        if(err) {
          return res.cc(err)
        }
        const sql2 = `update task set item_index=? where id=?`
        db.query(sql2, [offest, task_id], (err, result) => {
          if(err) return res.cc(err)
          return res.cc('修改成功！', 0)
        })
      })
    })
    
  }

  // 获取通知
exports.getNotificationList = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT * FROM notification
    WHERE recipient_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: '获取通知成功',
      data: results,
    });
  });
};

