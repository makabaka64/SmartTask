import Temp from "./Temp";
import { useDrop } from "react-dnd";
import { useCallback } from "react";

const Drop = (props: any) => {
  const [, drop] = useDrop({
    accept: 'taskitem',
  })
  const {onChangeIndex, moveItem} = props
  const setDropgRef = useCallback((el: HTMLDivElement | null) => {
    drop(el);
  }, [drop]);
  const renderList = (data: any) => data.map((item: any, index: any) => {return <Temp moveItem={moveItem} onChangeIndex={onChangeIndex} index={index} key={item.id} item={item} />})
  return (
    <div
      className="list"
      ref={setDropgRef}
      
    >
      {renderList(props.proList)}
    </div>
  )
}

export default Drop