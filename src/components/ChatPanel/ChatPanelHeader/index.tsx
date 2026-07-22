import AppIconButton from '@/components/Button/AppIconButton';
import clsx from 'clsx';
import { History, PanelRightClose, Plus } from 'lucide-react';
import styles from '../style.module.less';
import type { ChatPanelHeaderProps } from './index.type';

function ChatPanelHeader({
  collapsed,
  fullWidth,
  panelTitle,
  sessionBarOpen,
  showCollapseButton,
  onCollapsePanel,
  onNewChat,
  onToggleSessionBar,
}: ChatPanelHeaderProps) {
  const sessionBarLabel = sessionBarOpen ? '关闭会话列表' : '打开会话列表';

  return (
    <div className={clsx(styles.header, collapsed && styles.collapsedHeader)}>
      <div className={styles.headerLeft}>
        {!collapsed && !fullWidth && showCollapseButton ? (
          <AppIconButton
            icon={<PanelRightClose size={18} aria-hidden="true" />}
            label="收起聊天面板"
            onPress={onCollapsePanel}
          />
        ) : null}
        {!collapsed ? (
          <div className={styles.titleWrap}>
            <div className={styles.title}>{panelTitle}</div>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className={styles.headerRight}>
          <AppIconButton
            icon={<Plus size={18} aria-hidden="true" />}
            label="新建对话"
            onPress={onNewChat}
          />
          <AppIconButton
            icon={<History size={18} aria-hidden="true" />}
            label={sessionBarLabel}
            isActive={sessionBarOpen}
            onPress={onToggleSessionBar}
          />
        </div>
      ) : null}
    </div>
  );
}

export default ChatPanelHeader;
