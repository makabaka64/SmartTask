// 通用 API 响应类型
export interface TaskDetail {
    id?: number;
    userId?: number; 
    name?: string;
    description: string;
    created_at: string;
    created_end: string;
    status?:  number; // 任务状态：0-未完成，1-已完成
    permissions?: string[]; // 任务权限列表
    index?: number;
    data?: any;
  }
  export interface taskSummary {
    taskId: number;
    summary: string;
  }