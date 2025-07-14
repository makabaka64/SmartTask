import React, { useState,useEffect } from 'react';
import { Card, Avatar, Input, Button, Form,  Tabs, message, Upload } from 'antd';
import { UserOutlined, LockOutlined,  UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useNavigate} from 'react-router-dom';
import { useDispatch,useSelector } from 'react-redux'
import type { RootState,AppDispatch } from '@/store'
import {updateUserInfo,updateAvatar,updatePassword} from '@/apis/user';
import { fetchUserInfo } from '@/store/modules/user';
import { removeToken } from '@/utils/index';
import dayjs from 'dayjs';
import './index.scss';



const Profile: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  // 获取用户信息
  const userInfo = useSelector((state: RootState) => state.user.userInfo)
  useEffect(() => {
    dispatch(fetchUserInfo());
  },[dispatch]);
  useEffect(() => {
    if (userInfo) {
      form.setFieldsValue({
        nickname: userInfo.nickname,
        email: userInfo.email,
        create_time: dayjs(userInfo.create_time).format('YYYY-MM-DD HH:mm:ss'),
        avater_url: userInfo.avater_url,
      });
    }
  }, [userInfo, form]);
  
   // 修改个人信息
   const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      const res = await updateUserInfo({ nickname: values.nickname,id: userInfo.id });
      if (res.status === 0) {
        alert('个人信息更新成功');
        // 重新拉取用户信息
        dispatch(fetchUserInfo());
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  // 修改密码
  const handleUpdatePassword = async (values: any) => {
    try {
      setLoading(true);
      const res = await updatePassword({
        oldPwd: values.oldPassword,
        newPwd: values.newPassword
      });
      if (res.status === 0) {
        alert('密码修改成功');
        passwordForm.resetFields();
        removeToken()
        navigate('/login');
      } else {
        alert(res.message);
      }
    } catch (error) {
      message.error('修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  // 上传头像
 //  处理上传前图片预览（转 base64）
const getBase64 = (file:File): Promise<string> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
 // 上传头像
 const uploadProps: UploadProps = {
  name:'avater_url',
  showUploadList: false,
  beforeUpload: async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;
    }
    try{
      const base64 = await getBase64(file);
      const res = await updateAvatar({ avater_url: base64 });
      if (res.status === 0) {
        alert('头像上传成功');
        dispatch(fetchUserInfo());
      } else {
        message.error(res.message || '头像上传失败');
      }

    }catch(error) {
      message.error('上传失败，请重试');
      return Upload.LIST_IGNORE;
    }
    return false; // 阻止默认上传行为
  }
 }

 const tabItems = [
  {
    key: '1',
    label: (
      <span>
        <UserOutlined />
        {' 个人信息'}
      </span>
    ),
    children: (
      <Card className="profile-card">
        <div className="avatar-section">
          <Upload {...uploadProps}>
            <div className="avatar-wrapper">
              <Avatar 
                size={100} 
                icon={<UserOutlined />} 
                src={userInfo.avater_url || undefined} 
              />
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

          <Form.Item name="create_time" label="注册时间">
            <Input disabled />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    ),
  },
  {
    key: '2',
    label: (
      <span>
        <LockOutlined />
        {' 账户安全'}
      </span>
    ),
    children: (
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
    ),
  },
];

return (
  <div className="profile-container">
    <div className="profile-content">
      <Tabs 
        defaultActiveKey="1" 
        className="profile-tabs" 
        items={tabItems}  
      />
      <Button ghost onClick={() => navigate('/')}>返回首页</Button>
    </div>
  </div>
);
};

export default Profile;
