import React, { Suspense } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import zhCN from 'antd/locale/zh_CN';

import { ServicesProvider } from '@/contexts/ServicesContext';
import appTheme from './theme';
import styles from './App.module.less';

const PageLoadingFallback: React.FC = () => (
  <div className={styles.pageLoadingFallback}>
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  return (
    <ServicesProvider>
      <ConfigProvider locale={zhCN} theme={appTheme}>
        <Suspense fallback={<PageLoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </ConfigProvider>
    </ServicesProvider>
  );
};

export default App;
