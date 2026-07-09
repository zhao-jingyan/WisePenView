import { useCurrentChatSessionStore } from '@/store';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SessionListGroup from '../SessionListGroup';
import type { AppSessionMenuProps } from './index.type';
import styles from './style.module.less';

function AppSessionMenu({ collapsed }: AppSessionMenuProps) {
  const location = useLocation();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);

  const selectedKeys = useMemo(() => {
    if (currentSessionId) {
      return [`session-${currentSessionId}`];
    }
    return [location.pathname];
  }, [currentSessionId, location.pathname]);

  return (
    <div
      className={clsx(styles.menuContainer, collapsed && styles.menuContainerCollapsed)}
      aria-hidden={collapsed}
    >
      <SessionListGroup selectedKeys={selectedKeys} />
    </div>
  );
}

AppSessionMenu.displayName = 'AppSessionMenu';

export default AppSessionMenu;
