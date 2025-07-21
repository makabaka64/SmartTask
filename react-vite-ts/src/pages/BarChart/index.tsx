import { TaskStatusPie } from "./components/TaskStatusPie";
import { TaskCreationLine } from "./components/TaskCreationLine";
import { TaskDueBar } from "./components/TaskDueBar";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import type { TaskDetail } from '@/types/task';
import { useEffect, useState } from "react";
import { Empty } from "antd";

import './index.scss';


const BarChart = () => {
  const taskInfo = useSelector((state: RootState) => state.task.tasklist) as TaskDetail[];
  const [hasMounted, setHasMounted] = useState(false);
  // 确保组件已挂载，避免服务端渲染时的警告
  useEffect(() => {
    setHasMounted(true);
  })
 
  const isEmpty = taskInfo.length === 0;
  return (
    <div className="chart-container">

      <div className="chart-card">
        <h2 className="chart-title">任务完成占比</h2>
        {isEmpty ? (<Empty description="暂无任务数据" style={{margin:'5rem 0'}}/>) : hasMounted?(<TaskStatusPie tasks={taskInfo}/>):(<div className="loading">图表加载中...</div>) }
      </div>

      <div className="chart-card">
        <h2 className="chart-title">每日任务创建趋势</h2>
        {isEmpty ? (<Empty description="暂无任务数据" style={{margin:'5rem 0'}}/>) : hasMounted?(<TaskCreationLine tasks={taskInfo}/>):(<div className="loading">图表加载中...</div>) }
      </div>

      <div className="chart-card">
        <h2 className="chart-title">每日到期任务数</h2>
        {isEmpty ? (<Empty description="暂无任务数据" style={{margin:'5rem 0'}}/>) : hasMounted?(<TaskDueBar tasks={taskInfo}/>):(<div className="loading">图表加载中...</div>) }
      </div>
    </div>
  );
}

export default BarChart