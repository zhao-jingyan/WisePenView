export type DriveNodeType = 'folder' | 'resource' | 'trash' | 'link' | 'loadMore';

type ResourceType = 'document' | 'note' | 'skill';

interface DriveNodeBase {
  /**此处id由service分配，用于在service中查找节点 */
  id: string;
  parentId: string | null;
}

interface FolderNode extends DriveNodeBase {
  type: 'folder';
  tagId: string;
  name: string;
  expanded: boolean;
  childrenIds: string[];
}

interface ResourceNode extends DriveNodeBase {
  type: 'resource';
  resourceId: string;
  title: string;
  resourceType: ResourceType;
}

interface TrashNode extends DriveNodeBase {
  type: 'trash';
  tagId: string;
  childrenIds: string[];
}

interface LinkNode extends DriveNodeBase {
  type: 'link';
  resourceId: string;
  title: string;
  resourceType: ResourceType;
}

/** 列表末尾「加载更多」占位节点：由 service 在 children 未拉满时自动追加 */
interface LoadMoreNode extends DriveNodeBase {
  type: 'loadMore';
  parentId: string;
  loaded: number;
  total: number;
}

export type DriveNode = FolderNode | ResourceNode | TrashNode | LinkNode | LoadMoreNode;
export type { FolderNode, LinkNode, LoadMoreNode, ResourceNode, TrashNode };
