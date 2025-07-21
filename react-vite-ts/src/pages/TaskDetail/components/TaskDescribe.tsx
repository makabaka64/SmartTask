import  {  useState,useEffect,useMemo } from "react"
import type { TaskDetail as TaskDetailType } from '@/types/task';
import { Input, Button, Spin } from "antd"
import { editTask } from '@/apis/task';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { streamSummary } from '@/services/summaryService';
import { setTaskSummary,clearTaskSummary } from '@/store/modules/taskSlice'

interface Props {
  task: TaskDetailType;
  canEdit: boolean;
}
const TaskDescribe = ({ task, canEdit }: Props) => {
  const dispatch = useDispatch();
  const taskSummary = useSelector((state: RootState) => state.task.taskSummary);
  const summary = useMemo(() => {
    return taskSummary [task.id!] || { summary: '' };
  }, [task.id, taskSummary]); 
  const [ desc, setDesc] = useState(task.description)
  const [loading, setLoading] = useState(false);
  const [tempSummary, settempSummary] = useState('');

  // 更新任务描述
  useEffect(() => {
    setDesc(task.description);
    settempSummary(summary.summary || '');
  }, [task.description, summary]);  

  const handleEdit = async () => {
    if (!canEdit) return;
    try { await editTask(task.id!, { description: desc , status: task.status, created_at: task.created_at,created_end: task.created_end}); alert('保存成功'); }
    catch { alert('保存失败'); }
  }

// ai生成摘要
  const handleGenerateSummary = () => {
    if (!task.id) return;

    settempSummary('');
    setLoading(true);
    // 清除之前的摘要
   dispatch(clearTaskSummary(task.id));
    streamSummary(
      task.id,
      // 拼接
      (chunk) => {
      settempSummary(prev => {
      const newSummary = prev + chunk;
      dispatch(setTaskSummary({ taskId: task.id, summary: chunk }));
      return newSummary;
    });
      },
      () => setLoading(false),
      () => {
        setLoading(false);
        alert('生成失败');
      }
    );
  };

  return (
    <div className="task-describe">
       <div className="summary-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 'bold' }}>AI 摘要：</div>
        {loading ? (
          <Spin />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', minHeight: '1.5em' }}>{ tempSummary|| '（点击下方按钮生成）'}</div>
        )}
      </div>
      <div className="text">
        <Input.TextArea
        value={desc ||'请描述任务内容'}
        onChange={e => setDesc(e.target.value)}
        rows={7}
      />
     </div>
      <div className="sub-btn">
        <Button type="primary" disabled={!canEdit} onClick={handleEdit}>提交</Button>
        <Button htmlType="button" disabled={!canEdit}>重置</Button>
        <Button type="dashed" onClick={handleGenerateSummary} loading={loading} style={{ marginLeft: 12 }}>
          AI 生成摘要
        </Button>
      </div> 
    </div>
  )
}

export default TaskDescribe