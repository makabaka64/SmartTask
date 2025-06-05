import {
  ClockCircleOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined
} from '@ant-design/icons'
import { Avatar, Tabs, Dropdown } from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import TaskDescribe from './components/TaskDescribe';
import Member from './components/Member';
import SubLink from './components/SubLink';
import { useState } from 'react';
import './index.scss'

const tab_items: TabsProps['items'] = [
  {
    key: '1',
    label: '任务描述',
    children: <TaskDescribe />,
  },
  {
    key: '2',
    label: '成员管理',
    children: <Member />,
  },
  {
    key: '3',
    label: '提交连接',
    children: <SubLink />,
  },
]



const TaskDetail = () => {
  const [status, setStatus] = useState<any>({icon: <ClockCircleOutlined />, name: "未开始"})

  const items: MenuProps['items'] = [
  {
    key: '1',
    label: "未开始",
    icon: (<MinusCircleOutlined />),
    onClick: () => {
      setStatus({icon: <MinusCircleOutlined />, name: "未开始"})
    }
  },
  {
    key: '2',
    label: '进行中',
    icon: (<ClockCircleOutlined />),
    onClick: () => {
      setStatus({icon: <ClockCircleOutlined />, name: "进行中"})
    }
  },
  {
    key: '3',
    label: '已结束',
    icon: (<CheckCircleOutlined />),
    onClick: () => {
      setStatus({icon: <CheckCircleOutlined />, name: "已结束"})
    }
  },
];
  return (
    <div className="task-container">
      <div className="return"><CloseOutlined /></div>
      <div className="title">
        项目名称
      </div>
      <div className="status-area">
        {/* <div className="status area-item">
          <div className="logo">
            <ClockCircleOutlined />
          </div>
          <div className="content-box">
            <div className="describe">未开始</div>
            <div className="classify">当前状态</div>
          </div>
        </div> */}

        <Dropdown menu={{items}} placement="bottomLeft">
          <div className="status area-item">
            <div className="logo">
              {/* <ClockCircleOutlined /> */}
              {status.icon}
            </div>
            <div className="content-box">
              <div className="describe">{status.name}</div>
              <div className="classify">当前状态</div>
            </div>
          </div>
        </Dropdown>
        <div className="admin area-item">
          <div className="logo">
            <Avatar icon={<UserOutlined />} src={undefined}/>
          </div>
          <div className="content-box">
            <div className="describe">无</div>
            <div className="classify">负责人</div>
          </div>
        </div>
        <div className="start-time area-item">
          <div className="logo">
            <CalendarOutlined />
          </div>
          <div className="content-box">
            <div className="describe">2025-1-1</div>
            <div className="classify">开始时间</div>
          </div>
        </div>
        <div className="end-time area-item">
          <div className="logo">
            <CarryOutOutlined />
          </div>
          <div className="content-box">
            <div className="describe">2025-1-3</div>
            <div className="classify">结束时间</div>
          </div>
        </div>
      </div>
      <div className="tab">
        <Tabs defaultActiveKey="1" items={tab_items} />
      </div>
    </div>
  )
};

export default TaskDetail;
