import{ useEffect } from 'react';
import { useDispatch,useSelector } from 'react-redux';
import { fetchNotifications,acceptInvitation } from '@/apis/task';
import { Card, Tabs, Empty, Avatar ,Button} from 'antd';
import { UserOutlined, BellOutlined } from '@ant-design/icons';
import type { Notification } from '@/types/notification';
import type { RootState } from '@/store/index';
import './index.scss';
import { setNotificationList } from '@/store/modules/notification';

const Report = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notification.list);
  const avater_url = useSelector((state: RootState) => state.user.userInfo?.avater_url);
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
  const handleAccept = async(notification: Notification) => {
    try{
      const res = await acceptInvitation(notification.id);
      if (res.status === 0) {
        const listRes = await fetchNotifications();
        if (listRes.status === 0) {
          dispatch(setNotificationList(listRes.data));
        }
      } else {
        alert(res.data.message || '接受邀请失败');
      }
    } catch (error) {
      alert('接受邀请失败，请稍后重试');
    }
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
          <Empty className='empty' description="暂无系统通知" />
        ) : (
           <div className="card-list-container">
          {
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
          ))}
          </div>
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
          <Empty className='empty' description="暂无私信" />
        ) : (
          <div className="card-list-container">
          {invites.map((notification) => (
            <Card key={notification.id} className="report-card">
         <div className='card-content'>
             <div className='left-section'>
              <div className="avatar-section">
                <Avatar src={avater_url} />
                <div className="message-content">
                  <div className="message-text">{notification.message}</div>
                  <div className="message-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              </div>

              <div className="right-section">
              {notification.status === 'pending' && (
                <Button type="primary" size="small" onClick={() => handleAccept(notification)}>接受邀请</Button>
              )}
              {notification.status === 'accepted' && (
                <Button size="small" disabled>已加入</Button>
              )}
              </div>
              </div>
            </Card>
          ))}
          </div>
        )
      ),
    },
  ];

  return (
    <div className="report-container">
      <Tabs defaultActiveKey="1" className="report-tabs"  items={tabItems} />
    </div>
  );
};

export default Report;