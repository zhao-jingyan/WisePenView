import { memo } from 'react';
import AppHeaderNav from '../AppSidebar/AppHeaderNav';
import SidebarHeader from '../_common/SidebarHeader';
import UserProfile from '../_common/UserProfile';
import SidebarDrive from './_components/SidebarDrive';
import type { DriveSidebarProps } from './index.type';
import styles from './style.module.less';

function DriveSidebar({ collapsed }: DriveSidebarProps) {
  return (
    <div className={styles.sider}>
      {!collapsed ? (
        <>
          <SidebarHeader collapsed={collapsed} nav={<AppHeaderNav collapsed={collapsed} />} />

          <div className={styles.body}>
            <SidebarDrive />
          </div>

          <UserProfile collapsed={collapsed} />
        </>
      ) : null}
    </div>
  );
}

export default memo(DriveSidebar);
