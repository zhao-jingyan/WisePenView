import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './style.module.less';

const Home: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.portal}>
      <h1>WisePen Portal</h1>
      <Button type="primary" onClick={() => navigate('/login')}>
        去登录
      </Button>
    </div>
  );
};
export default Home;
