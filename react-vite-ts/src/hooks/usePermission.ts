import { useMemo } from 'react';
import type { TaskDetail } from '@/types/task';

export function usePermission(task: TaskDetail | null, required: string) {
  return useMemo(() => {
    if (!task || !task.permissions) return false;
    return task.permissions.includes(required);
  }, [task, required]);
}