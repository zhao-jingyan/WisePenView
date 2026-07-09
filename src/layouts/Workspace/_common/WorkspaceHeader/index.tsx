import { Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

import type { WorkspaceHeaderProps } from './index.type';
import styles from './style.module.less';

function WorkspaceHeader({
  inlineTitle,
  extra,
  titleBlock,
  leftSidebarCollapsed = false,
  rightSidebarCollapsed = true,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  className,
}: WorkspaceHeaderProps) {
  const leftSidebarLabel = leftSidebarCollapsed ? '展开左侧栏' : '折叠左侧栏';
  const rightSidebarLabel = rightSidebarCollapsed ? '展开右侧栏' : '折叠右侧栏';

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          {onToggleLeftSidebar ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={onToggleLeftSidebar}
                  aria-label={leftSidebarLabel}
                >
                  {leftSidebarCollapsed ? (
                    <PanelLeftOpen size={18} aria-hidden="true" />
                  ) : (
                    <PanelLeftClose size={18} aria-hidden="true" />
                  )}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>{leftSidebarLabel}</Tooltip.Content>
            </Tooltip>
          ) : null}
          <div className={styles.toolbarMiddle}>
            {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
          </div>
          <div className={styles.toolbarEnd}>
            {extra}
            {onToggleRightSidebar ? (
              <div className={styles.sidebarControls}>
                <Tooltip>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={onToggleRightSidebar}
                      aria-label={rightSidebarLabel}
                    >
                      {rightSidebarCollapsed ? (
                        <PanelRightOpen size={18} aria-hidden="true" />
                      ) : (
                        <PanelRightClose size={18} aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{rightSidebarLabel}</Tooltip.Content>
                </Tooltip>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
}

export default WorkspaceHeader;
