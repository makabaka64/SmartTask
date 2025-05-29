import './index.scss'
import {
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useState } from 'react';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Drop from './component/Drop';


function cloneDeep(value: any, hash = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (hash.has(value)) {
    return hash.get(value)
  }
  const result:any = Array.isArray(value) ? [] : {}
  hash.set(value, result)
  for(const key in value) {
    if(value.hasOwnProperty(key)) {
      result[key] = cloneDeep(value[key], hash)
    }
  }
  return result
}

const Dashboard = () => {
  const [proceed, setProceed] = useState(false)
  const [targetIndex, setTargetIndex] = useState<any>(-1)
  const [proList, setProList] = useState([
    {id: 0, title: "1"},
    {id: 1, title: "2"},
    {id: 2, title: "3"},
    {id: 3, title: "4"},
    {id: 4, title: "5"},
    {id: 5, title: "6"},
  ])

  const onChangeIndex = (i: number) => {
    setTargetIndex(i)
  }
  const moveItem = (i: any) => {
    const current = proList[i];
    const target = proList[targetIndex]
    proList[i] = { ...target };
    proList[targetIndex] = { ...current };
    setTargetIndex([...proList])
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <div className="nav">
          <div className="search">
            <input type="text" />
            <div className="search-show"></div>
          </div>
          <div className="add">
            <button><PlusOutlined /> 新建</button>
          </div>
        </div>
        <div className="proceed">
          <div className="title" onClick={() => setProceed(!proceed)}>进行中 <DownOutlined rotate={proceed ? 180 : 0} /></div>
          <div className={classNames(["list", {"hidden": proceed}])}>
            <Drop proList={proList} targetIndex={targetIndex} onChangeIndex={onChangeIndex} moveItem={moveItem} />

          </div>
        </div>
      </div>
    </DndProvider>
  )
};

export default Dashboard;
