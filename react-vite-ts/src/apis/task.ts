import { request } from '@/utils/request';
import type { TaskDetail } from '@/types/task';
import type { ApiResponse } from '@/types/api';
// 创建任务 （创建者自动为管理员）
export const createTask = (data: TaskDetail): Promise<TaskDetail> => {
  return request.post('/task/create', data);
};
// 获取任务列表
export const getTaskList = (): Promise<ApiResponse<TaskDetail[]>> => {
  return request.get('/task/list');
}
// 获取任务详情
export const getTaskDetail = (id: number): Promise<TaskDetail> => {
  return request.get(`/task/Detail/${id}`);
}
// 编辑任务
export const editTask = (id: number, data: TaskDetail): Promise<TaskDetail> => {
  return request.post(`/task/update/${id}`,data);
};
// 删除任务
export const deleteTask = (id: number): Promise<TaskDetail> => {
    return request.delete(`/task/delete/${id}`);
}
// 邀请成员
export const inviteMember = (id: number, email: string, role:string): Promise<{ status: number; message: string }> => {
    return request.post(`/task/invite/${id}`, { email ,role});
}
// 接受邀请
export const acceptInvitation = (notificationId: number) => {
  return request.post('/task/accept', { notificationId });
};
// 获取任务成员列表
export const getTaskMembers = (taskId: number) => {
  return request.get(`/task/members/${taskId}`);
};
// 删除成员
export const removeMember = (taskId: number, userId: number) => {
  return request.delete(`/task/remove/${taskId}`, {
    data: { userId }
  });
};
// 获取通知
export const fetchNotifications = (): Promise<{ status: number; data: Notification[] }> => {
  return request.get('/task/notification');
};
// 拖拽排序
export const taskSort = (data: any) => {
  return request.post('/task/tasksort', data)
}