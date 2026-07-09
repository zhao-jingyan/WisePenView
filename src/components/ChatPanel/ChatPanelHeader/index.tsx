import { Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { History, IndentIncrease, Plus } from 'lucide-react';
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
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={onCollapsePanel}
                className={styles.headerIconButton}
                aria-label="收起聊天面板"
              >
                <IndentIncrease size={18} aria-hidden="true" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>收起聊天面板</Tooltip.Content>
          </Tooltip>
        ) : null}
        {!collapsed ? (
          <div className={styles.titleWrap}>
            <div className={styles.title}>{panelTitle}</div>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className={styles.headerRight}>
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                className={styles.headerIconButton}
                onClick={onNewChat}
                aria-label="新建对话"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>新建对话</Tooltip.Content>
          </Tooltip>
          {onToggleSessionBar ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={clsx(
                    styles.headerIconButton,
                    sessionBarOpen && styles.headerIconButtonActive
                  )}
                  onClick={onToggleSessionBar}
                  aria-label={sessionBarLabel}
                  aria-pressed={sessionBarOpen}
                >
                  <History size={18} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>{sessionBarLabel}</Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ChatPanelHeader;
