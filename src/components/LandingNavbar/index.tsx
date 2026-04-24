import React from 'react';
import { Menu } from 'antd';
import { useNavigate } from 'react-router-dom';

import logoImg from '@/assets/images/logo-icon.png';
import type { LandingNavbarProps } from './index.type';
import styles from './style.module.less';

const LandingNavbar: React.FC<LandingNavbarProps> = ({ activeKey }) => {
  const navigate = useNavigate();
  const selectedKeys = activeKey !== undefined && activeKey !== '' ? [activeKey] : [];

  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <img src={logoImg} alt="WisePen" className={styles.logo} />
        <span className={styles.brandText}>WisePen</span>
      </div>
      <div className={styles.menuWrap}>
        <Menu
          mode="horizontal"
          disabledOverflow
          selectedKeys={selectedKeys}
          items={[
            {
              key: '1',
              label: '首页',
              onClick: () => navigate('/'),
            },
            {
              key: '2',
              label: '注册',
              onClick: () => navigate('/register'),
            },
            {
              key: '3',
              label: '登录',
              onClick: () => navigate('/login'),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default LandingNavbar;
