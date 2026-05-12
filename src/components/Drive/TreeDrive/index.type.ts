import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';

/** TreeDrive 视图模式：文件夹树（path tag） / 标签树（全量 tag） */
export type TreeDriveMode = 'folder' | 'tag';

/** 「加载更多」占位行，记录下一页元数据 */
export interface LoadMoreRowItem {
  key: string;
  _type: 'loadMore';
  parentKey: string;
  nextPage: number;
  /** 分页加载上下文节点（文件夹树与标签树均为 TagTreeNode） */
  treeNode: TagTreeNode;
  totalFiles: number;
  loadedFiles: number;
}

/** 树形表格行：树节点可递归包含 children */
export type TreeRowItem =
  | { key: string; _type: 'folder'; data: TagTreeNode; children?: TreeRowItem[] }
  | { key: string; _type: 'file'; data: ResourceItem }
  | LoadMoreRowItem;

export interface TreeDriveProps {
  /** 视图模式：folder 为路径文件夹树，tag 为标签树。默认 folder */
  mode?: TreeDriveMode;
  /** tag 模式下「管理标签」操作的小组上下文；个人云盘不传 */
  groupId?: string;
  /** 只读：隐藏新建与行内操作；文件夹树同时禁用拖拽移动 */
  readOnlyMode?: boolean;
}
