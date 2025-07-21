import  { useState,useEffect } from "react";
import { Button,Tag ,Dropdown} from 'antd';
import type { MenuProps } from 'antd'
import {  SendOutlined ,DeleteOutlined} from '@ant-design/icons'
import { inviteMember, getTaskMembers, removeMember} from '@/apis/task';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface Props {
  taskId: number;
  canManage: boolean;
}
const Member = ({ taskId, canManage}: Props) => {
  
  const [ email, setEmail ] = useState('')
  const [memList, setMemList] = useState<any[]>([]);
  const currentUserId = useSelector((state: RootState) => state.user.userInfo?.id);
  // const [role, setRole] = useState<'Participant' | 'user'>('user'); 
  // 邀请菜单
  const statusMenu: MenuProps['items'] = [
    { 
      key: '0', 
      label: '管理员', 
      onClick: () => handleInvite('Participant')
    },
    { 
      key: '1', 
      label: '成员', 
      onClick: () => handleInvite('user')
    },
  ];  
  // 拉取成员列表
    const fetchMembers = async () => {
      try {
        const res = await getTaskMembers(taskId);
        if (res.status === 0) {
          setMemList(res.data);
        }
        
      } catch (err) {
        console.error('获取成员失败', err);
      }
    };
  
    // 初次加载
    useEffect(() => {
      fetchMembers();
    }, [taskId]);
   // 邀请成员
  const handleInvite = async (role:string) => {
    if(!email) {
      alert('请输入邮箱')
      return
    }
    // 简单的邮箱格式验证
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert('请输入有效的邮箱地址');
      return;
    }
   // 检查是否已存在
    const existingMember = memList.find(member => member.email === email);
    if (existingMember) {
      alert('该成员已存在');
      setEmail('');
      return;
    }
   
    try {

      await inviteMember(taskId, email, role)
      alert('已发送邀请')
      setEmail(''); 
      fetchMembers(); // 刷新成员列表
     
    }catch(err) {
      console.log(err);
    }
  }

  // 删除成员
  const handleRemove = async (userId: number) => {
    if (userId === currentUserId) return alert('不能删除自己');
    try {
      await removeMember(taskId, userId);
      alert('删除成功');
      fetchMembers();
    } catch (err) {
      console.error('删除失败', err);
    }
  };
 

  return (
    <div className="member-manage">
      <div className="members">
        <div className="addMem">
          <div className="func-add">
            <div className="label">添加成员：</div>
            <div className="email-input">
            <input
                type="email"
                placeholder="请输入用户邮箱"
                value={email}
                disabled={!canManage}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
         <Dropdown menu={{ items: statusMenu }} disabled={!canManage}  placement="bottomLeft">
            <div className="send-btn">
              <button className="invite-btn" disabled >发送邀请 <SendOutlined /></button>
            </div>
             </Dropdown>
          </div>
        </div>
        {memList.map((item: any) => {
          const isCreator = item.role === 'admin';
          const isPart = item.role === 'Participant';
          const isUser = item.role === 'user';
          const canDelete = canManage && item.id !== currentUserId && !isCreator;

          let roleLabel = '';
          let tagColor : 'red' | 'orange' | 'blue' = 'blue';

          if (isCreator) {
            roleLabel = '创建者';
            tagColor = 'red';
          } else if (isPart) {
            roleLabel = '管理员';
            tagColor = 'orange';
          } else if (isUser) {
            roleLabel = '成员';
          }

          return (
            <div className="member-item" key={item.id}>
              <div className="avatar">
                <img
                  src={item.avater_url}
                  alt={item.nickname}
                  style={{ width: 30, height: 30, borderRadius: '50%' }}
                />
              </div>
              <div className="nickname">
                {item.nickname} 
                <Tag color={tagColor} style={{ marginLeft: 8 }}>
            {roleLabel}
          </Tag>
              </div>
              <div className="email">{item.email}</div>
              
                <div className="add-link">
                  <Button danger disabled={!canDelete} icon={<DeleteOutlined />} size="small" onClick={() => handleRemove(item.id)}>
                    删除
                  </Button>
                </div>
              
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Member