import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { useNavigate} from 'react-router-dom';
// 唯一识别值
const TYPE = "TaskItem";
const Temp = (props: any) => {
    const { item, index, moveItem, onChangeIndex, List, setList } = props;
    const tempRef = useRef(null)
    const navigate = useNavigate();
    const [{isDragging}, drag] = useDrag({
      type: TYPE,
      item: {...item, index},
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      }),
      end: (draggedItem, monitor) => {
        moveItem(draggedItem.index, List, setList)     
      },
    })

    const [, drop] = useDrop({
      accept: TYPE,
      collect: (monitor) => ({
        // 是否放置在目标上
        isOver: monitor.isOver(),
      }),
      hover: (item: any, monitor) => {
        const didHover = monitor.isOver({ shallow: true });
        if (didHover) {         
          onChangeIndex(index)
        }
      },
    });
    drop(drag(tempRef))
    
    return (
        <div
          className={"list-item"}
          style={{
            opacity: isDragging ? 0.5 : 1,
          }}
          ref={tempRef}
          onClick={() => {
            navigate(`/task/${item.id}`)
          }
          }
        >
            <div className="item-title">
              {item.name}
            </div>
            <div className="item-desc">
            {item.status === 1 ? (
               <CheckCircleTwoTone twoToneColor="#52c41a" /> 
             ) : (
               <CloseCircleTwoTone twoToneColor="#f5222d" />
         )}
              <span className="status-text">
                   {item.status === 1 ? ' 已完成' : ' 未完成'}
              </span>
  </div>
        </div>
    )
}
 
export default Temp