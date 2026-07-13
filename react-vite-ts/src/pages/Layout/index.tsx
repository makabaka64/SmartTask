import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BarChartOutlined,
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchLogout, fetchUserInfo } from '@/store/modules/user';
import classNames from 'classnames';
import './index.scss';

const { Header, Sider, Content } = Layout;

const text = {
  logout: '\u9000\u51fa\u767b\u5f55',
  taskBoard: '\u4efb\u52a1\u9762\u677f',
  analytics: '\u5b9e\u65f6\u770b\u677f',
  agent: 'Agent 工作台',
  messages: '\u6d88\u606f\u4e2d\u5fc3',
  profile: '\u4e2a\u4eba\u4e2d\u5fc3',
  userFallback: 'User'
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const userInfo = useSelector((state: RootState) => state.user.userInfo);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUserInfo());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(fetchLogout());
    navigate('/login');
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: text.logout,
      onClick: handleLogout
    }
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: text.taskBoard
    },
    {
      key: '/barchart',
      icon: <BarChartOutlined />,
      label: text.analytics
    },
    {
      key: '/agent',
      icon: <RobotOutlined />,
      label: text.agent
    },
    {
      key: '/report',
      icon: <MessageOutlined />,
      label: text.messages
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: text.profile
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout className="main-layout">
      <Header className="header">
        <div className="header-left">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-button"
          />
          <h1 className="logo">SmartTask</h1>
        </div>

        <div className="header-right">
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <div className="user-info">
              <Avatar
                icon={<UserOutlined />}
                src={userInfo.avater_url ? userInfo.avater_url : undefined}
              />
              <span className="username">{userInfo?.nickname || text.userFallback}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout className="main-frame">
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className={classNames('sider', { 'sider-hidden': collapsed })}
          breakpoint="lg"
          collapsedWidth={0}
          onBreakpoint={(broken) => {
            if (broken) {
              setCollapsed(true);
            }
          }}
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname === '/' ? '/dashboard' : location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>

        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
