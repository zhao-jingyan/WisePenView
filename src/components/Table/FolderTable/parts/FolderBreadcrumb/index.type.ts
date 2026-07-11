import type { ReactNode } from 'react';

export interface FolderTableBreadcrumbItem {
  id: string;
  label: string;
  isRoot?: boolean;
}

export interface FolderTableBreadcrumbProps {
  items: FolderTableBreadcrumbItem[];
  onJump: (id: string) => void;
  ariaLabel?: string;
  /** 包装单个路径项内容，用于在业务层扩展交互能力 */
  renderItem?: (
    content: ReactNode,
    item: FolderTableBreadcrumbItem,
    isCurrent: boolean
  ) => ReactNode;
}
