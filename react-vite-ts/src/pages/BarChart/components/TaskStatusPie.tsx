import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { TaskDetail } from '@/types/task';
const COLORS = ['#82ca9d', '#f87171'];

interface Props {
  tasks: TaskDetail[];
}

export const TaskStatusPie = ({ tasks }: Props) => {
  const completed = tasks.filter(t => t.status === 1).length;
  const pending = tasks.filter(t => t.status === 0).length;

  const data = [
    { name: '已完成', value: completed },
    { name: '未完成', value: pending }
  ];

  return (
    <PieChart width={400} height={280}>
      <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
        {/* // 使用 Cell 来设置每个扇区的颜色 */}
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
};