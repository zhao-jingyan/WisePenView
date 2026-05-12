import { useMount, useUnmount } from 'ahooks';
import { App as AntdApp, ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React, { Suspense, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';

import { ServicesProvider } from '@/domains';
import appTheme from '@/theme';
import { subscribeAuthChangeEvent } from '@/utils/auth/authChange';
import styles from './App.module.less';

const PageLoadingFallback: React.FC = () => (
  <div className={styles.pageLoadingFallback}>
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  const unsubscribeAuthChangeRef = useRef<(() => void) | null>(null);

  // 挂载时订阅全局认证状态变化
  useMount(() => {
    unsubscribeAuthChangeRef.current = subscribeAuthChangeEvent();
  });

  useUnmount(() => {
    unsubscribeAuthChangeRef.current?.();
    unsubscribeAuthChangeRef.current = null;
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
