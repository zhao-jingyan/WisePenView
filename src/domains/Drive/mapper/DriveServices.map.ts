import { resolveResourceIconType, type ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import type {
  DriveNode,
  DriveNodeScope,
  FolderNode,
  LinkNode,
  ResourceNode,
  RootNode,
} from '../entity/drive';

export const DRIVE_ROOT_ID = 'drive-root';
const DRIVE_GROUP_ROOT_PREFIX = 'drive-root:group:';

type EncodedNodeKind = 'folder' | 'resource' | 'link' | 'loading';

export type DecodedNodeId =
  | { kind: 'root'; groupId?: string }
  | { kind: 'folder'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'loading'; parentNodeId: string }
  | { kind: 'unknown'; raw: string };

const getFolderName = (tagName: string): string => {
  if (tagName === '/') return '根目录';
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
};

export const encodeNodeId = (kind: EncodedNodeKind, ...parts: string[]): string => {
  return [kind, ...parts].join(':');
};

export const encodeRootNodeId = (groupId?: string): string => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  return normalizedGroupId ? `${DRIVE_GROUP_ROOT_PREFIX}${normalizedGroupId}` : DRIVE_ROOT_ID;
};

export const buildDriveNodeScope = (groupId?: string): DriveNodeScope => {
  const normalizedGroupId = normalizeTagGroupId(groupId);
  const rootId = encodeRootNodeId(normalizedGroupId);
  if (normalizedGroupId) {
    return {
      type: 'group',
      rootId,
      groupId: normalizedGroupId,
    };
  }
  return {
    type: 'personal',
    rootId,
  };
};

export const decodeNodeId = (id: string): DecodedNodeId => {
  if (id === DRIVE_ROOT_ID) return { kind: 'root' };
  if (id.startsWith(DRIVE_GROUP_ROOT_PREFIX)) {
    const groupId = id.slice(DRIVE_GROUP_ROOT_PREFIX.length);
    if (groupId) return { kind: 'root', groupId };
  }
  const [kind, ...parts] = id.split(':');
  if (kind === 'folder' && parts[0]) return { kind: 'folder', tagId: parts[0] };
  if (kind === 'resource' && parts[0] && parts[1]) {
    return { kind: 'resource', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'link' && parts[0] && parts[1]) {
    return { kind: 'link', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'loading' && parts[0]) return { kind: 'loading', parentNodeId: parts[0] };
  return { kind: 'unknown', raw: id };
};

export const decodeRootNodeScope = (rootId?: string, fallbackGroupId?: string): DriveNodeScope => {
  if (!rootId) return buildDriveNodeScope(fallbackGroupId);
  const decoded = decodeNodeId(rootId);
  const groupId = decoded.kind === 'root' ? (decoded.groupId ?? fallbackGroupId) : fallbackGroupId;
  return buildDriveNodeScope(groupId);
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
    description: tag.tagDesc,
    childrenIds: [],
  };
};

export const mapResourceItemToChildNode = (
  item: ResourceItem,
  parentTagId: string,
  parentNodeId: string,
  scope: DriveNodeScope
): ResourceNode | LinkNode => {
  const common = {
    parentId: parentNodeId,
    scope,
    resourceId: item.resourceId,
    title: item.resourceName,
    resourceType: item.resourceType,
    description: item.preview,
    resourceIconType:
      item.resourceIconType ??
      resolveResourceIconType({
        resourceType: item.resourceType,
        resourceName: item.resourceName,
      }),
    folderTagId: parentTagId,
  } as const;
  const isPrimaryMount = item.mainTagId == null || item.mainTagId === parentTagId;
  if (isPrimaryMount) {
    return {
      id: encodeNodeId('resource', item.resourceId, parentTagId),
      type: 'resource',
      ...common,
    };
  }
  return {
    id: encodeNodeId('link', item.resourceId, parentTagId),
    type: 'link',
    primaryTagId: item.mainTagId,
    ...common,
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
