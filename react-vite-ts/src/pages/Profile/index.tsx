import React, { useState, useEffect } from 'react';
import { Card, Avatar, Input, Button, Form, Tabs, message, Upload, Spin } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { updateUserInfo, updateAvatar, updatePassword } from '@/apis/user';
import { fetchUserInfo } from '@/store/modules/user';
import { removeToken } from '@/utils/index';
import dayjs from 'dayjs';
import './index.scss';

const text = {
  badge: '\u4e2a\u4eba\u4e2d\u5fc3',
  title: '\u8d26\u53f7\u4fe1\u606f\u4e0e\u5b89\u5168',
  description:
    '\u5728\u8fd9\u91cc\u4fee\u6539\u6635\u79f0\u3001\u66f4\u65b0\u5934\u50cf\u3001\u7ba1\u7406\u5bc6\u7801\uff0c\u8ba9\u4e2a\u4eba\u8d26\u53f7\u72b6\u6001\u4fdd\u6301\u6e05\u6670\u548c\u53ef\u4fe1\u3002',
  profile: '\u4e2a\u4eba\u4fe1\u606f',
  security: '\u8d26\u53f7\u5b89\u5168',
  joinedAt: '\u6ce8\u518c\u65f6\u95f4',
  email: '\u90ae\u7bb1',
  nickname: '\u6635\u79f0',
  save: '\u4fdd\u5b58\u4fee\u6539',
  updatePassword: '\u4fee\u6539\u5bc6\u7801',
  uploadAvatar: '\u66f4\u6362\u5934\u50cf',
  backHome: '\u8fd4\u56de\u9996\u9875',
  nicknamePlaceholder: '\u8bf7\u8f93\u5165\u7528\u6237\u540d',
  nicknameRequired: '\u8bf7\u8f93\u5165\u7528\u6237\u540d\u3002',
  oldPassword: '\u5f53\u524d\u5bc6\u7801',
  newPassword: '\u65b0\u5bc6\u7801',
  confirmPassword: '\u786e\u8ba4\u65b0\u5bc6\u7801',
  oldPasswordRequired: '\u8bf7\u8f93\u5165\u5f53\u524d\u5bc6\u7801\u3002',
  newPasswordRequired: '\u8bf7\u8f93\u5165\u65b0\u5bc6\u7801\u3002',
  confirmPasswordRequired: '\u8bf7\u786e\u8ba4\u65b0\u5bc6\u7801\u3002',
  passwordMin: '\u5bc6\u7801\u957f\u5ea6\u4e0d\u80fd\u5c11\u4e8e 6 \u4f4d\u3002',
  passwordMismatch: '\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4\u3002',
  passwordPlaceholder: '\u8bf7\u8f93\u5165\u5bc6\u7801',
  profileUpdated: '\u4e2a\u4eba\u4fe1\u606f\u66f4\u65b0\u6210\u529f\u3002',
  updateFailed: '\u66f4\u65b0\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002',
  passwordUpdated: '\u5bc6\u7801\u4fee\u6539\u6210\u529f\u3002',
  uploadImageOnly: '\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6\u3002',
  avatarUpdated: '\u5934\u50cf\u4e0a\u4f20\u6210\u529f\u3002',
  avatarFailed: '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002',
  loadingUser: '\u52a0\u8f7d\u7528\u6237\u4fe1\u606f...',
  profileCount: '\u57fa\u7840\u4fe1\u606f',
  safetyCount: '\u5b89\u5168\u8bbe\u7f6e'
};

const Profile: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const userInfo = useSelector((state: RootState) => state.user.userInfo);

  useEffect(() => {
    dispatch(fetchUserInfo());
  }, [dispatch]);

  useEffect(() => {
    if (userInfo) {
      form.setFieldsValue({
        nickname: userInfo.nickname,
        email: userInfo.email,
        create_time: dayjs(userInfo.create_time).format('YYYY-MM-DD HH:mm:ss'),
        avater_url: userInfo.avater_url
      });
    }
  }, [userInfo, form]);

  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      const res = await updateUserInfo({ nickname: values.nickname, id: userInfo.id });
      if (res.status === 0) {
        alert(text.profileUpdated);
        dispatch(fetchUserInfo());
      } else {
        message.error(res.message || text.updateFailed);
      }
    } catch (error) {
      console.error(error);
      message.error(text.updateFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (values: any) => {
    try {
      setLoading(true);
      const res = await updatePassword({
        oldPwd: values.oldPassword,
        newPwd: values.newPassword
      });
      if (res.status === 0) {
        alert(text.passwordUpdated);
        passwordForm.resetFields();
        removeToken();
        navigate('/login');
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error(error);
      message.error(text.updateFailed);
    } finally {
      setLoading(false);
    }
  };

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const uploadProps: UploadProps = {
    name: 'avater_url',
    showUploadList: false,
    beforeUpload: async (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error(text.uploadImageOnly);
        return Upload.LIST_IGNORE;
      }
      try {
        const base64 = await getBase64(file);
        const res = await updateAvatar({ avater_url: base64 });
        if (res.status === 0) {
          alert(text.avatarUpdated);
          dispatch(fetchUserInfo());
        } else {
          message.error(res.message || text.avatarFailed);
        }
      } catch (error) {
        console.error(error);
        message.error(text.avatarFailed);
        return Upload.LIST_IGNORE;
      }
      return false;
    }
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <UserOutlined />
          {` ${text.profile}`}
        </span>
      ),
      children: (
        <Card className="profile-card">
          <div className="avatar-section">
            <Upload {...uploadProps}>
              <div className="avatar-wrapper">
                <Avatar size={112} icon={<UserOutlined />} src={userInfo.avater_url || undefined} />
                <div className="avatar-mask">
                  <UploadOutlined />
                  <div>{text.uploadAvatar}</div>
                </div>
              </div>
            </Upload>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProfile}
            className="profile-form"
          >
            <Form.Item
              name="nickname"
              label={text.nickname}
              rules={[{ required: true, message: text.nicknameRequired }]}
            >
              <Input placeholder={text.nicknamePlaceholder} />
            </Form.Item>

            <Form.Item name="email" label={text.email}>
              <Input disabled />
            </Form.Item>

            <Form.Item name="create_time" label={text.joinedAt}>
              <Input disabled />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                {text.save}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: '2',
      label: (
        <span>
          <LockOutlined />
          {` ${text.security}`}
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
              label={text.oldPassword}
              rules={[{ required: true, message: text.oldPasswordRequired }]}
            >
              <Input.Password placeholder={text.passwordPlaceholder} />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label={text.newPassword}
              rules={[
                { required: true, message: text.newPasswordRequired },
                { min: 6, message: text.passwordMin }
              ]}
            >
              <Input.Password placeholder={text.passwordPlaceholder} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={text.confirmPassword}
              dependencies={['newPassword']}
              rules={[
                { required: true, message: text.confirmPasswordRequired },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(text.passwordMismatch));
                  }
                })
              ]}
            >
              <Input.Password placeholder={text.passwordPlaceholder} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                {text.updatePassword}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.badge}</span>
          <h2 className="hero-title">{text.title}</h2>
          <p className="hero-description">{text.description}</p>
        </div>

     
      </section>

      <section className="profile-panel">
        {userInfo?.id ? (
          <Tabs
            defaultActiveKey="1"
            className="profile-tabs"
            items={tabItems}
            animated={{ inkBar: true, tabPane: true }}
          />
        ) : (
          <div className="loading-container">
            <Spin tip={text.loadingUser} />
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
