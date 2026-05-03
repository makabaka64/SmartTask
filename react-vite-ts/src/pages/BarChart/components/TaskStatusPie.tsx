import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TaskDetail } from '@/types/task';

const COLORS = ['#1a73e8', '#ff8a65'];

interface Props {
  tasks: TaskDetail[];
}

export const TaskStatusPie = ({ tasks }: Props) => {
  const completed = tasks.filter((task) => task.status === 1).length;
  const pending = tasks.filter((task) => task.status === 0).length;

  const data = [
    { name: '\u5df2\u5b8c\u6210', value: completed },
    { name: '\u672a\u5b8c\u6210', value: pending }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={92}
          paddingAngle={3}
          labelLine={false}
          label={({ percent = 0 }) => `${Math.round(percent * 100)}%`}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[data.indexOf(entry) % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)'
          }}
        />
        <Legend verticalAlign="bottom" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};
