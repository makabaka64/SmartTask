import './index.scss'
import {
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useState,useEffect } from 'react';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Drop from './component/Drop';
import {useDispatch, useSelector } from 'react-redux'
import type { RootState,AppDispatch } from '@/store'
import { Drawer, Form, Input,  Space, Button, DatePicker } from 'antd';
import type { GetProps } from 'antd';
import dayjs from 'dayjs';
import {createTask,taskSort} from '@/apis/task';
import {fetchTaskList } from '@/store/modules/taskSlice';
import type { TaskDetail } from '@/types/task';

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
  const dispatch: AppDispatch = useDispatch();
  const [proList, setProList] = useState<TaskDetail[]>([
  ])
  const [waitList, setWaitList] = useState<TaskDetail[]>([
  ])
  const [finishList, setFinishList] = useState<TaskDetail[]>([
  ])

  const [form] = Form.useForm();
  const userInfo = useSelector((state: RootState) => state.user.userInfo); 
  // 获取任务列表
  const taskInfo = useSelector((state: RootState) => state.task.tasklist) as TaskDetail[];
  useEffect(() => {
    dispatch(fetchTaskList())
  }, [dispatch]);
  
  useEffect(() => {
    if (taskInfo && Array.isArray(taskInfo)) {
      const now = dayjs();
  
      const proceedTasks = taskInfo.filter(task => {
        const start = dayjs(task.created_at);
        const end = dayjs(task.created_end);
        return now.isAfter(start) && now.isBefore(end); // 进行中
      });
  
      const waitTasks = taskInfo.filter(task => {
        const start = dayjs(task.created_at);
        return now.isBefore(start); // 未开始
      });
  
      const finishTasks = taskInfo.filter(task => {
        const end = dayjs(task.created_end);
        return now.isAfter(end); // 已结束
      });
  
      setProList(proceedTasks);
      setWaitList(waitTasks);
      setFinishList(finishTasks);
    }
  }, [taskInfo]);
  // 创建任务
  const handleCreateTask = async (values: any) => {
    try {
      
      const res = await createTask({
        name: values.title,
        created_at: dayjs(values.date[0]).format('YYYY-MM-DD HH:mm:ss'),
        created_end: dayjs(values.date[1]).format('YYYY-MM-DD HH:mm:ss'),
        description: values.describe,
        index: taskInfo.length + 1,
      });
      console.log('创建任务成功:', res);
      alert('任务创建成功');
      dispatch(fetchTaskList()); // 刷新任务列表
      form.resetFields();
      setOpen(false);
    } catch (error) {
      console.error('创建任务失败:', error);
    }
  };

  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().endOf('day');
  };
  

  const onReset = () => {
    form.resetFields();
  };
  

  const onChangeIndex = (i: number) => {
    setTargetIndex(i)
  }
  // 移动任务
  const moveItem =async (i: any, List: any, setList: any) => {
    const list = cloneDeep(List)
    const current = list[i];
     await taskSort({oldIndex: list[i].item_index, newIndex: list[targetIndex].item_index, userId:userInfo.id })
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
  // const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  //   console.log('Change:', e.target.value);
  // };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <div className="nav">
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
      onFinish={handleCreateTask}
      style={{ maxWidth: 700 }}
    >
      <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入任务标题' }]}>
        <Input placeholder='请输入任务标题' />
      </Form.Item>
      <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择任务日期' }]}>
        <RangePicker disabledDate={disabledDate} />
      </Form.Item>
      <Form.Item name="describe" label="任务描述" rules={[{ required: true, message: '请输入任务描述' }]}>
        <TextArea
          showCount
          allowClear
          maxLength={1000}
          placeholder="任务描述"
          style={{ height: 120, resize: 'none' }}
        />
      </Form.Item>
      <Form.Item {...tailLayout}>
        <Space>
          <Button type="primary" htmlType="submit" >
            提交
          </Button>
          <Button htmlType="button" onClick={onReset}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
      </Drawer>
    </DndProvider>
  )
};

export default Dashboard;
