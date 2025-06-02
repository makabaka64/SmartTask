import { request } from '@/utils/request';
import type { TaskDetail } from '@/types/task';
// 创建任务 （创建者自动为管理员）
export const createTask = (data: TaskDetail): Promise<TaskDetail> => {
  return request.post('/task/create', data);
};
// 获取任务详情
export const getTaskDetail = (id: string): Promise<TaskDetail> => {
  return request.get(`/task/${id}`);
}
// 编辑任务
export const editTask = (id: string, data: TaskDetail): Promise<TaskDetail> => {
  return request.post(`/task/${id}`,data);
};
// 删除任务
export const deleteTask = (id: string): Promise<TaskDetail> => {
    return request.delete(`/task/${id}`);
}
// 邀请成员
export const inviteMember = (id: string, email: string): Promise<TaskDetail> => {
    return request.post(`/task/${id}/invite`, { email });
}