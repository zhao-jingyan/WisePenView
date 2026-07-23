import clsx from 'clsx';
import { memo } from 'react';
import SidebarHeader from '../_common/SidebarHeader';
import UserProfile from '../_common/UserProfile';
import styles from '../_common/sidebarShell.module.less';
import AppHeaderNav from './AppHeaderNav';
import AppSidebarTabs from './AppSidebarTabs';
import type { AppSidebarProps } from './index.type';

function AppSidebar({
  collapsed,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onToggle,
}: AppSidebarProps) {
  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      <SidebarHeader
        collapsed={collapsed}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        nav={<AppHeaderNav collapsed={collapsed} />}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onToggle={onToggle}
      />
      <AppSidebarTabs collapsed={collapsed} />
      <UserProfile collapsed={collapsed} />
    </div>
  );
}

export default memo(AppSidebar);
