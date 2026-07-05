import type { GetUserResourcesRequest, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import {
  encodeNodeId,
  type DriveNode,
  type DriveNodeScope,
  type FolderNode,
  type LinkNode,
  type ResourceNode,
  type RootNode,
} from '../entity/drive';
import { mapTagToFolderNode } from '../mapper/DriveServices.map';

export const DRIVE_CACHE_KEY_DEFAULT = '__default__';
export const DRIVE_DEFAULT_PAGE_SIZE = 50;

const TRASH_TAG_NAME = '.Trash';
const HIDDEN_TAG_PREFIX = '.';

export type DriveResourceLikeNode = ResourceNode | LinkNode;

export const isVisibleFolderTag = (node: TagTreeNode): boolean => {
  const name = node.tagName.trim();
  if (name === TRASH_TAG_NAME) return false;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

export const findTrashTag = (roots: TagTreeNode[]): TagTreeNode | undefined => {
  for (const node of roots) {
    if (node.tagName === TRASH_TAG_NAME) {
      return node;
    }
  }
  return undefined;
};

export const resolveGroupKey = (groupId?: string): string => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  if (normalizedGroupId) {
    return normalizedGroupId;
  }
  return DRIVE_CACHE_KEY_DEFAULT;
};

export const resolveGroupIdFromKey = (groupKey: string): string | undefined => {
  if (groupKey === DRIVE_CACHE_KEY_DEFAULT) return undefined;
  return groupKey;
};

export const isResourceNode = (node: DriveNode): node is DriveResourceLikeNode => {
  return node.type === 'resource' || node.type === 'link';
};

export const buildVisibleFolderNodes = (
  tags: TagTreeNode[],
  parentNodeId: string,
  scope: DriveNodeScope
): FolderNode[] => {
  const nodes: FolderNode[] = [];
  for (const tag of tags) {
    if (!isVisibleFolderTag(tag)) continue;
    nodes.push(mapTagToFolderNode(tag, parentNodeId, scope));
  }
  return nodes;
};

export const mergeDriveChildren = (
  folderNodes: FolderNode[],
  resourceNodes: DriveResourceLikeNode[]
): DriveNode[] => {
  const dedup = new Map<string, DriveNode>();
  for (const node of folderNodes) {
    dedup.set(node.id, node);
  }
  for (const node of resourceNodes) {
    dedup.set(node.id, node);
  }
  return Array.from(dedup.values());
};

export const getRealChildNodeIds = (children: DriveNode[]): string[] => {
  const ids: string[] = [];
  for (const node of children) {
    if (node.type === 'loading') continue;
    ids.push(node.id);
  }
  return ids;
};

export const buildFolderChildNodeId = (tagId: string): string => {
  return encodeNodeId('folder', tagId);
};

export const buildResourceListParams = (
  page: number,
  pageSize: number,
  parentTagId: string
): GetUserResourcesRequest => {
  return {
    page,
    size: pageSize,
    sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
    sortDir: RESOURCE_SORT_DIR.DESC,
    tagIds: [parentTagId],
    tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.AND,
  };
};

export const resolveTargetTagId = (target: FolderNode | RootNode): string | undefined => {
  if (target.type === 'folder') return target.tagId;
  if (target.canMountResources) return target.tagId;
  return undefined;
};

export const resolveResourceMoveTagIds = (
  source: DriveResourceLikeNode,
  sourceItem: ResourceItem | undefined,
  targetTagId: string
): string[] => {
  if (!sourceItem) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
  }

  const currentTags = sourceItem.currentTags;
  if (source.type === 'link') {
    const primaryTagId = source.primaryTagId;
    if (!primaryTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }
    if (targetTagId === primaryTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_MOVE_TO_PRIMARY_TAG);
    }

    const linkTagIds: string[] = [];
    for (const tagId of Object.keys(currentTags)) {
      if (tagId === primaryTagId) continue;
      if (tagId === source.folderTagId) continue;
      if (tagId === targetTagId) continue;
      linkTagIds.push(tagId);
    }

    const nextTagIds: string[] = [primaryTagId];
    for (const tagId of linkTagIds) {
      nextTagIds.push(tagId);
    }
    nextTagIds.push(targetTagId);
    // link 移动只替换辅助 tag，主 tag 仍保持在首位。
    return nextTagIds;
  }

  const linkTagIds: string[] = [];
  for (const tagId of Object.keys(currentTags)) {
    if (tagId === source.folderTagId) continue;
    if (tagId === targetTagId) continue;
    linkTagIds.push(tagId);
  }

  const nextTagIds: string[] = [targetTagId];
  for (const tagId of linkTagIds) {
    nextTagIds.push(tagId);
  }
  // resource 移动替换主 tag，其余辅助 tag 保持不变。
  return nextTagIds;
};

export const resolveGroupResourceUnmountTagIds = (
  source: DriveResourceLikeNode,
  sourceItem: ResourceItem | undefined
): string[] => {
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

  const linkTagIds: string[] = [];
  for (const tagId of Object.keys(sourceItem.currentTags)) {
    if (tagId === primaryTagId) continue;
    if (tagId === source.folderTagId) continue;
    linkTagIds.push(tagId);
  }

  const nextTagIds: string[] = [primaryTagId];
  for (const tagId of linkTagIds) {
    nextTagIds.push(tagId);
  }
  return nextTagIds;
};
