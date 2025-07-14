export interface Notification {
    id: number;
    user_id: number;
    sender_id?: number | null;
    task_id: number;
    type: 'reminder' | 'invite';
    message: string;
    status: 'unread' | 'read' | 'accepted' | 'rejected';
    created_at: string
  }
  