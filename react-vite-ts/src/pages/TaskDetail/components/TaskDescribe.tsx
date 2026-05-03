import { useState, useEffect, useMemo } from 'react';
import type { TaskDetail as TaskDetailType } from '@/types/task';
import { Input, Button, Spin } from 'antd';
import { editTask } from '@/apis/task';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { streamSummary } from '@/services/summaryService';
import { setTaskSummary, clearTaskSummary } from '@/store/modules/taskSlice';

interface Props {
  task: TaskDetailType;
  canEdit: boolean;
}

const text = {
  summary: 'AI \u6458\u8981',
  summaryPlaceholder: '\uff08\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u751f\u6210\uff09',
  save: '\u63d0\u4ea4',
  reset: '\u91cd\u7f6e',
  generate: 'AI \u751f\u6210\u6458\u8981',
  saveSuccess: '\u4fdd\u5b58\u6210\u529f\u3002',
  saveFailed: '\u4fdd\u5b58\u5931\u8d25\u3002',
  summaryFailed: '\u751f\u6210\u5931\u8d25\u3002',
  descriptionPlaceholder: '\u8bf7\u63cf\u8ff0\u4efb\u52a1\u5185\u5bb9'
};

const TaskDescribe = ({ task, canEdit }: Props) => {
  const dispatch = useDispatch();
  const taskSummary = useSelector((state: RootState) => state.task.taskSummary);
  const summary = useMemo(() => {
    return taskSummary[task.id!] || { summary: '' };
  }, [task.id, taskSummary]);
  const [desc, setDesc] = useState(task.description);
  const [loading, setLoading] = useState(false);
  const [tempSummary, setTempSummary] = useState('');

  useEffect(() => {
    setDesc(task.description);
    setTempSummary(summary.summary || '');
  }, [task.description, summary]);

  const handleEdit = async () => {
    if (!canEdit) {
      return;
    }
    try {
      await editTask(task.id!, {
        description: desc,
        status: task.status,
        created_at: task.created_at,
        created_end: task.created_end
      });
      alert(text.saveSuccess);
    } catch {
      alert(text.saveFailed);
    }
  };

  const handleGenerateSummary = () => {
    if (!task.id) {
      return;
    }

    setTempSummary('');
    setLoading(true);
    dispatch(clearTaskSummary(task.id));

    const bufferRef: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closeStream = null;

    closeStream = streamSummary(
      task.id,
      (chunk) => {
        bufferRef.push(chunk);
        if (!timer) {
          timer = setTimeout(() => {
            if (bufferRef.length > 0) {
              const merged = bufferRef.join('');
              setTempSummary((prev) => prev + merged);
              dispatch(setTaskSummary({ taskId: task.id, summary: merged }));
              bufferRef.length = 0;
            }
            timer = null;
          }, 100);
        }
      },
      () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        setLoading(false);
      },
      () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        setLoading(false);
        alert(text.summaryFailed);
      }
    );

    return () => {
      if (closeStream) {
        closeStream();
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  };

  return (
    <div className="task-describe">
      <div className="summary-box">
        <div className="summary-title">{text.summary}</div>
        {loading ? (
          <Spin />
        ) : (
          <div className="summary-content">
            {tempSummary || text.summaryPlaceholder}
          </div>
        )}
      </div>

      <div className="text">
        <Input.TextArea
          value={desc || text.descriptionPlaceholder}
          onChange={(e) => setDesc(e.target.value)}
          rows={8}
        />
      </div>

      <div className="sub-btn">
        <Button type="primary" disabled={!canEdit} onClick={handleEdit}>
          {text.save}
        </Button>
        <Button htmlType="button" disabled={!canEdit} onClick={() => setDesc(task.description)}>
          {text.reset}
        </Button>
        <Button type="dashed" onClick={handleGenerateSummary} loading={loading}>
          {text.generate}
        </Button>
      </div>
    </div>
  );
};

export default TaskDescribe;
