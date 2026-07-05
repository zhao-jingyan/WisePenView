import { resolveResourceIconType, type ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import {
  buildDriveNodeScope,
  encodeNodeId,
  type DriveNode,
  type DriveNodeScope,
  type FolderNode,
  type LinkNode,
  type ResourceNode,
  type RootNode,
} from '../entity/drive';

const getFolderName = (tagName: string): string => {
  if (tagName === '/') return '根目录';
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
};

export const mapTagToFolderNode = (
  tag: TagTreeNode,
  parentNodeId: string | null,
  scope: DriveNodeScope
): FolderNode => {
  return {
    id: encodeNodeId('folder', tag.tagId),
    type: 'folder',
    parentId: parentNodeId,
    scope,
    tagId: tag.tagId,
    name: getFolderName(tag.tagName),
    childrenIds: [],
  };
};

export const mapResourceItemToChildNode = (
  item: ResourceItem,
  parentTagId: string,
  parentNodeId: string,
  scope: DriveNodeScope
): ResourceNode | LinkNode => {
  const resourceIconType =
    item.resourceIconType ??
    resolveResourceIconType({
      resourceType: item.resourceType,
      resourceName: item.resourceName,
    });
  const isPrimaryMount = item.mainTagId == null || item.mainTagId === parentTagId;
  if (isPrimaryMount) {
    return {
      id: encodeNodeId('resource', item.resourceId, parentTagId),
      type: 'resource',
      parentId: parentNodeId,
      scope,
      resourceId: item.resourceId,
      title: item.resourceName,
      resourceType: item.resourceType,
      resourceIconType,
      folderTagId: parentTagId,
    };
  }
  return {
    id: encodeNodeId('link', item.resourceId, parentTagId),
    type: 'link',
    primaryTagId: item.mainTagId,
    parentId: parentNodeId,
    scope,
    resourceId: item.resourceId,
    title: item.resourceName,
    resourceType: item.resourceType,
    resourceIconType,
    folderTagId: parentTagId,
  };
};

export const buildLoadingNode = (
  parentNodeId: string,
  label?: string,
  scope: DriveNodeScope = buildDriveNodeScope()
): DriveNode => {
  return {
    id: encodeNodeId('loading', parentNodeId),
    type: 'loading',
    parentId: parentNodeId,
    scope,
    label,
  };
};

export const buildDriveRootNode = (params: {
  groupId?: string;
  personalRootTag?: TagTreeNode;
}): RootNode => {
  const isGroupRoot = Boolean(params.groupId);
  const scope = buildDriveNodeScope(params.groupId);
  return {
    id: scope.rootId,
    type: 'root',
    parentId: null,
    scope,
    tagId: params.personalRootTag?.tagId,
    isVirtual: isGroupRoot,
    canMountResources: !isGroupRoot && Boolean(params.personalRootTag?.tagId),
    name: isGroupRoot ? '小组云盘' : '个人云盘',
    childrenIds: [],
  };
};

export const isContainerNode = (node: DriveNode): node is RootNode | FolderNode => {
  return node.type === 'root' || node.type === 'folder';
};
