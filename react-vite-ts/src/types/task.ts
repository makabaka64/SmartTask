export interface TaskDetail {
    id?: number;
    userId?: number; 
    name: string;
    description: string;
    created_at: string;
    created_end?: string;
    status?:  '0' | '1';
    permissions?: string[]; // 任务权限列表
  }