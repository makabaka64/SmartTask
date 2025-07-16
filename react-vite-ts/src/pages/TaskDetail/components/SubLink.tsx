import { Button } from 'antd';
import { deleteTask } from '@/apis/task';
import { useNavigate } from 'react-router-dom';
import { DeleteOutlined} from '@ant-design/icons'
interface Props {
  taskId: number;
  canDelete: boolean;
}


const SubLink = ({ taskId, canDelete }: Props) => {
  const navigate = useNavigate();
  const handleDelete = async () => {
    if (!canDelete) return;
    try { await deleteTask(taskId!); alert('删除成功'); navigate(-1); }
    catch { alert('删除失败'); }
  };
  return (
    <div className="sub-link">
      <div className="add-link">
        <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={handleDelete}>删除</Button>
      </div>
    </div>
  )
  
}

export default SubLink