import { resolveResourceIconType } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { DriveNode, FolderNode, RootNode } from '../entity/drive';
import { buildDriveNodeScope, decodeRootNodeScope } from '../mapper/DriveServices.map';
import type {
  CreateDriveServiceOptions,
  CreateFolderParams,
  GetNodePathParams,
  GetRootNodeParams,
  IDriveService,
  ListNodeChildrenParams,
  MoveNodesToFolderParams,
  MoveToFolderParams,
  RemoveNodeParams,
  RenameNodeParams,
} from '../service/index.type';
import mockdata from './mockdata.json';

const DEFAULT_PAGE_SIZE = 50;
const NETWORK_DELAY_MS = 150;
const ROOT_ID = 'drive-root';
const GROUP_ROOT_PREFIX = 'drive-root:group:';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type LegacyNode = {
  id?: string;
  type?: string;
  parentId?: string | null;
  tagId?: string;
  name?: string;
  childrenIds?: string[];
  expanded?: boolean;
  resourceId?: string;
  title?: string;
  resourceType?: string;
  primaryTagId?: string;
};

type MockJson = {
  rootId: string;
  nodes: Record<string, LegacyNode>;
};

interface MockMovePlan {
  node: DriveNode;
  newParent: RootNode | FolderNode;
  targetTagId?: string;
}

const md = mockdata as unknown as MockJson;

const isGroupRootId = (id: string): boolean => id.startsWith(GROUP_ROOT_PREFIX);

const getGroupIdFromRootId = (id: string): string | undefined =>
  isGroupRootId(id) ? id.slice(GROUP_ROOT_PREFIX.length) : undefined;

const toRootNode = (node: LegacyNode): RootNode => ({
  id: ROOT_ID,
  type: 'root',
  parentId: null,
  name: node.name ?? '个人云盘',
  scope: buildDriveNodeScope(),
  tagId: node.tagId,
  isVirtual: false,
  canMountResources: Boolean(node.tagId),
  childrenIds: node.childrenIds ?? [],
});

const normalizeNode = (node: LegacyNode): DriveNode | null => {
  if (!node.id) return null;
  if (node.id === ROOT_ID || node.type === 'root') return toRootNode(node);
  if (node.type === 'folder' && node.tagId) {
    return {
      id: node.id,
      type: 'folder',
      parentId: node.parentId ?? null,
      scope: buildDriveNodeScope(),
      tagId: node.tagId,
      name: node.name ?? '未命名文件夹',
      childrenIds: node.childrenIds ?? [],
    };
  }
  if (node.type === 'resource' && node.resourceId) {
    return {
      id: node.id,
      type: 'resource',
      parentId: node.parentId ?? null,
      scope: buildDriveNodeScope(),
      resourceId: node.resourceId,
      title: node.title ?? '未命名文件',
      resourceType: node.resourceType,
      resourceIconType: resolveResourceIconType({
        resourceType: node.resourceType,
        resourceName: node.title,
      }),
      folderTagId: node.tagId ?? node.parentId ?? '',
    };
  }
  if (node.type === 'link' && node.resourceId) {
    return {
      id: node.id,
      type: 'link',
      parentId: node.parentId ?? null,
      scope: buildDriveNodeScope(),
      resourceId: node.resourceId,
      title: node.title ?? '未命名文件',
      resourceType: node.resourceType,
      resourceIconType: resolveResourceIconType({
        resourceType: node.resourceType,
        resourceName: node.title,
      }),
      folderTagId: node.tagId ?? node.parentId ?? '',
      primaryTagId: node.primaryTagId,
    };
  }
  return null;
};

function createDriveServiceMock(opts?: CreateDriveServiceOptions): IDriveService {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  void pageSize;

  /** 内存 nodeMap：从 JSON 反序列化的副本（避免污染原始 import） */
  const nodes = new Map<string, DriveNode>();
  for (const [id, node] of Object.entries(md.nodes)) {
    const normalized = normalizeNode({ ...node, id: node.id ?? id });
    if (normalized) nodes.set(id, normalized);
  }
  if (!nodes.has(ROOT_ID)) {
    nodes.set(ROOT_ID, {
      id: ROOT_ID,
      type: 'root',
      parentId: null,
      name: '个人云盘',
      scope: buildDriveNodeScope(),
      isVirtual: false,
      canMountResources: false,
      childrenIds: [],
    });
  }
  for (const node of nodes.values()) {
    if (node.type === 'root' || node.type === 'folder') {
      node.childrenIds = node.childrenIds.filter((id) => nodes.has(id));
    }
  }

  function ensureGroupRoot(rootId: string): RootNode | undefined {
    const groupId = getGroupIdFromRootId(rootId);
    if (!groupId) return undefined;
    const existing = nodes.get(rootId);
    if (existing?.type === 'root') return existing;
    const scope = buildDriveNodeScope(groupId);
    const root: RootNode = {
      id: scope.rootId,
      type: 'root',
      parentId: null,
      name: '小组云盘',
      scope,
      isVirtual: true,
      canMountResources: false,
      childrenIds: [],
    };
    nodes.set(rootId, root);
    return root;
  }

  function getContainer(id: string): RootNode | FolderNode | undefined {
    const node = nodes.get(id) ?? ensureGroupRoot(id);
    return node && (node.type === 'root' || node.type === 'folder') ? node : undefined;
  }

  function isDescendantOf(nodeId: string, ancestorId: string): boolean {
    let cur = nodes.get(nodeId);
    while (cur?.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = nodes.get(cur.parentId);
    }
    return false;
  }

  function detachFromParent(nodeId: string): void {
    const node = nodes.get(nodeId);
    if (!node || !node.parentId) return;
    const parent = getContainer(node.parentId);
    if (!parent) return;
    parent.childrenIds = parent.childrenIds.filter((id) => id !== nodeId);
  }

  function buildPath(nodeId: string): Array<RootNode | FolderNode> {
    const path: Array<RootNode | FolderNode> = [];
    let cur: DriveNode | undefined = nodes.get(nodeId);
    if (!cur) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    if (cur.type !== 'root' && cur.type !== 'folder') {
      cur = cur.parentId ? nodes.get(cur.parentId) : undefined;
    }
    while (cur) {
      if (cur.type === 'root' || cur.type === 'folder') path.unshift(cur);
      cur = cur.parentId ? nodes.get(cur.parentId) : undefined;
    }
    return path;
  }

  const getRootNode = async (_params?: GetRootNodeParams): Promise<RootNode> => {
    await delay(NETWORK_DELAY_MS);
    const scope = decodeRootNodeScope(_params?.rootId, _params?.groupId);
    if (scope.type === 'group') {
      const root = ensureGroupRoot(scope.rootId);
      if (root) return root;
    }
    const root = nodes.get(ROOT_ID);
    if (!root || root.type !== 'root') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId: ROOT_ID });
    }
    return root;
  };

  const listNodeChildren = async (params: ListNodeChildrenParams): Promise<DriveNode[]> => {
    await delay(NETWORK_DELAY_MS);
    const parent = getContainer(params.nodeId);
    if (!parent) return [];
    return parent.childrenIds
      .map((id) => nodes.get(id))
      .filter((node): node is DriveNode => node != null && node.type !== 'loading');
  };

  const getNodePath: IDriveService['getNodePath'] = async (params: GetNodePathParams) => {
    await delay(NETWORK_DELAY_MS);
    return buildPath(params.nodeId);
  };

  function createMovePlan(params: MoveToFolderParams): MockMovePlan {
    const node = nodes.get(params.nodeId);
    const newParent = getContainer(params.targetFolderNodeId);
    if (!node || !newParent) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: node ? params.targetFolderNodeId : params.nodeId,
      });
    }
    if (node.type !== 'folder' && node.type !== 'resource' && node.type !== 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.scope.rootId !== newParent.scope.rootId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.type === 'folder' && isDescendantOf(params.targetFolderNodeId, node.id)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const targetTagId = newParent.tagId;
    if ((node.type === 'resource' || node.type === 'link') && !targetTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.type === 'link' && targetTagId && node.primaryTagId === targetTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_MOVE_TO_PRIMARY_TAG);
    }

    return { node, newParent, targetTagId };
  }

  function executeMovePlan(plan: MockMovePlan): void {
    if (plan.node.type === 'link' && plan.targetTagId) {
      plan.node.folderTagId = plan.targetTagId;
    }
    if (plan.node.type === 'resource' && plan.targetTagId) {
      plan.node.folderTagId = plan.targetTagId;
    }
    detachFromParent(plan.node.id);
    plan.node.parentId = plan.newParent.id;
    plan.newParent.childrenIds.push(plan.node.id);
  }

  const moveToFolder = async (params: MoveToFolderParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    executeMovePlan(createMovePlan(params));
  };

  const moveNodesToFolder = async (params: MoveNodesToFolderParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    const uniqueNodeIds = [...new Set(params.nodeIds)].filter(
      (nodeId) => nodeId !== params.targetFolderNodeId
    );
    const plans = uniqueNodeIds.map((nodeId) =>
      createMovePlan({
        nodeId,
        targetFolderNodeId: params.targetFolderNodeId,
        groupId: params.groupId,
      })
    );
    for (const plan of plans) {
      executeMovePlan(plan);
    }
  };

  const removeNode = async (params: RemoveNodeParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    detachFromParent(params.nodeId);
    nodes.delete(params.nodeId);
  };

  const renameNode = async (params: RenameNodeParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    const node = nodes.get(params.nodeId);
    if (!node) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: params.nodeId,
      });
    }
    if (node.type === 'folder' || node.type === 'root') {
      node.name = params.newName;
    } else if (node.type === 'resource' || node.type === 'link') {
      node.title = params.newName;
    }
  };

  const createFolder = async (params: CreateFolderParams): Promise<string> => {
    await delay(NETWORK_DELAY_MS);
    const parent = getContainer(params.parentId);
    if (!parent) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: params.parentId,
      });
    }
    const newId = `folder-mock-${Date.now()}`;
    const node: FolderNode = {
      id: newId,
      type: 'folder',
      parentId: params.parentId,
      scope: parent.scope,
      tagId: `tag-${newId}`,
      name: params.name,
      childrenIds: [],
    };
    nodes.set(newId, node);
    parent.childrenIds.push(newId);
    return node.tagId;
  };

  return {
    getRootNode,
    listNodeChildren,
    getNodePath,
    moveToFolder,
    moveNodesToFolder,
    removeNode,
    renameNode,
    createFolder,
  };
}

/** mock 模式下注入的单例 service */
export const DriveServicesMock: IDriveService = createDriveServiceMock();
