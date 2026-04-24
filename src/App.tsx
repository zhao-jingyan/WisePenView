import React, { Suspense, useRef } from 'react';
import { App as AntdApp, ConfigProvider, Spin } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { useMount, useUnmount } from 'ahooks';
import router from './router';
import zhCN from 'antd/locale/zh_CN';

import { ServicesProvider } from '@/contexts/ServicesContext';
import appTheme from './theme';
import styles from './App.module.less';
import { clearAllServiceCaches } from '@/services/cacheRegistry';
import { clearAllZustandStores } from '@/store';
import { subscribeAuthSyncEvent } from '@/utils/authSync';

const PageLoadingFallback: React.FC = () => (
  <div className={styles.pageLoadingFallback}>
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  const unsubscribeAuthSyncRef = useRef<(() => void) | null>(null);

  // 挂载时，订阅全局登录状态，传入回调函数，在回调函数中清除所有服务缓存和状态，并重定向到登录页
  useMount(() => {
    unsubscribeAuthSyncRef.current = subscribeAuthSyncEvent(() => {
      clearAllServiceCaches();
      clearAllZustandStores();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
  });

  useUnmount(() => {
    unsubscribeAuthSyncRef.current?.();
    unsubscribeAuthSyncRef.current = null;
  });

  return (
    <ServicesProvider>
      <ConfigProvider locale={zhCN} theme={appTheme}>
        <AntdApp>
          <Suspense fallback={<PageLoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </AntdApp>
      </ConfigProvider>
    </ServicesProvider>
  );
};

export default App;
