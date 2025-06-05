import React, { useState, useEffect } from "react";
import { CloseOutlined, SendOutlined } from '@ant-design/icons'
import { Pagination } from 'antd';
import type { PaginationProps } from 'antd';


const Member: React.FC = () => {
  const [memList, setMemList] = useState([
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4},
    {id: 5},
    {id: 6},
    {id: 7},
    {id: 8},
    {id: 9},
    {id: 10},
    {id: 11},
    {id: 12},
    {id: 13},
    {id: 14},
  ])
  const [readList, setReadList] = useState<any>([])

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
  },[])
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