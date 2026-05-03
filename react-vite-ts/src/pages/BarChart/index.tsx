import { TaskStatusPie } from './components/TaskStatusPie';
import { TaskCreationLine } from './components/TaskCreationLine';
import { TaskDueBar } from './components/TaskDueBar';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { TaskDetail } from '@/types/task';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Empty } from 'antd';
import dayjs from 'dayjs';
import './index.scss';

const text = {
  badge: '\u5b9e\u65f6\u770b\u677f',
  title: '\u7528\u66f4\u7acb\u4f53\u7684\u65b9\u5f0f\u8bfb\u53d6\u4efb\u52a1\u8282\u594f',
  description:
    '\u628a\u5b8c\u6210\u72b6\u6001\u3001\u521b\u5efa\u8d8b\u52bf\u548c\u5230\u671f\u5206\u5e03\u653e\u5728\u540c\u4e00\u5f20\u770b\u677f\u91cc\uff0c\u65b9\u4fbf\u5feb\u901f\u627e\u5230\u5806\u79ef\u3001\u6ce2\u5cf0\u548c\u5373\u5c06\u5230\u671f\u7684\u4efb\u52a1\u3002',
  allTasks: '\u5168\u90e8\u4efb\u52a1',
  completed: '\u5df2\u5b8c\u6210',
  pending: '\u672a\u5b8c\u6210',
  thisWeek: '\u672c\u5468\u5230\u671f',
  noData: '\u6682\u65e0\u4efb\u52a1\u6570\u636e',
  loading: '\u56fe\u8868\u52a0\u8f7d\u4e2d...',
  completeRate: '\u4efb\u52a1\u5b8c\u6210\u5360\u6bd4',
  creationTrend: '\u6bcf\u65e5\u4efb\u52a1\u521b\u5efa\u8d8b\u52bf',
  dueTrend: '\u6bcf\u65e5\u5230\u671f\u4efb\u52a1\u6570',
  completeRateDesc: '\u5feb\u901f\u5bf9\u6bd4\u5df2\u5b8c\u6210\u4e0e\u672a\u5b8c\u6210\u7684\u603b\u4f53\u5206\u5e03\u3002',
  creationTrendDesc: '\u89c2\u5bdf\u4efb\u52a1\u521b\u5efa\u6ce2\u5cf0\uff0c\u5224\u65ad\u4efb\u52a1\u5165\u6d41\u8282\u594f\u3002',
  dueTrendDesc: '\u8bc6\u522b\u8fd1\u671f\u5230\u671f\u96c6\u4e2d\u533a\u95f4\uff0c\u63d0\u524d\u5206\u914d\u8d44\u6e90\u3002'
};

const BarChart = () => {
  const taskInfo = useSelector((state: RootState) => state.task.tasklist) as TaskDetail[];
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isEmpty = taskInfo.length === 0;

  const stats = useMemo(() => {
    const completed = taskInfo.filter((task) => task.status === 1).length;
    const pending = taskInfo.filter((task) => task.status === 0).length;
    const thisWeekDue = taskInfo.filter((task) => {
      const dueDate = dayjs(task.created_end);
      return dueDate.isValid() && dueDate.isBefore(dayjs().endOf('week')) && dueDate.isAfter(dayjs().startOf('day'));
    }).length;

    return [
      { label: text.allTasks, value: taskInfo.length },
      { label: text.completed, value: completed },
      { label: text.pending, value: pending },
      { label: text.thisWeek, value: thisWeekDue }
    ];
  }, [taskInfo]);

  const chartCards = [
    {
      key: 'pie',
      title: text.completeRate,
      description: text.completeRateDesc,
      content: <TaskStatusPie tasks={taskInfo} />
    },
    {
      key: 'line',
      title: text.creationTrend,
      description: text.creationTrendDesc,
      content: <TaskCreationLine tasks={taskInfo} />
    },
    {
      key: 'bar',
      title: text.dueTrend,
      description: text.dueTrendDesc,
      content: <TaskDueBar tasks={taskInfo} />
    }
  ];

  const renderChartContent = (content: ReactNode) => {
    if (isEmpty) {
      return <Empty description={text.noData} style={{ margin: '4rem 0' }} />;
    }
    if (!hasMounted) {
      return <div className="loading">{text.loading}</div>;
    }
    return content;
  };

  return (
    <div className="analytics-page">
      <section className="analytics-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.badge}</span>
          <h2 className="hero-title">{text.title}</h2>
          <p className="hero-description">{text.description}</p>
        </div>
      </section>

      <section className="analytics-stats">
        {stats.map((item, index) => (
          <div className="stat-card" key={item.label} style={{ animationDelay: `${index * 80}ms` }}>
            <span className="stat-label">{item.label}</span>
            <strong className="stat-value">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="chart-grid">
        {chartCards.map((card, index) => (
          <article
            className={`chart-card chart-card-${card.key}`}
            key={card.key}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="chart-card-header">
              <h3 className="chart-title">{card.title}</h3>
              <p className="chart-subtitle">{card.description}</p>
            </div>
            <div className="chart-body">{renderChartContent(card.content)}</div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default BarChart;
