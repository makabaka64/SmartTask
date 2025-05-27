import './index.scss'
import {
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useState } from 'react';
import classNames from 'classnames';

const Dashboard = () => {
  const [proceed, setProceed] = useState(false)
  return (
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
          <div className="list-item">

          </div>
        </div>
      </div>
    </div>
  )
};

export default Dashboard;
