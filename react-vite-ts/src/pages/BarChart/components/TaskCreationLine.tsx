import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TaskDetail } from '@/types/task';

interface Props {
  tasks: TaskDetail[];
}

export const TaskCreationLine = ({ tasks }: Props) => {
    // 日期映射，统计每天创建的任务数量
  const dateMap: Record<string, number> = {};

  tasks.forEach(t => {
    const dateStr = t.created_at.split('T')[0];
    // 如果日期不存在，则初始化为0
    if (!dateMap[dateStr]) dateMap[dateStr] = 0;
    dateMap[dateStr]++;
  });

  const data = Object.entries(dateMap).map(([date, count]) => ({ date, count }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
         {/* 网格线 */}
        <CartesianGrid strokeDasharray="3 3" />
        {/* X 轴和 Y 轴 */}
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        {/* 提示框 */}
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};