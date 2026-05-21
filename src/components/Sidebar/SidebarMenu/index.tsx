import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { useUpdateEffect } from 'ahooks';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { useImperativeHandle, useMemo, useState, type Ref } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionListGroup } from '../SessionListGroup';
import type { SidebarMenuProps, SidebarMenuRef } from './index.type';
import styles from './style.module.less';

function SidebarMenu({ collapsed, ref }: SidebarMenuProps & { ref?: Ref<SidebarMenuRef> }) {
  const location = useLocation();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string>();

  const { menuItems: sessionMenuItems, refresh } = useSessionListGroup({});

  const selectedKeys = useMemo(() => {
    if (currentSessionId) {
      return [`session-${currentSessionId}`];
    }
    return [location.pathname];
  }, [currentSessionId, location.pathname]);

  const menuItems = useMemo<Required<MenuProps>['items']>(() => {
    if (collapsed) {
      return [];
    }
    return [...sessionMenuItems];
  }, [collapsed, sessionMenuItems]);

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string, sessionTitle: string) => {
        setCurrentSession({ id: sessionId, title: sessionTitle });
        setChatPanelCollapsed(false);
        if (collapsed) {
          setPendingCreatedSessionId(sessionId);
          return;
        }
        await refresh();
      },
    }),
    [collapsed, refresh, setChatPanelCollapsed, setCurrentSession]
  );

  useUpdateEffect(() => {
    if (collapsed || pendingCreatedSessionId == null) return;
    void refresh();
    setPendingCreatedSessionId(undefined);
  }, [collapsed, pendingCreatedSessionId, refresh]);

  return (
    <div className={styles.menuContainer}>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={selectedKeys}
        inlineCollapsed={collapsed}
        items={menuItems}
      />
    </div>
  );
}

SidebarMenu.displayName = 'SidebarMenu';

export type { SidebarMenuRef };
export default SidebarMenu;
