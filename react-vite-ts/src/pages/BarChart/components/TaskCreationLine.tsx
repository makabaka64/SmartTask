import {
  LineChart,
  Line,
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

export const TaskCreationLine = ({ tasks }: Props) => {
  const dateMap: Record<string, number> = {};

  tasks.forEach((task) => {
    const dateStr = task.created_at.split('T')[0];
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = 0;
    }
    dateMap[dateStr] += 1;
  });

  const data = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
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
        <Line
          type="monotone"
          dataKey="count"
          stroke="#1a73e8"
          strokeWidth={3}
          dot={{ r: 3, fill: '#1a73e8' }}
          activeDot={{ r: 5, fill: '#1a73e8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
