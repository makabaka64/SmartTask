import { Button } from "antd";

function App() {
  const a = '123';
  return (
    <>
      <h1>智能任务管理平台</h1>
      <Button type="primary">Primary Button</Button>
      <Button type="default">{a}</Button>
    </>
  );
}

export default App;
