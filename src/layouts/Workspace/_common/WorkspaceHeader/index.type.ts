import type { ReactNode } from 'react';

export interface WorkspaceHeaderProps {
  /** 工具条中间区：如 PDF 图标 + 文件名 */
  inlineTitle?: ReactNode;
  /** 右侧操作区（分享等） */
  extra?: ReactNode;
  /** 工具条下方整块区域，如笔记可编辑标题 */
  titleBlock?: ReactNode;
  leftSidebarCollapsed?: boolean;
  rightSidebarCollapsed?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  className?: string;
}
