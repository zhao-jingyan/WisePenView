import React from 'react';
import { Button, Result, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

import LandingNavbar from '@/components/LandingNavbar';
import styles from './style.module.less';

const ResourceNotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar />
      </div>

      <main className={styles.main}>
        <Result
          className={styles.result}
          status="404"
          title="页面不存在"
          subTitle="抱歉，您访问的链接可能已失效，或页面已被移动。请返回首页或上一页继续浏览。"
          extra={
            <Space size="middle" wrap>
              <Button type="primary" size="large" onClick={() => navigate('/')}>
                返回首页
              </Button>
              <Button size="large" onClick={() => navigate(-1)}>
                返回上一页
              </Button>
            </Space>
          }
        />
      </main>

      <footer className={styles.footerMini}>WisePen · 学术英语写作平台</footer>
    </div>
  );
};

export default ResourceNotFound;
