import type { DriveNode, DriveNodeType } from '../entity/drive';

export interface IDriveService {
  getDriveTree(params: GetDriveTreeParams): Promise<DriveNode>;
  loadNodeChildren(params: LoadNodeChildrenParams): Promise<DriveNode[]>;
  loadMore(params: LoadMoreParams): Promise<DriveNode[]>;
  getPathById(params: GetPathByIdParams): Promise<DriveNode[]>;
  moveNode(params: MoveNodeParams): Promise<void>;
  removeNode(params: RemoveNodeParams): Promise<void>;
  renameNode(params: RenameNodeParams): Promise<void>;
  createNode(params: CreateNodeParams): Promise<void>;
}

export interface GetDriveTreeParams {
  groupId?: string;
  rootId: string;
}

export interface LoadNodeChildrenParams {
  nodeId: string;
  groupId?: string;
}

export interface LoadMoreParams {
  parentNodeId: string;
  groupId?: string;
}

export interface GetPathByIdParams {
  nodeId: string;
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

export interface CreateNodeParams {
  parentId: string;
  name: string;
  type: DriveNodeType;
  groupId?: string;
}

/** Service 工厂选项：默认 pageSize = 50 */
export interface CreateDriveServiceOptions {
  pageSize?: number;
}
