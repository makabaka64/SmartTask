import{ useEffect } from 'react';
import { useDispatch,useSelector } from 'react-redux';
import { fetchNotifications } from '@/apis/task';
import { Card, Tabs, Empty, Avatar ,Button} from 'antd';
import { UserOutlined, BellOutlined } from '@ant-design/icons';
import type { Notification } from '@/types/notification';
import type { RootState } from '@/store/index';
import './index.scss';
import { setNotificationList } from '@/store/modules/notification';

const Report = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notification.list);
  const reminders = notifications.filter(
    (notification: Notification) => notification.type === 'reminder'
  );
  const invites = notifications.filter(
    (notification: Notification) => notification.type === 'invite'
  );
  //轮询通知列表
  useEffect(() => {
    const getList = async () => {
      const res = await fetchNotifications();
      if (res.status === 0) {
        // 更新通知列表
        dispatch(setNotificationList(res.data));
      }
    };
    getList();
    const interval = setInterval(getList, 30000); // 每30秒轮询一次
    return () => clearInterval(interval); // 清除定时器
  }, [dispatch]);

  // 接受邀请
  const handleAccept = async(noti:Notification) => {
    // const res = await fetchNotifications();
    // if (res.status === 0) {
    //   // 更新通知列表
    //   dispatch(setNotificationList(res.data));
    // }
  }
  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <BellOutlined />
          {' 系统通知'}
        </span>
      ),
      children: (
        reminders.length === 0 ? (
          <Empty description="暂无系统通知" />
        ) : (
          reminders.map((notification) => (
            <Card key={notification.id} className="report-card">
              <div className="avatar-section">
                <Avatar icon={<BellOutlined />} />
                <div className="message-content">
                  <div className="message-text">{notification.message}</div>
                  <div className="message-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <UserOutlined />
          {' 私信'}
        </span>
      ),
      children: (
        invites.length === 0 ? (
          <Empty description="暂无私信" />
        ) : (
          invites.map((notification) => (
            <Card key={notification.id} className="report-card">
              <div className="avatar-section">
                <Avatar icon={<UserOutlined />} />
                <div className="message-content">
                  <div className="message-text">{notification.message}</div>
                  <div className="message-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {notification.status === 'unread' && (
                <Button type="primary" size="small" onClick={() => handleAccept(notification)}>接受邀请</Button>
              )}
              {notification.status === 'accepted' && (
                <Button size="small" disabled>已加入</Button>
              )}
            </Card>
          ))
        )
      ),
    },
  ];

  return (
    <div className="report-container">
      <Tabs defaultActiveKey="1" className="report-tabs" items={tabItems} />
    </div>
  );
};

export default Report;