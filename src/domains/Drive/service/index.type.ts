import type { DriveNode, FolderNode, RootNode } from '../entity/drive';

export interface IDriveService {
  /**
   * 获取某个 Drive scope 的根节点。
   * - 个人盘 root 抽象为 ~/，背后绑定唯一顶层 root tag，可挂载资源。
   * - 小组 root 抽象为 group 本身，是虚拟容器，不可直接挂载资源。
   */
  getRootNode(params?: GetRootNodeParams): Promise<RootNode>;
  /** nodeId 可独立携带 scope 信息；并列展示多个 root 时不强依赖全局 groupId。 */
  listNodeChildren(params: ListNodeChildrenParams): Promise<DriveNode[]>;
  getNodePath(params: GetNodePathParams): Promise<Array<RootNode | FolderNode>>;
  moveToFolder(params: MoveToFolderParams): Promise<void>;
  removeNode(params: RemoveNodeParams): Promise<void>;
  renameNode(params: RenameNodeParams): Promise<void>;
  createFolder(params: CreateFolderParams): Promise<string>;
  /** @deprecated 请使用 getRootNode */
  getDriveTree(params: GetDriveTreeParams): Promise<DriveNode>;
  /** @deprecated 请使用 listNodeChildren */
  loadNodeChildren(params: LoadNodeChildrenParams): Promise<DriveNode[]>;
  /** @deprecated 请使用 getNodePath */
  getPathById(params: GetPathByIdParams): Promise<DriveNode[]>;
  /** @deprecated 请使用 moveToFolder */
  moveNode(params: MoveNodeParams): Promise<void>;
  /** @deprecated 请使用 createFolder */
  createNode(params: CreateNodeParams): Promise<void>;
}

export interface GetRootNodeParams {
  rootId?: string;
  groupId?: string;
}

export interface GetDriveTreeParams {
  groupId?: string;
  rootId: string;
}

export interface ListNodeChildrenParams {
  nodeId: string;
  groupId?: string;
}

export interface LoadNodeChildrenParams {
  nodeId: string;
  groupId?: string;
}

export interface GetNodePathParams {
  nodeId: string;
  groupId?: string;
}

export interface GetPathByIdParams {
  nodeId: string;
  groupId?: string;
}

export interface MoveToFolderParams {
  nodeId: string;
  targetFolderNodeId: string;
  groupId?: string;
}

export interface MoveNodeParams {
  nodeId: string;
  newParentId: string;
  groupId?: string;
}

export interface RemoveNodeParams {
  nodeId: string;
  groupId?: string;
}

export interface RenameNodeParams {
  nodeId: string;
  newName: string;
  groupId?: string;
}

export interface CreateFolderParams {
  parentId: string;
  name: string;
  groupId?: string;
}

export interface CreateNodeParams extends CreateFolderParams {
  type: 'folder';
}

/** Service 工厂选项：默认 pageSize = 50 */
export interface CreateDriveServiceOptions {
  pageSize?: number;
}
