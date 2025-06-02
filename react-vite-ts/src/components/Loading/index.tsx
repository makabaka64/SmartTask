import React from 'react';
import { Spin } from 'antd';
import './index.scss';

const Loading: React.FC = () => (
  <div className="loading-container">
    <div className="loading-content">
      <Spin size="large" />
    </div>
  </div>
);

export default Loading; 