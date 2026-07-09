import AppSidebar from '@/layouts/_common/Sidebar/AppSidebar';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AppLayout.module.less';

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  return (
    <div className={styles.root}>
      <aside
        className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
        aria-label="应用侧边栏"
      >
        <AppSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      </aside>

      <div className={styles.middleLayout}>
        <main className={styles.middleContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
