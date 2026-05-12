import type { LoadMoreRowItem, TreeRowItem } from '@/components/Drive/TreeDrive/index.type';
import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';
import type { BreadcrumbItem } from '@/store';

/** 统一树节点：文件夹视图经 adapter 展宽为 TagTreeNode，与标签树一致 */
export type TreeDriveNode = TagTreeNode;

/** adapter.getNodeContents 返回值 */
export interface NodeContentsResult {
  childNodes: TreeDriveNode[];
  files: ResourceItem[];
  totalFiles: number;
}

/** 树驱动数据适配器：统一 FolderService 与 TagService 的树操作 */
export interface ITreeDriveAdapter {
  /** 加载并缓存树结构，返回根节点 */
  loadTree(groupId?: string): Promise<TreeDriveNode>;
  /** 从缓存中按 ID 查找节点 */
  getNodeById(nodeId: string, groupId?: string): TreeDriveNode | undefined;
  /** 获取节点的子节点和文件 */
  getNodeContents(params: {
    node: TreeDriveNode;
    filePage?: number;
    filePageSize?: number;
  }): Promise<NodeContentsResult>;
}

export interface UseTreeDriveParams {
  adapter: ITreeDriveAdapter;
  groupId?: string;
  /**
   * 面包屑 store 的视图级隔离 key（如 folder / tag）。
   * 实际持久化 key 会与 groupId 组合：无 groupId 时为个人空间（user），有则为该组独立缓存。
   */
  cwdStoreKey?: string;
}

export interface UseTreeDriveReturn {
  treeData: TreeRowItem[];
  loading: boolean;
  expandedKeys: string[];
  breadcrumb: BreadcrumbItem[];
  loadingMoreKeys: ReadonlySet<string>;
  refresh: () => void;
  handleExpandChange: (expanded: boolean, record: TreeRowItem) => void;
  handleTreeNodeClick: (node: TreeDriveNode) => void;
  handleLoadMore: (record: LoadMoreRowItem) => void;
  resetCwd: () => void;
  navigateToIndex: (index: number) => void;
}
