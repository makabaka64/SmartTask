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

const loginHighlights = [
  '\u7edf\u4e00\u6536\u62e2\u4efb\u52a1\u3001\u6210\u5458\u4e0e\u63d0\u9192',
  '\u4ee5\u66f4\u5c11\u6b65\u9aa4\u5b8c\u6210\u534f\u4f5c\u5206\u53d1',
  '\u5728\u4e00\u4e2a\u754c\u9762\u91cc\u8ddf\u8e2a\u8fdb\u5ea6\u53d8\u5316'
];

const text = {
  appName: '\u667a\u80fd\u4efb\u52a1\u7ba1\u7406\u5e73\u53f0',
  heroTitleLine1: '\u66f4\u8f7b\u5730\u5f00\u59cb',
  heroTitleLine2: '\u4efb\u52a1\u534f\u4f5c',
  heroDescription:
    '\u7528\u66f4\u8f7b\u7684\u65b9\u5f0f\u767b\u5f55\u3001\u6ce8\u518c\u548c\u5f00\u59cb\u534f\u4f5c\u3002\u754c\u9762\u4fdd\u6301\u514b\u5236\uff0c\u91cd\u70b9\u53ea\u653e\u5728\u8fdb\u5165\u7cfb\u7edf\u524d\u771f\u6b63\u9700\u8981\u770b\u5230\u7684\u4fe1\u606f\u3002',
  sent: '\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\u3002',
  invalidEmail: '\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002',
  loginSuccess: '\u767b\u5f55\u6210\u529f\u3002',
  registerSuccess: '\u6ce8\u518c\u6210\u529f\uff0c\u8bf7\u4f7f\u7528\u65b0\u8d26\u53f7\u767b\u5f55\u3002',
  actionFailed: '\u64cd\u4f5c\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002',
  login: '\u767b\u5f55',
  register: '\u6ce8\u518c',
  loginSubtitle: '\u7ee7\u7eed\u8fdb\u5165\u4f60\u7684\u4efb\u52a1\u7a7a\u95f4\u3002',
  registerSubtitle: '\u521b\u5efa\u8d26\u53f7\u540e\u5373\u53ef\u5f00\u59cb\u7ba1\u7406\u4efb\u52a1\u3002',
  email: '\u90ae\u7bb1',
  password: '\u5bc6\u7801',
  code: '\u9a8c\u8bc1\u7801',
  enterEmail: '\u8bf7\u8f93\u5165\u90ae\u7bb1\u3002',
  enterValidEmail: '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740\u3002',
  enterPassword: '\u8bf7\u8f93\u5165\u5bc6\u7801\u3002',
  passwordLength: '\u5bc6\u7801\u957f\u5ea6\u4e0d\u80fd\u5c11\u4e8e 6 \u4f4d\u3002',
  passwordPlaceholder: '\u8f93\u5165\u4f60\u7684\u5bc6\u7801',
  enterCode: '\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801\u3002',
  codePlaceholder: '\u8f93\u5165\u90ae\u7bb1\u9a8c\u8bc1\u7801',
  getCode: '\u83b7\u53d6\u9a8c\u8bc1\u7801',
  createAccount: '\u521b\u5efa\u8d26\u53f7',
  toRegister: '\u6ca1\u6709\u8d26\u53f7\uff1f\u7acb\u5373\u6ce8\u518c',
  toLogin: '\u5df2\u6709\u8d26\u53f7\uff1f\u8fd4\u56de\u767b\u5f55'
};

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSendCode = async () => {
    try {
      const email = await form.validateFields(['email']);
      await dispatch(fetchSendCode(email.email));
      alert(text.sent);
    } catch (err) {
      console.error(err);
      alert(text.invalidEmail);
    }
  };

  const handleSubmit = async (values: LoginForm) => {
    try {
      if (isLogin) {
        await dispatch(fetchLogin({
          email: values.email,
          password: values.password
        }));
        alert(text.loginSuccess);
        navigate('/');
      } else {
        await dispatch(fetchRegister({
          email: values.email,
          password: values.password,
          verificationCode: values.verificationCode!
        }));
        alert(text.registerSuccess);
        setIsLogin(true);
        form.resetFields();
      }
    } catch (error) {
      console.error(error);
      alert((error as Error).message || text.actionFailed);
    }
  };

  return (
    <div className="login-container">
      <div className="login-shell">
        <div className="login-backdrop login-backdrop-left" />
        <div className="login-backdrop login-backdrop-right" />

        <section className="login-hero">
          <span className="hero-badge">Google Labs inspired</span>
          <p className="hero-kicker">{text.appName}</p>
          <h1 className="hero-title">
            {text.heroTitleLine1}
            <br />
            {text.heroTitleLine2}
          </h1>
          <p className="hero-description">{text.heroDescription}</p>

          <div className="hero-highlights">
            {loginHighlights.map((item, index) => (
              <div
                className="highlight-item"
                key={item}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="highlight-index">{`0${index + 1}`}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="login-panel">
          <div className="panel-header">
            <span className="panel-tag">{isLogin ? 'Welcome back' : 'Create account'}</span>
            <h2 className="form-title">{isLogin ? text.login : text.register}</h2>
            <p className="form-subtitle">
              {isLogin ? text.loginSubtitle : text.registerSubtitle}
            </p>
          </div>

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            className="form-content"
          >
            <Form.Item
              name="email"
              label={text.email}
              rules={[
                { required: true, message: text.enterEmail },
                { type: 'email', message: text.enterValidEmail }
              ]}
            >
              <Input placeholder="name@company.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label={text.password}
              rules={[
                { required: true, message: text.enterPassword },
                { min: 6, message: text.passwordLength }
              ]}
            >
              <Input.Password placeholder={text.passwordPlaceholder} size="large" />
            </Form.Item>

            {!isLogin && (
              <Form.Item
                name="verificationCode"
                label={text.code}
                rules={[{ required: true, message: text.enterCode }]}
              >
                <div className="verification-code-wrapper">
                  <Input placeholder={text.codePlaceholder} size="large" />
                  <Button onClick={handleSendCode} size="large">
                    {text.getCode}
                  </Button>
                </div>
              </Form.Item>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit" className="submit-button">
                {isLogin ? text.login : text.createAccount}
              </Button>
            </Form.Item>
          </Form>

          <button
            type="button"
            className="form-switch"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? text.toRegister : text.toLogin}
          </button>
        </section>
      </div>
    </div>
  );
};

export default Login;
