import {
  ClockCircleOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Avatar, Tabs, Dropdown, Spin, Button } from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import type { RootState } from '@/store';
import { useParams, useNavigate } from 'react-router-dom';
import TaskDescribe from './components/TaskDescribe';
import Member from './components/Member';
import SubLink from './components/SubLink';
import { useState, useEffect } from 'react';
import './index.scss';
import WithPermission from '@/components/WithPermission';
import { usePermission } from '@/hooks/usePermission';
import type { TaskDetail as TaskDetailType } from '@/types/task';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { getTaskDetail, editTask } from '@/apis/task';

const text = {
  back: '\u8fd4\u56de',
  notFound: '\u65e0\u6743\u9650\u67e5\u770b\u6216\u4efb\u52a1\u4e0d\u5b58\u5728\u3002',
  loading: '\u52a0\u8f7d\u4e2d...',
  invalidTask: '\u4efb\u52a1\u4e0d\u5b58\u5728\u3002',
  updateSuccess: '\u4efb\u52a1\u72b6\u6001\u66f4\u65b0\u6210\u529f\u3002',
  updateFailed: '\u66f4\u65b0\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002',
  pending: '\u672a\u5b8c\u6210',
  done: '\u5df2\u5b8c\u6210',
  currentStatus: '\u5f53\u524d\u72b6\u6001',
  owner: '\u8d1f\u8d23\u4eba',
  startTime: '\u5f00\u59cb\u65f6\u95f4',
  endTime: '\u7ed3\u675f\u65f6\u95f4',
  overview: '\u4efb\u52a1\u8be6\u60c5',
  heroDescription:
    '\u5728\u8fd9\u91cc\u67e5\u770b\u4efb\u52a1\u63cf\u8ff0\u3001\u6210\u5458\u548c\u64cd\u4f5c\u9879\uff0c\u5e76\u76f4\u63a5\u5b8c\u6210\u72b6\u6001\u7ef4\u62a4\u3002',
  describeTab: '\u63cf\u8ff0',
  memberTab: '\u6210\u5458',
  deleteTab: '\u5220\u9664'
};

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetailType | null>(null);
  const [status, setStatus] = useState<{ icon: React.ReactNode; name: string }>({
    icon: <ClockCircleOutlined />,
    name: text.pending
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isStatusUpdating, setIsStatusUpdating] = useState<boolean>(false);
  const canView = usePermission(task, 'view_task');
  const canEdit = usePermission(task, 'edit_task');
  const canManageMembers = usePermission(task, 'member_manage');
  const canDelete = usePermission(task, 'delete_task');
  const userInfo = useSelector((state: RootState) => state.user.userInfo);

  useEffect(() => {
    if (!id) {
      alert(text.invalidTask);
      navigate(-1);
      return;
    }
    const taskId = parseInt(id, 10);
    setLoading(true);
    getTaskDetail(taskId)
      .then((res) => {
        setTask({
          ...res.data,
          created_at: dayjs(res.data.created_at).format('YYYY-MM-DD'),
          created_end: dayjs(res.data.created_end).format('YYYY-MM-DD'),
          index: res.data.item_index
        });

        switch (res.data.status) {
          case 0:
            setStatus({ icon: <ClockCircleOutlined />, name: text.pending });
            break;
          case 1:
            setStatus({ icon: <CheckCircleOutlined />, name: text.done });
            break;
          default:
            break;
        }
      })
      .catch((err) => {
        alert(err.message);
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStatusChange = async (newStatus: number) => {
    if (!task || !canEdit || isStatusUpdating) {
      return;
    }

    setIsStatusUpdating(true);
    const statusInfo =
      newStatus === 0
        ? { icon: <ClockCircleOutlined />, name: text.pending }
        : { icon: <CheckCircleOutlined />, name: text.done };

    try {
      await editTask(task.id!, {
        status: newStatus,
        description: task.description,
        created_at: task.created_at,
        created_end: task.created_end
      });

      setStatus(statusInfo);
      setTask({ ...task, status: newStatus });
      alert(text.updateSuccess);
    } catch (error) {
      console.error(error);
      alert(text.updateFailed);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="task-loading">
        <Spin tip={text.loading} />
      </div>
    );
  }

  if (!task || !canView) {
    return <div className="task-page">{text.notFound}</div>;
  }

  const statusMenu: MenuProps['items'] = [
    {
      key: '0',
      label: text.pending,
      icon: <ClockCircleOutlined />,
      onClick: () => handleStatusChange(0)
    },
    {
      key: '1',
      label: text.done,
      icon: <CheckCircleOutlined />,
      onClick: () => handleStatusChange(1)
    }
  ];

  const detailCards = [
    {
      key: 'status',
      label: text.currentStatus,
      value: status.name,
      icon: isStatusUpdating ? <Spin size="small" /> : status.icon,
      dropdown: true
    },
    {
      key: 'owner',
      label: text.owner,
      value: userInfo?.nickname,
      icon: <Avatar icon={<UserOutlined />} src={userInfo?.avater_url} />
    },
    {
      key: 'start',
      label: text.startTime,
      value: task.created_at,
      icon: <CalendarOutlined />
    },
    {
      key: 'end',
      label: text.endTime,
      value: task.created_end,
      icon: <CarryOutOutlined />
    }
  ];

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: text.describeTab,
      children: <TaskDescribe task={task} canEdit={canEdit} />
    },
    {
      key: '2',
      label: text.memberTab,
      children: <Member taskId={task.id!} canManage={canManageMembers} />
    },
    canDelete
      ? {
          key: '3',
          label: text.deleteTab,
          children: <SubLink taskId={task.id!} canDelete={canDelete} />
        }
      : null
  ].filter(Boolean) as TabsProps['items'];

  return (
    <div className="task-page">
      <section className="task-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.overview}</span>
          <h1 className="task-title">{task.name}</h1>
          <p className="hero-description">{text.heroDescription}</p>
        </div>

        <Button className="back-button" onClick={() => navigate(-1)}>
          <CloseOutlined />
          <span>{text.back}</span>
        </Button>
      </section>

      <section className="task-meta-grid">
        {detailCards.map((item, index) => {
          const content = (
            <div className="meta-card" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="meta-icon">{item.icon}</div>
              <div className="meta-copy">
                <div className="meta-value">{item.value}</div>
                <div className="meta-label">{item.label}</div>
              </div>
            </div>
          );

          if (item.dropdown) {
            return (
              <WithPermission task={task} required="delete_task" key={item.key}>
                <Dropdown menu={{ items: statusMenu }} placement="bottomLeft">
                  <div>{content}</div>
                </Dropdown>
              </WithPermission>
            );
          }

          return <div key={item.key}>{content}</div>;
        })}
      </section>

      <section className="task-panel">
        <Tabs defaultActiveKey="1" className="task-tabs" items={tabItems} />
      </section>
    </div>
  );
};

export default TaskDetail;
