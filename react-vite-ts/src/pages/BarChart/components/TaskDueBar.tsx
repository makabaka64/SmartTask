import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { TaskDetail } from '@/types/task';

interface Props {
  tasks: TaskDetail[];
}

export const TaskDueBar = ({ tasks }: Props) => {
  const dueMap: Record<string, number> = {};

  tasks.forEach((task) => {
    const dateStr = task.created_end.split('T')[0];
    if (!dueMap[dateStr]) {
      dueMap[dateStr] = 0;
    }
    dueMap[dateStr] += 1;
  });

  const data = Object.entries(dueMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.24)" strokeDasharray="4 8" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          allowDecimals={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)'
          }}
        />
        <Bar dataKey="count" fill="#7c9cf5" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
