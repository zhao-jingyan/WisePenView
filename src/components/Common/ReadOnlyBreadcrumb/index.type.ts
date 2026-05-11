import type { TagTreeNode } from '@/domains/Tag/service/index.type';

export interface ReadOnlyBreadcrumbProps {
  /** 当前活跃节点，为 null 时不渲染 */
  node: TagTreeNode | null;
  /** 视图模式：folder 用 / 分隔，tag 用 > 分隔 */
  mode: 'folder' | 'tag';
  /** 标签/文件夹树的作用域 */
  groupId?: string;
}
