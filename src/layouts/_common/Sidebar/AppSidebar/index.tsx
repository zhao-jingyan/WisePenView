import clsx from 'clsx';
import { memo } from 'react';
import SidebarHeader from '../_common/SidebarHeader';
import UserProfile from '../_common/UserProfile';
import styles from '../_common/sidebarShell.module.less';
import AppHeaderNav from './AppHeaderNav';
import AppSessionMenu from './AppSessionMenu';
import type { AppSidebarProps } from './index.type';

function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={onToggle}
        nav={<AppHeaderNav collapsed={collapsed} />}
      />
      <AppSessionMenu collapsed={collapsed} />
      <UserProfile collapsed={collapsed} />
    </div>
  );
}

export default memo(AppSidebar);
