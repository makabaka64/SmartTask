import React, { useState,useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BarChartOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch,useSelector } from 'react-redux';
import type { RootState,AppDispatch } from '@/store'
import { fetchLogout, fetchUserInfo } from '@/store/modules/user';
import './index.scss';

const { Header, Sider, Content } = Layout;



const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const userInfo = useSelector((state: RootState) => state.user.userInfo)
  const navigate = useNavigate();
  const location = useLocation();
   const dispatch: AppDispatch = useDispatch();
   useEffect(() => {
    dispatch(fetchUserInfo());
  },[dispatch]);

  const handleLogout = () => {
    dispatch(fetchLogout());
    navigate('/login');
  };

  const items: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '任务管理',
    },
    {
      key: '/barchart',
      icon: <BarChartOutlined />,
      label: '实时看板',
    },
    {
      key: '/report',
      icon: <MessageOutlined />,
      label: '消息中心',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
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
          <Dropdown menu={{items}} placement="bottomRight">
            <div className="user-info">
              <Avatar icon={<UserOutlined />} src={userInfo.avater_url ? userInfo.avater_url : undefined}/>
              <span className="username">{userInfo?.nickname}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="sider"
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
            selectedKeys={[location.pathname]}
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