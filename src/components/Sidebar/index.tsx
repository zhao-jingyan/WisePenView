import UserProfile from '@/components/UserProfile';
import clsx from 'clsx';
import { useCallback, useRef } from 'react';
import type { SidebarProps } from './index.type';
import SidebarHeader from './SidebarHeader';
import SidebarMenu, { type SidebarMenuRef } from './SidebarMenu';
import styles from './style.module.less';

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const sidebarMenuRef = useRef<SidebarMenuRef>(null);

  const handleSessionCreated = useCallback((sessionId: string, sessionTitle: string) => {
    void sidebarMenuRef.current?.handleCreatedSession(sessionId, sessionTitle);
  }, []);

  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={onToggle}
        onSessionCreated={handleSessionCreated}
      />
      <SidebarMenu ref={sidebarMenuRef} collapsed={collapsed} />
      <UserProfile collapsed={collapsed} />
    </div>
  );
}

export default Sidebar;
