
import './index.scss'
import { useState } from 'react';

const Report = () => {
  interface PieData {
    label: string;
    value: number;
    color: string;
  }

  const [list, setList] = useState([
    {
      id: 1,
      label: '未开始',
      value: 30,
      color: 'blue'
    },
    {
      id: 2,
      label: '已结束',
      value: 40,
      color: 'green'
    },
    {
      id: 3,
      label: '进行中',
      value: 30,
      color: 'yellow'
    },
  ])
  const static_x = ["50%", "100%", "100%", "100%", "50%", "0", "0%"]
  const static_y = ["0%", "0%", "50%", "100%", "100%", "100%", "50%"]

  let rol_deg = 0
  return (
    <div className="container">
      <div className="task-statistic">
        <div className="task-title">任务统计</div>
        <div className="chart-container">
          <div className="pie-chart" id="pieChart">
            {/* <div className="pie-segment"></div> */}
            {list.map((item, index: number) => {
              const deg = ['50%', '50%', '50%', '0%']
              let value = item.value * 360 / 100
              let i = 0
              console.log(value);
              
              for(; value > 45; value-=45, i++){
                deg.push(static_x[i])
                deg.push(static_y[i])
                deg.push()
              }
              console.log(item.value);
              
              const rol = `rotateZ(${rol_deg}deg)`
              rol_deg+=item.value * 360 / 100
              console.log(i);
              const randians = value * (Math.PI / 180)
              const side = Math.tan(randians) * 50 + 50 + '%'
              console.log(side);
              
              if(i === 0 || i === 3 || i === 4 || i === 7) {
                deg.push(side)
                deg.push(static_y[i+1])
              }
              else{
                deg.push(static_x[i+1])
                deg.push(side)
              }
              deg.push('50%')
              deg.push('50%')
              const str = deg.join(' ')
              console.log(str);
              
              return (
                <div
                  className="pie-segment"
                  key={item.id}
                  style={{"backgroundColor": item.color, "clipPath": `polygon(${str})`, "transform": rol}}
                ></div>
              )
            })}
            
          </div>
          <div className="legend" id="legend"></div>
          <div className="tooltip" id="tooltip"></div>
        </div>
      </div>
    </div>
  )
};

export default Report;
