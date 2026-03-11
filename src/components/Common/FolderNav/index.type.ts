import type { ResourceItem } from '@/types/resource';
import type { TagTreeNode } from '@/services/Tag/index.type';

export interface FolderNavProps {
  /** 选中节点时回调：文件或文件夹 */
  onSelect?: (
    item: { type: 'file'; data: ResourceItem } | { type: 'folder'; data: TagTreeNode }
  ) => void;
  /** 是否显示「新建文件夹」按钮，默认 true */
  showNewFolderButton?: boolean;
  /** 根路径，默认 '/' */
  rootPath?: string;
  /** 外部 class */
  className?: string;
}
