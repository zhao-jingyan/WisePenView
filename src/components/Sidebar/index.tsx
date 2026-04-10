import React, { useCallback, useRef } from 'react';
import clsx from 'clsx';
import styles from './style.module.less';
import SidebarHeader from './SidebarHeader';
import SidebarMenu, { type SidebarMenuRef } from './SidebarMenu';
import UserProfile from '@/components/UserProfile';
import type { SidebarProps } from './index.type';

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
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
};

export default Sidebar;
