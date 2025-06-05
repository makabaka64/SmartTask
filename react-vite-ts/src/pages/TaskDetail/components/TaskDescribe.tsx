import React from "react"
import { Input, Button } from "antd"

const {TextArea} = Input

const TaskDescribe: React.FC = () => {
  return (
    <div className="task-describe">
      <div className="text">
        <TextArea
          showCount
          maxLength={100}
          placeholder="请描述任务内容"
          style={{ height: 120, resize: 'none' }}
        />
      </div>
      <div className="sub-btn">
        <Button type="primary">提交</Button>
        <Button htmlType="button">重置</Button>
      </div>
    </div>
  )
}

export default TaskDescribe