import  { useState, useEffect } from "react";
import { CloseOutlined, SendOutlined } from '@ant-design/icons'
import { Pagination } from 'antd';
import type { PaginationProps } from 'antd';
import { inviteMember } from '@/apis/task';

interface Props {
  taskId: number;
  canManage: boolean;
}
const Member = ({ taskId}: Props) => {
  const [ email, setEmail ] = useState('')
  // const [memList, setMemList] = useState([
  //   {id: 1},
  //   {id: 2},
  //   {id: 3},
  //   {id: 4},
  //   {id: 5},
  //   {id: 6},
  //   {id: 7},
  //   {id: 8},
  //   {id: 9},
  //   {id: 10},
  //   {id: 11},
  //   {id: 12},
  //   {id: 13},
  //   {id: 14}])
  const [ memList, setMemList ] = useState(
    Array.from({length: 14 }, (_, i) => ({id: i + 1}))
  )
  const [readList, setReadList] = useState<any[]>([])

  const onChange: PaginationProps['onChange'] = (current, pageSize) => {
    console.log(current, pageSize);
    const list = []
    for(let i = (current-1)*pageSize; i < memList.length && i < current*pageSize; i++) {
      list.push(memList[i])
    }
    
    setReadList(list)
  };

  useEffect(() => {
    onChange(1,5)
  },[memList])
   // 邀请成员
  const handleInvite = async () => {
    if(!email) {
      alert('请输入邮箱')
      return
    }
    try {
      const res = await inviteMember(taskId, email)
     console.log(res);
     
    }catch(err) {
      console.log(err);
    }
  }
  
  return (
    <div className="member-manage">
      <div className="members">
        <div className="addMem">
          <div className="func-add">
            <div className="label">添加成员：</div>
            <div className="email-input">
              <input type="text" name="" id="" />
            </div>
            <div className="send-btn">
              <button>发送邀请 <SendOutlined /></button>
            </div>
          </div>
        </div>
        {readList.map((item: any) => {
          return (
            <div className="member-item" key={item.id}>
              <div className="nickname">{item.id}</div>
              <div className="delete"><CloseOutlined /></div>
            </div>
          )
        })}
      </div>
      <Pagination
        showSizeChanger={false}
        onChange={onChange}
        align="center"
        defaultCurrent={1}
        pageSize={5}
        total={memList.length}
      />
    </div>
  )
}

export default Member