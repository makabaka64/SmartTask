import './index.scss'
import {
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useState } from 'react';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Drop from './component/Drop';
import { Drawer, Form, Input, Select, Space, Button, DatePicker } from 'antd';
import type { GetProps } from 'antd';
import dayjs from 'dayjs';

function cloneDeep(value: any, hash = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (hash.has(value)) {
    return hash.get(value)
  }
  const result:any = Array.isArray(value) ? [] : {}
  hash.set(value, result)
  for(const key in value) {
    if(value.hasOwnProperty(key)) {
      result[key] = cloneDeep(value[key], hash)
    }
  }
  return result
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;
type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const layout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const Dashboard = () => {
  const [proceed, setProceed] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [finish, setFinish] = useState(false)
  const [targetIndex, setTargetIndex] = useState<any>(-1)
  const [open, setOpen] = useState(false);
  const [proList, setProList] = useState([
    {id: 0, title: "1"},
    {id: 1, title: "2"},
    {id: 2, title: "3"},
    {id: 3, title: "4"},
    {id: 4, title: "5"},
    {id: 5, title: "6"},
  ])
  const [waitList, setWaitList] = useState([
    {id: 0, title: "1"},
    {id: 1, title: "2"},
    {id: 2, title: "3"},
    {id: 3, title: "4"},
    {id: 4, title: "5"},
    {id: 5, title: "6"},
  ])
  const [finishList, setFinishList] = useState([
    {id: 0, title: "1"},
    {id: 1, title: "2"},
    {id: 2, title: "3"},
    {id: 3, title: "4"},
    {id: 4, title: "5"},
    {id: 5, title: "6"},
  ])

  const [form] = Form.useForm();

  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().endOf('day');
  };
  const onFinish = (values: any) => {
    console.log(values);
  };

  const onReset = () => {
    form.resetFields();
  };
  

  const onChangeIndex = (i: number) => {
    setTargetIndex(i)
  }
  const moveItem = (i: any, List: any, setList: any) => {
    const list = cloneDeep(List)
    const current = list[i];
    list.splice(i, 1)
    list.splice(targetIndex, 0, current)
    setList([...list])
  }
  const onClose = () => {
    setOpen(false);
  };
  const showDrawer = () => {
    setOpen(true);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    console.log('Change:', e.target.value);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <div className="nav">
          <div className="search">
            <input type="text" />
            <div className="search-show"></div>
          </div>
          <div className="add">
            <button onClick={showDrawer}><PlusOutlined /> 新建</button>
          </div>
        </div>
        <div className={classNames(["list-menu","proceed"])}>
          <div className="title" onClick={() => setProceed(!proceed)}>进行中 <DownOutlined className={classNames({'active': proceed})} /></div>
          <div className={classNames(["list", {"hidden": proceed}])}>
            <Drop setList={setProList} List={proList} targetIndex={targetIndex} onChangeIndex={onChangeIndex} moveItem={moveItem} />

          </div>
        </div>
        <div className={classNames(["list-menu","waiting"])}>
          <div className="title" onClick={() => setWaiting(!waiting)}>未开始 <DownOutlined className={classNames({'active': waiting})} /></div>
          <div className={classNames(["list", {"hidden": waiting}])}>
            <Drop setList={setWaitList} List={waitList} targetIndex={targetIndex} onChangeIndex={onChangeIndex} moveItem={moveItem} />

          </div>
        </div>
        <div className={classNames(["list-menu","finish"])}>
          <div className="title" onClick={() => setFinish(!finish)}>已结束 <DownOutlined className={classNames({'active': finish})} /></div>
          <div className={classNames(["list", {"hidden": finish}])}>
            <Drop setList={setFinishList} List={finishList} targetIndex={targetIndex} onChangeIndex={onChangeIndex} moveItem={moveItem} />

          </div>
        </div>
      </div>
      <Drawer
        title="新建任务"
        closable={{ 'aria-label': 'Close Button' }}
        onClose={onClose}
        open={open}
        size={'large'}
      >
        <Form
      {...layout}
      form={form}
      name="control-hooks"
      onFinish={onFinish}
      style={{ maxWidth: 700 }}
    >
      <Form.Item name="title" label="标题" rules={[{ required: true }]}>
        <Input placeholder='请输入项目标题' />
      </Form.Item>
      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
        <RangePicker disabledDate={disabledDate} />
      </Form.Item>
      <Form.Item name="describe" label="任务描述" rules={[{ required: true }]}>
        <TextArea
          showCount
          allowClear
          maxLength={100}
          placeholder="任务描述"
          style={{ height: 120, resize: 'none' }}
        />
      </Form.Item>
      <Form.Item {...tailLayout}>
        <Space>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
          <Button htmlType="button" onClick={onReset}>
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
      </Drawer>
    </DndProvider>
  )
};

export default Dashboard;
