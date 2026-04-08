import type { ReactNode } from 'react';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';

export type NodeMap = Map<string, TagTreeNode>;
export type TreeNavDataMode = 'folder' | 'tag';
export type TreeNavSelectTarget = 'nodes' | 'leaves';
export type TreeNavIconMode = 'folder' | 'tag';
export type TreeNavNodeKind = 'branch' | 'file' | 'loadMore';

export interface TreeNavIconRenderContext {
  kind: TreeNavNodeKind;
  dataMode: TreeNavDataMode;
  rawNode?: TagTreeNode | ResourceItem;
}

export type TreeNavIconRenderer = (context: TreeNavIconRenderContext) => ReactNode;

export interface TreeNavProps {
  /** 数据模式：folder 为文件夹树；tag 为标签树 */
  dataMode: TreeNavDataMode;
  /** 选择目标：nodes 为选择标签/文件夹，leaves 为选择文件 */
  selectTarget: TreeNavSelectTarget;
  /** 仅 nodes 模式生效：是否允许多选节点，默认 tag=true、folder=false */
  nodesMultiSelect?: boolean;
  /** 仅 leaves 模式生效：是否允许多选文件，默认 true */
  leafMultiSelect?: boolean;
  /** 分支节点图标模式，默认与 dataMode 一致 */
  iconMode?: TreeNavIconMode;
  /** 自定义节点图标（优先级高于 iconMode） */
  renderNodeIcon?: TreeNavIconRenderer;
  /** 标签/文件夹树的作用域，不传为个人 */
  groupId?: string;
  /** 选中变化：`selectTarget === 'nodes'` 时仅 nodes 有值；`leaves` 时仅 leaves 有值（另两种 props 为空数组） */
  onChange?: (selectedNodes: TagTreeNode[], selectedLeaves: ResourceItem[]) => void;
  /** 变化时重新拉取树数据 */
  refreshTrigger?: number;
  /**
   * 仅 tag 模式：树加载完成后按 tagId 预勾选（如编辑文件标签回显）
   */
  tagInitialCheckedIds?: string[];
}
