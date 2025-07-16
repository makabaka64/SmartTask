import  { useState,useEffect } from "react";
import { Button,Tag } from 'antd';
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
  const handleInvite = async () => {
    if(!email) {
      alert('请输入邮箱')
      return
    }
    try {
      await inviteMember(taskId, email)
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
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="send-btn">
              <button disabled={!canManage} onClick={handleInvite}>发送邀请 <SendOutlined /></button>
            </div>
          </div>
        </div>
        {memList.map((item: any) => {
          const isCreator = item.role === 'admin';
          const canDelete = canManage && item.id !== currentUserId && !isCreator;

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
                <Tag color={isCreator ? 'red' : 'blue'} style={{ marginLeft: 8 }}>
            {isCreator ? '创建者' : '成员'}
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