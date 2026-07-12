import type { DriveNodeScope } from '@/domains/Drive';

export interface GlobalSearchBoxProps {
  /** 允许父组件传入外层样式类名 */
  className?: string;
  scope: DriveNodeScope;
}
