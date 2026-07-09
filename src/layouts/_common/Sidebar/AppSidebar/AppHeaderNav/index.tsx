import { clearNewChatSessionStore, useCurrentChatSessionStore } from '@/store';
import { ListBox, ListBoxItem } from '@heroui/react';
import clsx from 'clsx';
import { FileText, MessageSquarePlus, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed }: AppHeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);

  const isDriveActive =
    location.pathname.startsWith('/app/drive') ||
    location.pathname.startsWith('/app/workspace') ||
    location.pathname.startsWith('/app/skill');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const isChatActive = location.pathname.startsWith('/app/chat');
  const selectedKeys =
    isChatActive && !currentSessionId
      ? ['/app/chat']
      : isDriveActive
        ? ['/app/drive']
        : isGroupActive
          ? ['/app/my-group']
          : [];
  const handleNewChat = () => {
    clearCurrentSession();
    clearNewChatSessionStore();
    navigate('/app/chat');
  };

  return (
    <ListBox
      aria-label="应用导航"
      selectionMode="single"
      selectedKeys={selectedKeys}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      <ListBoxItem
        id="/app/chat"
        textValue="新建对话"
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={handleNewChat}
      >
        <span className={styles.menuIcon}>
          <MessageSquarePlus size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>新建对话</span>}
      </ListBoxItem>
      <ListBoxItem
        id="/app/drive"
        textValue="文档与云盘"
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={() => navigate('/app/drive')}
      >
        <span className={styles.menuIcon}>
          <FileText size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>文档与云盘</span>}
      </ListBoxItem>
      <ListBoxItem
        id="/app/my-group"
        textValue="我的小组"
        className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
        onPress={() => navigate('/app/my-group')}
      >
        <span className={styles.menuIcon}>
          <Users size={18} />
        </span>
        {!collapsed && <span className={styles.menuLabel}>我的小组</span>}
      </ListBoxItem>
    </ListBox>
  );
}

export default AppHeaderNav;
