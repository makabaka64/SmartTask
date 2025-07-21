import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TaskDetail } from '@/types/task';

interface Props {
  tasks: TaskDetail[];
}

export const TaskDueBar = ({ tasks }: Props) => {
  const dueMap: Record<string, number> = {};

  tasks.forEach(t => {
    const dateStr = t.created_end.split('T')[0];
    if (!dueMap[dateStr]) dueMap[dateStr] = 0;
    dueMap[dateStr]++;
  });

  const data = Object.entries(dueMap).map(([date, count]) => ({ date, count }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#00bcd4" />
      </BarChart>
    </ResponsiveContainer>
  );
};