import React, { useState } from 'react';
import { Card, Avatar, Input, Button, Form, Table, Tabs, message, Upload } from 'antd';
import { UserOutlined, LockOutlined, HistoryOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useNavigate} from 'react-router-dom';
import './index.scss';

const { TabPane } = Tabs;

// 模拟操作日志数据
const mockLogs = [
  { id: 1, action: '登录', time: '2024-03-20 10:00:00', ip: '192.168.1.1', device: 'Chrome/Windows' },
  { id: 2, action: '修改密码', time: '2024-03-19 15:30:00', ip: '192.168.1.1', device: 'Chrome/Windows' },
  { id: 3, action: '更新个人信息', time: '2024-03-18 09:15:00', ip: '192.168.1.1', device: 'Chrome/Windows' },
];

const Profile: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 模拟用户数据
  const userInfo = {
    avatar: '',
    nickname: '张三',
    email: 'zhangsan@example.com',
    registerTime: '2024-01-01',
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      // TODO: 实现更新个人信息的逻辑
      console.log('更新个人信息:', values);
      message.success('个人信息更新成功');
    } catch (error) {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (values: any) => {
    try {
      setLoading(true);
      // TODO: 实现修改密码的逻辑
      console.log('修改密码:', values);
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error('修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
      }
      return isImage || Upload.LIST_IGNORE;
    },
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success('头像上传成功');
      } else if (info.file.status === 'error') {
        message.error('头像上传失败');
      }
    },
  };

  const columns = [
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip' },
    { title: '设备', dataIndex: 'device', key: 'device' },
  ];

  return (
    <div className="profile-container">
      <div className="profile-content">
        <Tabs defaultActiveKey="1" className="profile-tabs">
          <TabPane
            tab={
              <span>
                <UserOutlined />
                个人信息
              </span>
            }
            key="1"
          >
            <Card className="profile-card">
              <div className="avatar-section">
                <Upload {...uploadProps}>
                  <div className="avatar-wrapper">
                    <Avatar size={100} icon={<UserOutlined />} src={userInfo.avatar} />
                    <div className="avatar-mask">
                      <UploadOutlined />
                      <div>更换头像</div>
                    </div>
                  </div>
                </Upload>
              </div>

              <Form
                form={form}
                layout="vertical"
                initialValues={userInfo}
                onFinish={handleUpdateProfile}
                className="profile-form"
              >
                <Form.Item
                  name="nickname"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="请输入用户名" />
                </Form.Item>

                <Form.Item name="email" label="邮箱">
                  <Input disabled />
                </Form.Item>

                <Form.Item name="registerTime" label="注册时间">
                  <Input disabled />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    保存修改
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <LockOutlined />
                账户安全
              </span>
            }
            key="2"
          >
            <Card className="profile-card">
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleUpdatePassword}
                className="profile-form"
              >
                <Form.Item
                  name="oldPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password placeholder="请输入当前密码" />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码长度不能小于6位' }
                  ]}
                >
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请确认新密码" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                操作日志
              </span>
            }
            key="3"
          >
            <Card className="profile-card">
              <Table
                columns={columns}
                dataSource={mockLogs}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className="log-table"
              />
            </Card>
          </TabPane>
        </Tabs>
        <Button ghost onClick={() => navigate('/')}>返回首页</Button>
      </div>
     
    </div>
  );
};

export default Profile;
