import React from "react"
import type { TaskDetail as TaskDetailType } from '@/types/task';
import { Input, Button } from "antd"
import { editTask } from '@/apis/task';

// const {TextArea} = Input
interface Props {
  task: TaskDetailType;
  canEdit: boolean;
}
const TaskDescribe = ({ task, canEdit }: Props) => {
  const [ desc, setDesc] = React.useState(task.description)
  const handleEdit = async () => {
    if (!canEdit) return;
    try { await editTask(task.id!, { description: desc }); alert('保存成功'); }
    catch { alert('保存失败'); }
  }
  return (
    <div className="task-describe">
      <div className="text">
        {/* <TextArea
          showCount
          maxLength={100}
          placeholder="请描述任务内容"
          style={{ height: 120, resize: 'none' }}
        /> */}
        <Input.TextArea
        disabled={!canEdit}
        value={desc ||'请描述任务内容'}
        onChange={e => setDesc(e.target.value)}
        rows={4}
      />
     </div>
      <div className="sub-btn">
        <Button type="primary" disabled={!canEdit} onClick={handleEdit}>提交</Button>
        <Button htmlType="button">重置</Button>
      </div> 
    </div>
  )
}

export default TaskDescribe