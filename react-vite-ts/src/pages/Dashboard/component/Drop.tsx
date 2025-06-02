import Temp from "./Temp";
import { useDrop } from "react-dnd";
import { useCallback } from "react";

const Drop = (props: any) => {
  const [, drop] = useDrop({
    accept: 'taskitem',
  })
  const {onChangeIndex, moveItem, List, setList} = props
  const setDropgRef = useCallback((el: HTMLDivElement | null) => {
    drop(el);
  }, [drop]);
  const renderList = (data: any) => data.map((item: any, index: any) => {return <Temp List={List} setList={setList} moveItem={moveItem} onChangeIndex={onChangeIndex} index={index} key={item.id} item={item} />})
  return (
    <div
      className="list"
      ref={setDropgRef}
      
    >
      {renderList(List)}
    </div>
  )
}

export default Drop