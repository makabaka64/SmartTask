import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
 
// 唯一识别值
const TYPE = "TaskItem";
const Temp = (props: any) => {
    const { item, index, moveItem, onChangeIndex, List, setList } = props;
    const tempRef = useRef(null)

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
        >
            <div className="item-title">
              {item.title}
            </div>
        </div>
    )
}
 
export default Temp