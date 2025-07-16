const express = require('express');
const router = express.Router();
const taskHandler = require('../router_handler/task');
const checkPermission = require('../middleware/checkPermission');

// 创建任务（创建者自动为管理员）
router.post('/create', taskHandler.createTask);

// 获取任务列表
router.get('/list', taskHandler.getTaskList);

// 获取任务详情
router.get('/Detail/:taskId', checkPermission('taskId', 'view_task'), taskHandler.getTaskDetail);

// 编辑任务
router.post('/update/:taskId', checkPermission('taskId', 'edit_task'), taskHandler.updateTask);

// 删除任务
router.delete('/delete/:taskId', checkPermission('taskId', 'delete_task'), taskHandler.deleteTask);

// 邀请成员
router.post('/invite/:taskId', checkPermission('taskId', 'member_manage'), taskHandler.inviteUser);

// 删除成员
router.delete('/remove/:taskId', checkPermission('taskId', 'member_manage'), taskHandler.removeMember);

// 同意邀请
router.post('/accept', taskHandler.acceptInvitation);

// 获取成员列表
router.get('/members/:taskId', taskHandler.getTaskMembers);



// router.post('/status/:taskId', taskHandler.changeStatus)

router.post('/tasksort', taskHandler.taskSort)

// 获取通知
router.get('/notification', taskHandler.getNotificationList);

module.exports = router;