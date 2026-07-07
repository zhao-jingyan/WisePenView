import { Spin } from '@/components/Feedback';
import { useUserService } from '@/domains';
import { useMount } from 'ahooks';
import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import styles from './AppRouteGuard.module.less';

type GuardStatus = 'checking' | 'allowed' | 'denied';

function AppRouteGuard() {
  const userService = useUserService();
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('checking');

  useMount(() => {
    void (async () => {
      try {
        await userService.getUserInfo({ forceRefresh: true });
        setStatus('allowed');
      } catch {
        setStatus('denied');
      }
    })();
  });

  if (status === 'checking') {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default AppRouteGuard;
