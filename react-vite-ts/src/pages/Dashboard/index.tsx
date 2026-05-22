import './index.scss';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Drop from './component/Drop';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { Drawer, Form, Input, Space, Button, DatePicker } from 'antd';
import type { GetProps } from 'antd';
import dayjs from 'dayjs';
import { createTask, taskSort } from '@/apis/task';
import { fetchTaskList } from '@/store/modules/taskSlice';
import type { TaskDetail } from '@/types/task';

function cloneDeep(value: any, hash = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (hash.has(value)) {
    return hash.get(value);
  }
  const result: any = Array.isArray(value) ? [] : {};
  hash.set(value, result);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = cloneDeep(value[key], hash);
    }
  }
  return result;
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;
type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const layout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 16 }
};

const tailLayout = {
  wrapperCol: { offset: 5, span: 16 }
};

const text = {
  greeting: '\u4efb\u52a1\u9762\u677f',
  heroTitle: '\u66f4\u6e05\u6670\u5730\u63a8\u8fdb\u4efb\u52a1',
  heroDescription:
    '\u5c06\u8fdb\u884c\u4e2d\u3001\u5f85\u5f00\u59cb\u548c\u5df2\u5b8c\u6210\u7684\u4efb\u52a1\u653e\u5728\u540c\u4e00\u4e2a\u89c6\u56fe\u91cc\uff0c\u65b9\u4fbf\u4f60\u5feb\u901f\u5207\u6362\u72b6\u6001\u5e76\u8c03\u6574\u987a\u5e8f\u3002',
  newTask: '\u65b0\u5efa\u4efb\u52a1',
  creating: '\u65b0\u5efa',
  inProgress: '\u8fdb\u884c\u4e2d',
  upcoming: '\u5f85\u5f00\u59cb',
  completed: '\u5df2\u5b8c\u6210',
  allTasks: '\u5168\u90e8\u4efb\u52a1',
  dragTip: '\u652f\u6301\u62d6\u62fd\u6392\u5e8f',
  taskCreateSuccess: '\u4efb\u52a1\u521b\u5efa\u6210\u529f\u3002',
  drawerTitle: '\u65b0\u5efa\u4efb\u52a1',
  title: '\u6807\u9898',
  date: '\u65e5\u671f',
  description: '\u4efb\u52a1\u63cf\u8ff0',
  submit: '\u63d0\u4ea4',
  reset: '\u91cd\u7f6e',
  titlePlaceholder: '\u8bf7\u8f93\u5165\u4efb\u52a1\u6807\u9898',
  titleRequired: '\u8bf7\u8f93\u5165\u4efb\u52a1\u6807\u9898\u3002',
  dateRequired: '\u8bf7\u9009\u62e9\u4efb\u52a1\u65e5\u671f\u3002',
  descriptionRequired: '\u8bf7\u8f93\u5165\u4efb\u52a1\u63cf\u8ff0\u3002',
  descriptionPlaceholder: '\u63cf\u8ff0\u4efb\u52a1\u80cc\u666f\u3001\u8fdb\u5ea6\u6216\u76ee\u6807'
};

const Dashboard = () => {
  const [proceed, setProceed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [finish, setFinish] = useState(false);
  const [targetIndex, setTargetIndex] = useState<any>(-1);
  const [open, setOpen] = useState(false);
  const dispatch: AppDispatch = useDispatch();
  const [proList, setProList] = useState<TaskDetail[]>([]);
  const [waitList, setWaitList] = useState<TaskDetail[]>([]);
  const [finishList, setFinishList] = useState<TaskDetail[]>([]);
  const [form] = Form.useForm();
  const userInfo = useSelector((state: RootState) => state.user.userInfo);
  const taskInfo = useSelector((state: RootState) => state.task.tasklist) as TaskDetail[];

  useEffect(() => {
    dispatch(fetchTaskList());
  }, [dispatch]);

  useEffect(() => {
    if (taskInfo && Array.isArray(taskInfo)) {
      const now = dayjs();

      const proceedTasks = taskInfo.filter((task) => {
        const start = dayjs(task.created_at);
        const end = dayjs(task.created_end);
        return now.isAfter(start) && now.isBefore(end);
      });

      const waitTasks = taskInfo.filter((task) => {
        const start = dayjs(task.created_at);
        return now.isBefore(start);
      });

      const finishTasks = taskInfo.filter((task) => {
        const end = dayjs(task.created_end);
        return now.isAfter(end);
      });

      setProList(proceedTasks);
      setWaitList(waitTasks);
      setFinishList(finishTasks);
    }
  }, [taskInfo]);

  const handleCreateTask = async (values: any) => {
    try {
      await createTask({
        name: values.title,
        created_at: dayjs(values.date[0]).format('YYYY-MM-DD HH:mm:ss'),
        created_end: dayjs(values.date[1]).format('YYYY-MM-DD HH:mm:ss'),
        description: values.describe,
        index: taskInfo.length + 1
      });
      alert(text.taskCreateSuccess);
      dispatch(fetchTaskList());
      form.resetFields();
      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().endOf('day');
  };

  const onReset = () => {
    form.resetFields();
  };

  const onChangeIndex = (index: number) => {
    setTargetIndex(index);
  };

  const moveItem = async (index: any, listValue: any, setList: any) => {
    const list = cloneDeep(listValue);
    const current = list[index];
    await taskSort({
      oldIndex: list[index].item_index,
      newIndex: list[targetIndex].item_index,
      userId: userInfo.id
    });
    list.splice(index, 1);
    list.splice(targetIndex, 0, current);
    setList([...list]);
  };

  const taskSections = [
    {
      key: 'proceed',
      title: text.inProgress,
      tone: 'proceed',
      collapsed: proceed,
      onToggle: () => setProceed(!proceed),
      list: proList,
      setList: setProList
    },
    {
      key: 'waiting',
      title: text.upcoming,
      tone: 'waiting',
      collapsed: waiting,
      onToggle: () => setWaiting(!waiting),
      list: waitList,
      setList: setWaitList
    },
    {
      key: 'finish',
      title: text.completed,
      tone: 'finish',
      collapsed: finish,
      onToggle: () => setFinish(!finish),
      list: finishList,
      setList: setFinishList
    }
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <div className="hero-copy">
            <span className="hero-badge">{text.greeting}</span>
            <p className="hero-kicker">{userInfo?.nickname || 'SmartTask'}</p>
            <h2 className="hero-title">{text.heroTitle}</h2>
            <p className="hero-description">{text.heroDescription}</p>
          </div>

          <div className="hero-actions">
            <button type="button" className="create-task-button" onClick={() => setOpen(true)}>
              <PlusOutlined />
              <span>{text.newTask}</span>
            </button>
            <span className="drag-tip">{text.dragTip}</span>
          </div>
        </section>

        <section className="task-board">
          {taskSections.map((section, index) => (
            <div
              className={classNames('list-menu', section.tone)}
              key={section.key}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <button type="button" className="title" onClick={section.onToggle}>
                <div className="title-copy">
                  <span className="title-name">{section.title}</span>
                  <span className="title-count">{section.list.length}</span>
                </div>
                <DownOutlined className={classNames({ active: section.collapsed })} />
              </button>

              <div className={classNames('list-shell', { hidden: section.collapsed })}>
                <Drop
                  setList={section.setList}
                  List={section.list}
                  targetIndex={targetIndex}
                  onChangeIndex={onChangeIndex}
                  moveItem={moveItem}
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      <Drawer
        title={text.drawerTitle}
        closable={{ 'aria-label': 'Close Button' }}
        onClose={() => setOpen(false)}
        open={open}
        size="large"
        className="dashboard-drawer"
      >
        <Form
          {...layout}
          form={form}
          name="create-task"
          onFinish={handleCreateTask}
          style={{ maxWidth: 720 }}
        >
          <Form.Item
            name="title"
            label={text.title}
            rules={[{ required: true, message: text.titleRequired }]}
          >
            <Input placeholder={text.titlePlaceholder} />
          </Form.Item>

          <Form.Item
            name="date"
            label={text.date}
            rules={[{ required: true, message: text.dateRequired }]}
          >
            <RangePicker disabledDate={disabledDate} />
          </Form.Item>

          <Form.Item
            name="describe"
            label={text.description}
            rules={[{ required: true, message: text.descriptionRequired }]}
          >
            <TextArea
              showCount
              allowClear
              maxLength={1000}
              placeholder={text.descriptionPlaceholder}
              style={{ height: 120, resize: 'none' }}
            />
          </Form.Item>

          <Form.Item {...tailLayout}>
            <Space>
              <Button type="primary" htmlType="submit">
                {text.submit}
              </Button>
              <Button htmlType="button" onClick={onReset}>
                {text.reset}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </DndProvider>
  );
};

export default Dashboard;
