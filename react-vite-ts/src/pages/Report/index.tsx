import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, acceptInvitation } from '@/apis/task';
import { Tabs, Empty, Avatar, Button } from 'antd';
import { UserOutlined, BellOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Notification } from '@/types/notification';
import type { RootState, AppDispatch } from '@/store/index';
import './index.scss';
import { setNotificationList } from '@/store/modules/notification';

const text = {
  badge: '\u6d88\u606f\u4e2d\u5fc3',
  title: '\u628a\u63d0\u9192\u3001\u9080\u8bf7\u548c\u56de\u5e94\u6536\u62e2\u5230\u4e00\u4e2a\u6e05\u6670\u89c6\u56fe',
  description:
    '\u5728\u8fd9\u91cc\u5feb\u901f\u67e5\u770b\u7cfb\u7edf\u63d0\u9192\u548c\u534f\u4f5c\u9080\u8bf7\uff0c\u5e76\u76f4\u63a5\u5b8c\u6210\u63a5\u53d7\u6216\u8ddf\u8fdb\u5904\u7406\u3002',
  all: '\u5168\u90e8\u6d88\u606f',
  reminders: '\u7cfb\u7edf\u901a\u77e5',
  invites: '\u534f\u4f5c\u9080\u8bf7',
  pending: '\u5f85\u5904\u7406',
  noReminders: '\u6682\u65e0\u7cfb\u7edf\u901a\u77e5',
  noInvites: '\u6682\u65e0\u534f\u4f5c\u9080\u8bf7',
  systemNotice: '\u7cfb\u7edf\u901a\u77e5',
  privateMessage: '\u534f\u4f5c\u9080\u8bf7',
  acceptInvite: '\u63a5\u53d7\u9080\u8bf7',
  joined: '\u5df2\u52a0\u5165',
  acceptFailed: '\u63a5\u53d7\u9080\u8bf7\u5931\u8d25',
  acceptRetry: '\u63a5\u53d7\u9080\u8bf7\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
};

const Report = () => {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector((state: RootState) => state.notification.list);
  const avatarUrl = useSelector((state: RootState) => state.user.userInfo?.avater_url);

  const reminders = useMemo(
    () => notifications.filter((notification: Notification) => notification.type === 'reminder'),
    [notifications]
  );
  const invites = useMemo(
    () => notifications.filter((notification: Notification) => notification.type === 'invite'),
    [notifications]
  );
  const pendingInvites = useMemo(
    () => invites.filter((notification) => notification.status === 'pending'),
    [invites]
  );

  useEffect(() => {
    const getList = async () => {
      const res = await fetchNotifications();
      if (res.status === 0) {
        dispatch(setNotificationList(res.data));
      }
    };

    getList();
    const interval = setInterval(getList, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleAccept = async (notification: Notification) => {
    try {
      const res = await acceptInvitation(notification.id);
      if (res.status === 0) {
        const listRes = await fetchNotifications();
        if (listRes.status === 0) {
          dispatch(setNotificationList(listRes.data));
        }
      } else {
        alert((res as any).data?.message || text.acceptFailed);
      }
    } catch (error) {
      console.error(error);
      alert(text.acceptRetry);
    }
  };

  const stats = [
    { label: text.all, value: notifications.length },
    { label: text.reminders, value: reminders.length },
    { label: text.invites, value: invites.length },
    { label: text.pending, value: pendingInvites.length }
  ];

  const renderEmpty = (description: string) => (
    <Empty className="empty" description={description} />
  );

  const renderReminderList = () => {
    if (reminders.length === 0) {
      return renderEmpty(text.noReminders);
    }

    return (
      <div className="card-list-container">
        {reminders.map((notification, index) => (
          <article className="message-card" key={notification.id} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="message-main">
              <Avatar icon={<BellOutlined />} className="message-avatar notice-avatar" />
              <div className="message-copy">
                <div className="message-tag">{text.systemNotice}</div>
                <div className="message-text">{notification.message}</div>
                <div className="message-time">
                  <ClockCircleOutlined />
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  const renderInviteList = () => {
    if (invites.length === 0) {
      return renderEmpty(text.noInvites);
    }

    return (
      <div className="card-list-container">
        {invites.map((notification, index) => (
          <article className="message-card" key={notification.id} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="message-main">
              <Avatar src={avatarUrl} icon={<UserOutlined />} className="message-avatar" />
              <div className="message-copy">
                <div className="message-tag">{text.privateMessage}</div>
                <div className="message-text">{notification.message}</div>
                <div className="message-time">
                  <ClockCircleOutlined />
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="message-actions">
              {notification.status === 'pending' && (
                <Button type="primary" onClick={() => handleAccept(notification)}>
                  {text.acceptInvite}
                </Button>
              )}
              {notification.status === 'accepted' && <Button disabled>{text.joined}</Button>}
            </div>
          </article>
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <BellOutlined />
          {` ${text.reminders}`}
        </span>
      ),
      children: renderReminderList()
    },
    {
      key: '2',
      label: (
        <span>
          <UserOutlined />
          {` ${text.invites}`}
        </span>
      ),
      children: renderInviteList()
    }
  ];

  return (
    <div className="report-page">
      <section className="report-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.badge}</span>
          <h2 className="hero-title">{text.title}</h2>
          <p className="hero-description">{text.description}</p>
        </div>
      </section>

      <section className="report-stats">
        {stats.map((item, index) => (
          <div className="stat-card" key={item.label} style={{ animationDelay: `${index * 80}ms` }}>
            <span className="stat-label">{item.label}</span>
            <strong className="stat-value">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="report-panel">
        <Tabs defaultActiveKey="1" className="report-tabs" items={tabItems} />
      </section>
    </div>
  );
};

export default Report;
