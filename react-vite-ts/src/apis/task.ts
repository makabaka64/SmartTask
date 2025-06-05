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
export const getTaskDetail = (id: string): Promise<TaskDetail> => {
  return request.get(`/Detail/task/${id}`);
}
// 编辑任务
export const editTask = (id: string, data: TaskDetail): Promise<TaskDetail> => {
  return request.post(`/update/task/${id}`,data);
};
// 删除任务
export const deleteTask = (id: string): Promise<TaskDetail> => {
    return request.delete(`/delete/task/${id}`);
}
// 邀请成员
// export const inviteMember = (id: string, email: string): Promise<TaskDetail> => {
//     return request.post(`/task/${id}/invite`, { email });
// }