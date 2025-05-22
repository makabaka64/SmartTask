import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchRegister, fetchLogin, fetchSendCode } from '@/store/modules/user';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import './index.scss';

interface LoginForm {
  email: string;
  password: string;
  verificationCode?: string;
}

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSendCode = async () => {
    try {
      const email = await form.validateFields(['email']);
      await dispatch(fetchSendCode(email.email));
      alert('验证码已发送！');
    } catch (err) {
      console.error(err);
      alert('请先输入有效的邮箱地址');
    }
  };

  const handleSubmit = async (values: LoginForm) => {
    try {
      if (isLogin) {
        await dispatch(fetchLogin({
          email: values.email,
          password: values.password
        }));
        alert('登录成功！');
        navigate('/');
      } else {
        await dispatch(fetchRegister({
          email: values.email,
          password: values.password,
          verificationCode: values.verificationCode!
        }));
        alert('注册成功！请使用新账号登录');
        setIsLogin(true);
        form.resetFields();
      }
    } catch (error) {
      console.error(error);
      alert((error as Error).message || '操作失败，请重试！');
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2 className="form-title">{isLogin ? '登录' : '注册'}</h2>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          className="form-content"
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能小于6位' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          {!isLogin && (
            <Form.Item
              name="verificationCode"
              label="验证码"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <div className="verification-code-wrapper">
                <Input placeholder="请输入验证码" />
                <Button onClick={handleSendCode}>
                  获取验证码
                </Button>
              </div>
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" className="submit-button">
              {isLogin ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>

        <div className="form-switch" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '没有账号？立即注册' : '已有账号？立即登录'}
        </div>
      </div>
    </div>
  );
};

export default Login;
