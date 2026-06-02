import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { useNavigateResource } from '@/hooks/useNavigateResource';

export interface UseClickNodeParams {
  /** 进入 folder / trash 等容器型节点（通常由 useTableDrive.enterFolder 提供） */
  enterFolder: (nodeId: string) => void;
  /** 点击 loadMore 行：加载下一页（通常由 useTableDrive.handleLoadMore 提供） */
  loadMore: (node: LoadMoreNode) => Promise<void>;
  /** 点击发起方所在的 Drive scope（undefined 表示个人云盘） */
  groupId?: string;
}

/**
 * DriveNode 点击行为的统一入口，按 node.type 路由：
 * - folder / trash：容器型节点，进入下一层
 * - loadMore：加载下一页
 * - resource / link：交由 navigateResource 处理跳转与 scope 写入
 */
export const useClickNode = ({ enterFolder, loadMore, groupId }: UseClickNodeParams) => {
  const navigateResource = useNavigateResource(groupId);

  return (node: DriveNode) => {
    if (node.type === 'folder' || node.type === 'trash') {
      enterFolder(node.id);
      return;
    }
    if (node.type === 'loadMore') {
      void loadMore(node);
      return;
    }
    if (!node.resourceId) return;
    navigateResource(node.resourceId, node.resourceType);
  };
};
