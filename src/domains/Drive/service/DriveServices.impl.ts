import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import type { DriveNode, FolderNode, LinkNode, ResourceNode, RootNode } from '@/domains/Drive';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { useTrashTagStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import {
  buildDriveNodeScope,
  buildDriveRootNode,
  decodeNodeId,
  decodeRootNodeScope,
  DRIVE_ROOT_ID,
  encodeNodeId,
  encodeRootNodeId,
  isContainerNode,
  mapResourceItemToChildNode,
  mapTagToFolderNode,
} from '../mapper/DriveServices.map';
import type { CreateDriveServiceOptions, IDriveService } from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
const DEFAULT_PAGE_SIZE = 50;
const TRASH_TAG_NAME = '.Trash';
const HIDDEN_TAG_PREFIX = '.';

export interface DriveServicesDeps {
  tagService: ITagService;
  resourceService: IResourceService;
}

const isVisibleFolderTag = (node: TagTreeNode): boolean => {
  const name = (node.tagName ?? '').trim();
  if (name === TRASH_TAG_NAME) return false;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

const findTrashTag = (roots: TagTreeNode[]): TagTreeNode | undefined => {
  return roots.find((node) => node.tagName === TRASH_TAG_NAME);
};

const resolveGroupKey = (groupId?: string): string => {
  return normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
};

const resolveGroupIdFromKey = (groupKey: string): string | undefined => {
  return groupKey === CACHE_KEY_DEFAULT ? undefined : groupKey;
};

const isResourceNode = (node: DriveNode): node is ResourceNode | LinkNode => {
  return node.type === 'resource' || node.type === 'link';
};

export const createDriveServices = (
  deps: DriveServicesDeps,
  opts?: CreateDriveServiceOptions
): IDriveService => {
  const { tagService, resourceService } = deps;
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;

  const nodeMap = new Map<string, DriveNode>();
  const nodeGroupKeyMap = new Map<string, string>();
  const resourceItemByNodeId = new Map<string, ResourceItem>();
  const personalRootTagIdByGroup = new Map<string, string>();

  const clearCache = (): void => {
    nodeMap.clear();
    nodeGroupKeyMap.clear();
    resourceItemByNodeId.clear();
    personalRootTagIdByGroup.clear();
  };

  registerServiceCacheCleaner(clearCache);

  const trackNode = (node: DriveNode, groupKey: string): void => {
    nodeMap.set(node.id, node);
    nodeGroupKeyMap.set(node.id, groupKey);
  };

  const trackNodes = (nodes: DriveNode[], groupKey: string): void => {
    nodes.forEach((node) => trackNode(node, groupKey));
  };

  const readRawRoots = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalized = normalizeTagGroupId(groupId);
    const roots = await tagService.getRawTagTree(normalized);
    const trashTag = findTrashTag(roots);
    useTrashTagStore.getState().setTrashTagId(normalized, trashTag?.tagId);
    return roots;
  };

  const getPersonalRootTag = async (groupId?: string): Promise<TagTreeNode> => {
    const groupKey = resolveGroupKey(groupId);
    const cachedRootTagId = personalRootTagIdByGroup.get(groupKey);
    if (cachedRootTagId) {
      const existing = tagService.getRawTagById(cachedRootTagId, resolveGroupIdFromKey(groupKey));
      if (existing) return existing;
    }

    const roots = await readRawRoots(groupId);
    const rootTag = roots.find((item) => item.tagName === '/');
    if (!rootTag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_PERSONAL_ROOT_NOT_FOUND);
    }
    personalRootTagIdByGroup.set(groupKey, rootTag.tagId);
    return rootTag;
  };

  const getRootNode: IDriveService['getRootNode'] = async (params) => {
    const requestedScope = decodeRootNodeScope(
      params?.rootId,
      normalizeTagGroupId(params?.groupId)
    );
    const requestedGroupId =
      requestedScope.type === 'group' ? normalizeTagGroupId(requestedScope.groupId) : undefined;
    const groupKey = resolveGroupKey(requestedGroupId);
    const normalizedGroupId = resolveGroupIdFromKey(groupKey);
    const personalRootTag = normalizedGroupId ? undefined : await getPersonalRootTag();
    const rootNode = buildDriveRootNode({ groupId: normalizedGroupId, personalRootTag });
    trackNode(rootNode, groupKey);
    return rootNode;
  };

  const getNodeGroupId = (nodeId: string): string | undefined => {
    const node = nodeMap.get(nodeId);
    if (node?.scope.type === 'group') return normalizeTagGroupId(node.scope.groupId);
    const groupKey = nodeGroupKeyMap.get(nodeId);
    if (groupKey) return resolveGroupIdFromKey(groupKey);
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') return normalizeTagGroupId(decoded.groupId);
    return undefined;
  };

  const resolveEffectiveGroupId = (nodeId: string, groupId?: string): string | undefined =>
    normalizeTagGroupId(groupId) ?? getNodeGroupId(nodeId);

  const getNodeOrThrow = (nodeId: string): DriveNode => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    return node;
  };

  const isDescendantTag = (tagId: string, ancestorTagId: string, groupId?: string): boolean => {
    let current = tagService.getRawTagById(tagId, groupId);
    while (current) {
      if (current.tagId === ancestorTagId) return true;
      if (!current.parentId) return false;
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    return false;
  };

  const resolveParentTagId = async (
    nodeId: string,
    groupId?: string
  ): Promise<{ parentTagId?: string; isVirtualRoot: boolean }> => {
    const decoded = decodeNodeId(nodeId);
    const effectiveGroupId =
      decoded.kind === 'root'
        ? (normalizeTagGroupId(decoded.groupId) ?? normalizeTagGroupId(groupId))
        : resolveEffectiveGroupId(nodeId, groupId);
    if (decoded.kind === 'root') {
      if (effectiveGroupId) return { parentTagId: undefined, isVirtualRoot: true };
      const personalRootTag = await getPersonalRootTag();
      return { parentTagId: personalRootTag.tagId, isVirtualRoot: false };
    }
    if (decoded.kind === 'folder') return { parentTagId: decoded.tagId, isVirtualRoot: false };
    return { parentTagId: undefined, isVirtualRoot: false };
  };

  const loadFolderNodes = async (nodeId: string, groupId?: string): Promise<FolderNode[]> => {
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') {
      const normalizedGroupId =
        normalizeTagGroupId(decoded.groupId) ?? normalizeTagGroupId(groupId);
      const rootNodeId = encodeRootNodeId(normalizedGroupId);
      const scope = buildDriveNodeScope(normalizedGroupId);
      if (normalizedGroupId) {
        const roots = await readRawRoots(normalizedGroupId);
        return roots
          .filter(isVisibleFolderTag)
          .map((tag) => mapTagToFolderNode(tag, rootNodeId, scope));
      }
      const personalRoot = await getPersonalRootTag();
      const children = personalRoot.children ?? [];
      return children
        .filter(isVisibleFolderTag)
        .map((tag) => mapTagToFolderNode(tag, rootNodeId, scope));
    }

    if (decoded.kind !== 'folder') return [];
    const normalizedGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const scope = buildDriveNodeScope(normalizedGroupId);
    await readRawRoots(normalizedGroupId);
    const tag = tagService.getRawTagById(decoded.tagId, normalizedGroupId);
    const children = tag?.children ?? [];
    return children
      .filter(isVisibleFolderTag)
      .map((child) => mapTagToFolderNode(child, encodeNodeId('folder', decoded.tagId), scope));
  };

  const fetchAllResourceNodes = async (
    nodeId: string,
    groupId: string | undefined
  ): Promise<Array<ResourceNode | LinkNode>> => {
    const { parentTagId, isVirtualRoot } = await resolveParentTagId(nodeId, groupId);
    if (!parentTagId || isVirtualRoot) {
      return [];
    }

    const normalizedGroupId = normalizeTagGroupId(groupId);
    const scope = buildDriveNodeScope(normalizedGroupId);
    const nodes: Array<ResourceNode | LinkNode> = [];
    let page = 1;

    while (true) {
      const listParams = {
        page,
        size: pageSize,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
        tagIds: [parentTagId],
        tagQueryLogicMode: 'AND' as const,
      };
      const result = normalizedGroupId
        ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
        : await resourceService.getUserResources(listParams);

      for (const item of result.list) {
        const childNode = mapResourceItemToChildNode(item, parentTagId, nodeId, scope);
        resourceItemByNodeId.set(childNode.id, item);
        nodes.push(childNode);
      }

      const reachedKnownTotal = result.total > 0 && nodes.length >= result.total;
      const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
      const reachedShortPage = result.list.length < pageSize;
      if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) {
        break;
      }
      page += 1;
    }

    return nodes;
  };

  const updateParentChildren = (parentId: string, children: DriveNode[]): void => {
    const parent = nodeMap.get(parentId);
    if (!parent || !isContainerNode(parent)) return;
    parent.childrenIds = children.filter((node) => node.type !== 'loading').map((node) => node.id);
    nodeMap.set(parentId, parent);
  };

  const listNodeChildren: IDriveService['listNodeChildren'] = async ({ nodeId, groupId }) => {
    const effectiveGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const groupKey = resolveGroupKey(effectiveGroupId);
    const folderNodes = await loadFolderNodes(nodeId, effectiveGroupId);
    const resourceNodes = await fetchAllResourceNodes(nodeId, effectiveGroupId);
    const dedup = new Map<string, DriveNode>();
    [...folderNodes, ...resourceNodes].forEach((node) => dedup.set(node.id, node));
    const children = [...dedup.values()];

    trackNodes(children, groupKey);
    updateParentChildren(nodeId, children);
    return children;
  };

  const ensureTrashTagId = async (groupId?: string): Promise<string> => {
    let trashTagId = useTrashTagStore.getState().getTrashTagId(groupId);
    if (trashTagId) return trashTagId;
    await readRawRoots(groupId);
    trashTagId = useTrashTagStore.getState().getTrashTagId(groupId);
    if (!trashTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TRASH_TAG_NOT_FOUND);
    }
    return trashTagId;
  };

  const buildPathByFolderTag = async (
    tagId: string,
    groupId?: string
  ): Promise<Array<RootNode | FolderNode>> => {
    await readRawRoots(groupId);
    const groupKey = resolveGroupKey(groupId);
    const root = await getRootNode({ groupId });
    const path: Array<RootNode | FolderNode> = [root];
    const chain: TagTreeNode[] = [];
    let current = tagService.getRawTagById(tagId, groupId);
    while (current) {
      if (
        !resolveGroupIdFromKey(groupKey) &&
        current.tagId === personalRootTagIdByGroup.get(groupKey)
      ) {
        break;
      }
      chain.unshift(current);
      if (!current.parentId) break;
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    let parentId: string = root.id;
    chain.forEach((tag) => {
      const node = mapTagToFolderNode(tag, parentId, root.scope);
      parentId = node.id;
      trackNode(node, groupKey);
      path.push(node);
    });
    return path;
  };

  const resolveResourceTagIds = (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    targetTagId: string
  ): string[] => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    const currentTags = sourceItem.currentTags ?? {};
    if (source.type === 'link') {
      const primaryTagId = source.primaryTagId;
      if (!primaryTagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
      }
      if (targetTagId === primaryTagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_MOVE_TO_PRIMARY_TAG);
      }
      const linkTagIds = Object.keys(currentTags).filter(
        (tagId) => tagId !== primaryTagId && tagId !== source.folderTagId && tagId !== targetTagId
      );

      // link 移动只替换辅助 tag，主 tag 仍保持在首位。
      return [primaryTagId, ...linkTagIds, targetTagId];
    }

    const linkTagIds = Object.keys(currentTags).filter(
      (tagId) => tagId !== source.folderTagId && tagId !== targetTagId
    );

    // resource 移动替换主 tag，其余辅助 tag 保持不变。
    return [targetTagId, ...linkTagIds];
  };

  const moveResourceNode = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    targetTagId: string,
    groupId?: string
  ): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: resolveResourceTagIds(source, targetTagId),
      groupId,
    });
  };

  const resolveGroupResourceUnmountTagIds = (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>
  ): string[] => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    if (source.type === 'resource') {
      // 小组主挂载删除会移除该资源在当前小组下的全部挂载关系。
      return [];
    }

    const primaryTagId = source.primaryTagId;
    if (!primaryTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }
    const currentTags = sourceItem.currentTags ?? {};
    const linkTagIds = Object.keys(currentTags).filter(
      (tagId) => tagId !== primaryTagId && tagId !== source.folderTagId
    );

    return [primaryTagId, ...linkTagIds];
  };

  const unmountGroupResourceNode = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    groupId: string
  ): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: resolveGroupResourceUnmountTagIds(source),
      groupId,
    });
  };

  const getNodePath: IDriveService['getNodePath'] = async ({ nodeId, groupId }) => {
    const effectiveGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') {
      return [await getRootNode({ groupId: effectiveGroupId })];
    }
    if (decoded.kind === 'folder') {
      return buildPathByFolderTag(decoded.tagId, effectiveGroupId);
    }
    if (decoded.kind === 'resource' || decoded.kind === 'link') {
      return buildPathByFolderTag(decoded.parentTagId, effectiveGroupId);
    }
    return [await getRootNode({ groupId: effectiveGroupId })];
  };

  const moveToFolder: IDriveService['moveToFolder'] = async (params) => {
    const { nodeId, targetFolderNodeId } = params;
    const source = getNodeOrThrow(nodeId);
    const target = getNodeOrThrow(targetFolderNodeId);
    const groupId =
      normalizeTagGroupId(params.groupId) ??
      getNodeGroupId(nodeId) ??
      getNodeGroupId(targetFolderNodeId);

    if (target.type !== 'folder' && target.type !== 'root') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_UNSUPPORTED_DROP);
    }
    if (source.scope.rootId !== target.scope.rootId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const targetTagId =
      target.type === 'root' ? (target.canMountResources ? target.tagId : undefined) : target.tagId;

    if (source.type === 'folder') {
      if (targetTagId && isDescendantTag(targetTagId, source.tagId, groupId)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
      }
      await tagService.moveTag({
        targetTagId: source.tagId,
        newParentId: targetTagId,
        groupId,
      });
    } else if (isResourceNode(source) && targetTagId) {
      await moveResourceNode(source, targetTagId, groupId);
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    clearCache();
  };

  const removeNode: IDriveService['removeNode'] = async (params) => {
    const { nodeId } = params;
    const source = getNodeOrThrow(nodeId);
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId);
    if (source.type === 'folder') {
      const trashTagId = await ensureTrashTagId(groupId);
      await tagService.moveTag({
        targetTagId: source.tagId,
        newParentId: trashTagId,
        groupId,
      });
    } else if (isResourceNode(source) && groupId) {
      await unmountGroupResourceNode(source, groupId);
    } else if (isResourceNode(source)) {
      const trashTagId = await ensureTrashTagId();
      await moveResourceNode(source, trashTagId, groupId);
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    clearCache();
  };

  const renameNode: IDriveService['renameNode'] = async (params) => {
    const { nodeId, newName } = params;
    const source = getNodeOrThrow(nodeId);
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId);
    if (source.type === 'folder') {
      await tagService.updateTag({
        targetTagId: source.tagId,
        tagName: `/${newName}`,
        groupId,
      });
      clearCache();
      return;
    }
    if (source.type === 'resource') {
      await resourceService.renameResource({
        resourceId: source.resourceId,
        newName,
      });
      clearCache();
      return;
    }
    if (source.type === 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_UNSUPPORTED_RENAME);
    }
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
  };

  const createFolder: IDriveService['createFolder'] = async (params) => {
    const { parentId, name } = params;
    const groupId = resolveEffectiveGroupId(parentId, params.groupId);
    const decodedParent = decodeNodeId(parentId);
    let targetParentTagId: string | undefined;
    if (decodedParent.kind === 'root') {
      const rootNode = nodeMap.get(parentId);
      targetParentTagId =
        rootNode?.type === 'root' && rootNode.canMountResources
          ? rootNode.tagId
          : groupId
            ? undefined
            : (await getPersonalRootTag()).tagId;
    } else if (decodedParent.kind === 'folder') {
      targetParentTagId = decodedParent.tagId;
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_CREATE_FOLDER_ONLY);
    }
    const tagId = await tagService.addTag({
      groupId,
      parentId: targetParentTagId,
      tagName: `/${name}`,
    });
    clearCache();
    return tagId;
  };

  return {
    getRootNode,
    listNodeChildren,
    getNodePath,
    moveToFolder,
    removeNode,
    renameNode,
    createFolder,
    getDriveTree: async ({ rootId, groupId }) => {
      const decodedRoot = decodeNodeId(rootId);
      const normalizedGroupId =
        normalizeTagGroupId(groupId) ??
        (decodedRoot.kind === 'root' ? normalizeTagGroupId(decodedRoot.groupId) : undefined);
      const expectedRootId = encodeRootNodeId(normalizedGroupId);
      if (rootId !== DRIVE_ROOT_ID && rootId !== expectedRootId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_UNSUPPORTED_ROOT, { rootId });
      }
      return getRootNode({ groupId: normalizedGroupId });
    },
    loadNodeChildren: listNodeChildren,
    getPathById: getNodePath,
    moveNode: ({ nodeId, newParentId, groupId }) =>
      moveToFolder({ nodeId, targetFolderNodeId: newParentId, groupId }),
    createNode: async ({ parentId, name, groupId }) => {
      await createFolder({ parentId, name, groupId });
    },
  };
};
