import React from 'react';
import { Layout, Image } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProjectOutlined, PlayCircleOutlined } from '@ant-design/icons';
import './AppHeader.css';

const { Header } = Layout;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/workflows',
      icon: <ProjectOutlined />,
      label: '工作流设计',
    },
    {
      key: '/executions',
      icon: <PlayCircleOutlined />,
      label: '执行任务',
    },
  ];

  // 根据路径确定选中的菜单项
  const getSelectedKey = () => {
    if (location.pathname.startsWith('/workflows')) {
      return '/workflows';
    }
    if (location.pathname.startsWith('/executions')) {
      return '/executions';
    }
    return '/workflows'; // 默认选中工作流
  };

  // 检查是否在 /workflows 路由，如果是则隐藏整个 Header
  const isWorkflowsRoute = location.pathname.startsWith('/workflows');
  
  if (isWorkflowsRoute) {
    return null;
  }

  const selectedKey = getSelectedKey();

  return (
    <div className='header flex items-center justify-center gap-4 !px-6 !mt-5'>
      <div className="flex items-center gap-4 !ps-4">
        <Image src="/images/logo.svg" alt="Biezhi Logo" width={32} height={32} />
        <span className="text-2xl font-bold !text-[#96d6b9]">Biezhi</span>
      </div>
      <nav className="header-menu">
        <ul className="header-menu-list">
          {menuItems.map((item) => (
            <li key={item.key} className="header-menu-item">
              <a
                href="#"
                className={`header-menu-link ${selectedKey === item.key ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.key);
                }}
              >
                <span className="header-menu-icon">{item.icon}</span>
                <span className="header-menu-label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AppHeader;

