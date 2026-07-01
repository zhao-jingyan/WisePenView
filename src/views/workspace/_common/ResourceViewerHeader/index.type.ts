import type { ReactNode } from 'react';

export interface ResourceViewerHeaderProps {
  /** 无应用内历史可退时的兜底路由，默认云盘 */
  fallbackTo?: string;
  /** 返回控件文案 */
  backLabel?: string;
  /** 工具条中间区：如 PDF 图标 + 文件名 */
  inlineTitle?: ReactNode;
  /** 右侧操作区（分享等） */
  extra?: ReactNode;
  /** 工具条下方整块区域，如笔记可编辑标题 */
  titleBlock?: ReactNode;
  className?: string;
}
