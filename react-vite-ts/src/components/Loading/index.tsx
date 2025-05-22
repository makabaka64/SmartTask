import React from 'react';
import { Spin } from 'antd';
import './index.scss';

const Loading: React.FC = () => (
  <div className="loading-container">
    <div className="loading-content">
      <Spin size="large" tip="加载中..." />
    </div>
  </div>
);

export default Loading; 