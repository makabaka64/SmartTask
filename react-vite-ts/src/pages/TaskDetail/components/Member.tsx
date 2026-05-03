import { useState, useEffect } from 'react';
import { Button, Tag, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { SendOutlined, DeleteOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { inviteMember, getTaskMembers, removeMember } from '@/apis/task';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface Props {
  taskId: number;
  canManage: boolean;
}

const text = {
  inviteMember: '\u6dfb\u52a0\u6210\u5458',
  emailPlaceholder: '\u8bf7\u8f93\u5165\u7528\u6237\u90ae\u7bb1',
  sendInvite: '\u53d1\u9001\u9080\u8bf7',
  admin: '\u521b\u5efa\u8005',
  manager: '\u7ba1\u7406\u5458',
  member: '\u6210\u5458',
  emailRequired: '\u8bf7\u8f93\u5165\u90ae\u7bb1\u3002',
  emailInvalid: '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002',
  memberExists: '\u8be5\u6210\u5458\u5df2\u5b58\u5728\u3002',
  inviteSent: '\u5df2\u53d1\u9001\u9080\u8bf7\u3002',
  removeSelf: '\u4e0d\u80fd\u5220\u9664\u81ea\u5df1\u3002',
  removeSuccess: '\u5220\u9664\u6210\u529f\u3002',
  remove: '\u5220\u9664'
};

const Member = ({ taskId, canManage }: Props) => {
  const [email, setEmail] = useState('');
  const [memList, setMemList] = useState<any[]>([]);
  const currentUserId = useSelector((state: RootState) => state.user.userInfo?.id);

  const fetchMembers = async () => {
    try {
      const res = await getTaskMembers(taskId);
      if (res.status === 0) {
        setMemList(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [taskId]);

  const handleInvite = async (role: string) => {
    if (!email) {
      alert(text.emailRequired);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert(text.emailInvalid);
      return;
    }

    const existingMember = memList.find((member) => member.email === email);
    if (existingMember) {
      alert(text.memberExists);
      setEmail('');
      return;
    }

    try {
      await inviteMember(taskId, email, role);
      alert(text.inviteSent);
      setEmail('');
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (userId: number) => {
    if (userId === currentUserId) {
      return alert(text.removeSelf);
    }
    try {
      await removeMember(taskId, userId);
      alert(text.removeSuccess);
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const statusMenu: MenuProps['items'] = [
    {
      key: '0',
      label: text.manager,
      onClick: () => handleInvite('Participant')
    },
    {
      key: '1',
      label: text.member,
      onClick: () => handleInvite('user')
    }
  ];

  return (
    <div className="member-manage">
      <div className="member-invite">
        <div className="invite-title">
          <UserAddOutlined />
          <span>{text.inviteMember}</span>
        </div>

        <div className="invite-form">
          <input
            type="email"
            placeholder={text.emailPlaceholder}
            value={email}
            disabled={!canManage}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Dropdown menu={{ items: statusMenu }} disabled={!canManage} placement="bottomLeft">
            <button className="invite-btn" disabled={!canManage}>
              {text.sendInvite}
              <SendOutlined />
            </button>
          </Dropdown>
        </div>
      </div>

      <div className="members">
        {memList.map((item: any) => {
          const isCreator = item.role === 'admin';
          const isPart = item.role === 'Participant';
          const isUser = item.role === 'user';
          const canDelete = canManage && item.id !== currentUserId && !isCreator;

          let roleLabel = '';
          let tagColor: 'red' | 'orange' | 'blue' = 'blue';

          if (isCreator) {
            roleLabel = text.admin;
            tagColor = 'red';
          } else if (isPart) {
            roleLabel = text.manager;
            tagColor = 'orange';
          } else if (isUser) {
            roleLabel = text.member;
          }

          return (
            <div className="member-item" key={item.id}>
              <div className="member-main">
                {item.avater_url ? (
                  <Avatar src={item.avater_url} />
                ) : (
                  <Avatar icon={<UserOutlined />} />
                )}
                <div className="member-copy">
                  <div className="nickname">
                    {item.nickname}
                    <Tag color={tagColor}>{roleLabel}</Tag>
                  </div>
                  <div className="email">{item.email}</div>
                </div>
              </div>

              <div className="member-action">
                <Button
                  danger
                  disabled={!canDelete}
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => handleRemove(item.id)}
                >
                  {text.remove}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Member;
