import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { TaskDetail } from '@/types/task';

interface Props {
  task: TaskDetail | null;
  required: string;
  children: ReactNode;
}

export default function WithPermission({ task, required, children }: Props) {
  const hasPermission = usePermission(task, required);

  if (!hasPermission) return null;
  return <>{children}</>;
}
