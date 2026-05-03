import { Button } from 'antd';
import { deleteTask } from '@/apis/task';
import { useNavigate } from 'react-router-dom';
import { DeleteOutlined } from '@ant-design/icons';

interface Props {
  taskId: number;
  canDelete: boolean;
}

const text = {
  delete: '\u5220\u9664\u4efb\u52a1',
  success: '\u5220\u9664\u6210\u529f\u3002',
  failed: '\u5220\u9664\u5931\u8d25\u3002',
  hint: '\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\uff0c\u8bf7\u5728\u786e\u8ba4\u4efb\u52a1\u5df2\u4e0d\u518d\u9700\u8981\u540e\u518d\u6267\u884c\u3002'
};

const SubLink = ({ taskId, canDelete }: Props) => {
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!canDelete) {
      return;
    }
    try {
      await deleteTask(taskId);
      alert(text.success);
      navigate(-1);
    } catch {
      alert(text.failed);
    }
  };

  return (
    <div className="sub-link">
      <p className="delete-hint">{text.hint}</p>
      <div className="add-link">
        <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={handleDelete}>
          {text.delete}
        </Button>
      </div>
    </div>
  );
};

export default SubLink;
