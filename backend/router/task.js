const express = require('express');
const router = express.Router();
const taskHandler = require('../router_handler/task');
const checkPermission = require('../middleware/checkPermission');

// 创建任务（创建者自动为管理员）
router.post('/create', taskHandler.createTask);

// 获取任务详情
router.get('/:taskId', checkPermission('taskId', 'view_task'), taskHandler.getTaskDetail);

// 编辑任务
router.post('/:taskId', checkPermission('taskId', 'edit_task'), taskHandler.updateTask);

// 删除任务
router.delete('/:taskId', checkPermission('taskId', 'delete_task'), taskHandler.deleteTask);

// 邀请成员
router.post('/:taskId/invite', checkPermission('taskId', 'edit_task'), taskHandler.inviteUser);

module.exports = router;