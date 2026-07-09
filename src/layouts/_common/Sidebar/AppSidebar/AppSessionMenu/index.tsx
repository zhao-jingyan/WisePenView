import { useChatSessionHistoryRefreshStore, useCurrentChatSessionStore } from '@/store';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SessionListGroup, { type SessionListGroupRef } from '../SessionListGroup';
import type { AppSessionMenuProps } from './index.type';
import styles from './style.module.less';

function AppSessionMenu({ collapsed }: AppSessionMenuProps) {
  const location = useLocation();
  const sessionListGroupRef = useRef<SessionListGroupRef>(null);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);

  const selectedKeys = useMemo(() => {
    if (currentSessionId) {
      return [`session-${currentSessionId}`];
    }
    return [location.pathname];
  }, [currentSessionId, location.pathname]);

  useUpdateEffect(() => {
    void sessionListGroupRef.current?.refresh();
  }, [refreshVersion]);

  return (
    <div
      className={clsx(styles.menuContainer, collapsed && styles.menuContainerCollapsed)}
      aria-hidden={collapsed}
    >
      <SessionListGroup ref={sessionListGroupRef} selectedKeys={selectedKeys} />
    </div>
  );
}

AppSessionMenu.displayName = 'AppSessionMenu';

export default AppSessionMenu;
