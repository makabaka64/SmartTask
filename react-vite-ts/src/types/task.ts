export interface TaskDetail {
    id: number;
    name: string;
    description: string;
    created_at: string;
    created_by: number;
    permissions: string[]; // eg: ['view_task', 'edit_task']
  }