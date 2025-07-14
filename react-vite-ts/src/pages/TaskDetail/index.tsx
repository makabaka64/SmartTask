import {
  ClockCircleOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined
} from '@ant-design/icons'
import { Avatar, Tabs, Dropdown,Spin} from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import type { RootState } from '@/store'
import { useParams, useNavigate } from 'react-router-dom';
import TaskDescribe from './components/TaskDescribe';
import Member from './components/Member';
import SubLink from './components/SubLink';
import { useState,useEffect } from 'react';
import './index.scss'
import WithPermission from '@/components/WithPermission';
import { usePermission } from '@/hooks/usePermission';
import type { TaskDetail as TaskDetailType } from '@/types/task';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux'
import { getTaskDetail } from '@/apis/task';
import { deleteTask } from '@/apis/task';


const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetailType | null>(null);
  const [status, setStatus] = useState<{ icon: React.ReactNode; name: string }>({ icon: <ClockCircleOutlined />, name: '未开始' });
  const [loading, setLoading] = useState<boolean>(true);
 // 权限标识
 const canView = usePermission(task, 'view_task');
 const canEdit = usePermission(task, 'edit_task');
 const canManageMembers = usePermission(task, 'member_manage');
 const canDelete = usePermission(task, 'delete_task');

 const userInfo = useSelector((state: RootState) => state.user.userInfo)

 // 获取任务详情
  useEffect(() => {
    if(!id) {
      alert('任务不存在');
      navigate(-1);
      return;
    }
    const taskId = parseInt(id, 10);
    setLoading(true);
    getTaskDetail(taskId).then(res => {
      setTask(res.data);
      setTask({
        ...res.data,
        created_at:dayjs(res.data.created_at).format('YYYY-MM-DD '),
        created_end: dayjs(res.data.created_end).format('YYYY-MM-DD '),
        index: res.data.item_index,
      })
      setLoading(false);
      
      switch(res.status) {
        case '0':
            setStatus({ icon: <MinusCircleOutlined />, name: '未开始' });
            break;
          case '1':
            setStatus({ icon: <ClockCircleOutlined />, name: '进行中' });
            break;
          case '2':
            setStatus({ icon: <CheckCircleOutlined />, name: '已结束' });
            break;
          default:
            break;
      }
  }).catch(err => {
      setLoading(false);
      alert(err.message);
      navigate
  }).finally(() => setLoading(false));}, [id, navigate]);

  if (loading) return <Spin tip="加载中..." />;
  if (!task || !canView) return <div className="task-container">无权限查看或任务不存在。</div>;
  const handleDelete = async () => {
    if (!canDelete) return;
    try { await deleteTask(task.id!); alert('删除成功'); navigate(-1); }
    catch { alert('删除失败'); }
  };

  // 回退
  const handleClose = () => navigate(-1);

    // 状态菜单
  const statusMenu: MenuProps['items'] = [
    { key: '0', label: '未开始', icon: <MinusCircleOutlined />, onClick: () => canEdit && setStatus({ icon: <MinusCircleOutlined />, name: '未开始' }) },
    { key: '1', label: '进行中', icon: <ClockCircleOutlined />, onClick: () => canEdit && setStatus({ icon: <ClockCircleOutlined />, name: '进行中' }) },
    { key: '2', label: '已结束', icon: <CheckCircleOutlined />, onClick: () => canEdit && setStatus({ icon: <CheckCircleOutlined />, name: '已结束' }) },
  ];
   // Tab 列表
   const tabItems: TabsProps['items'] = [
    { key: '1', label: '描述', children: <TaskDescribe task={task} canEdit={canEdit} /> },
    canManageMembers ? { key: '2', label: '成员', children: <Member taskId={task.id!} canManage={canManageMembers}/> } : null ,
    canEdit ? { key: '3', label: '提交', children: <SubLink taskId={task.id!} canSubmit={canEdit} /> } : null,
  ].filter(Boolean) as TabsProps['items'];
  return (
    <div className="task-container">
      <div className="return" onClick={handleClose}><CloseOutlined /></div>
      <div className="title">
      {task?.name}
      </div>
      <div className="status-area">
        {/* 编辑权限下可切换状态 */}
        <WithPermission task={task} required="edit_task">
          <Dropdown menu={{ items: statusMenu }} placement="bottomLeft">
            <div className="status area-item">
              <div className="logo">{status.icon}</div>
              <div className="content-box">
                <div className="describe">{status.name}</div>
                <div className="classify">当前状态</div>
              </div>
            </div>
          </Dropdown>
        </WithPermission>
        <div className="admin area-item">
          <div className="logo">
            <Avatar icon={<UserOutlined />} src={userInfo?.avater_url}/>
          </div>
          <div className="content-box">
            <div className="describe">{userInfo?.nickname}</div>
            <div className="classify">负责人</div>
          </div>
        </div>
        <div className="start-time area-item">
          <div className="logo">
            <CalendarOutlined />
          </div>
          <div className="content-box">
            <div className="describe">{task?.created_at}</div>
            <div className="classify">开始时间</div>
          </div>
        </div>
        <div className="end-time area-item">
          <div className="logo">
            <CarryOutOutlined />
          </div>
          <div className="content-box">
            <div className="describe">{task?.created_end}</div>
            <div className="classify">结束时间</div>
          </div>
        </div>
      </div>
      <div className="tab">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </div>
    </div>
  )
};


export default TaskDetail;
