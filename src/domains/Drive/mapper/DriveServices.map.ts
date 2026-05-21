import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import type {
  DriveNode,
  FolderNode,
  LinkNode,
  LoadMoreNode,
  ResourceNode,
  TrashNode,
} from '../entity/drive';

export const DRIVE_ROOT_ID = 'drive-root';

type EncodedNodeKind = 'folder' | 'trash' | 'resource' | 'link' | 'loadMore';

export type DecodedNodeId =
  | { kind: 'root' }
  | { kind: 'folder'; tagId: string }
  | { kind: 'trash'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'loadMore'; parentNodeId: string }
  | { kind: 'unknown'; raw: string };

const getFolderName = (tagName: string): string => {
  if (tagName === '/') return '根目录';
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
};

const normalizeResourceType = (resourceType?: string): 'document' | 'note' | 'skill' => {
  const value = (resourceType ?? '').toLowerCase();
  if (value.includes('note')) return 'note';
  if (value.includes('skill')) return 'skill';
  return 'document';
};

export const encodeNodeId = (kind: EncodedNodeKind, ...parts: string[]): string => {
  return [kind, ...parts].join(':');
};

export const decodeNodeId = (id: string): DecodedNodeId => {
  if (id === DRIVE_ROOT_ID) return { kind: 'root' };
  const [kind, ...parts] = id.split(':');
  if (kind === 'folder' && parts[0]) return { kind: 'folder', tagId: parts[0] };
  if (kind === 'trash' && parts[0]) return { kind: 'trash', tagId: parts[0] };
  if (kind === 'resource' && parts[0] && parts[1]) {
    return { kind: 'resource', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'link' && parts[0] && parts[1]) {
    return { kind: 'link', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'loadMore' && parts[0]) return { kind: 'loadMore', parentNodeId: parts[0] };
  return { kind: 'unknown', raw: id };
};

export const mapTagToFolderNode = (tag: TagTreeNode, parentNodeId: string | null): FolderNode => {
  return {
    id: encodeNodeId('folder', tag.tagId),
    type: 'folder',
    parentId: parentNodeId,
    tagId: tag.tagId,
    name: getFolderName(tag.tagName),
    expanded: false,
    childrenIds: [],
  };
};

export const mapTrashTagToTrashNode = (tag: TagTreeNode, parentNodeId: string): TrashNode => {
  return {
    id: encodeNodeId('trash', tag.tagId),
    type: 'trash',
    parentId: parentNodeId,
    tagId: tag.tagId,
    childrenIds: [],
  };
};

export const mapResourceItemToChildNode = (
  item: ResourceItem,
  parentTagId: string,
  parentNodeId: string
): ResourceNode | LinkNode => {
  const common = {
    parentId: parentNodeId,
    resourceId: item.resourceId,
    title: item.resourceName,
    resourceType: normalizeResourceType(item.resourceType),
  } as const;
  if (item.mainTagId === parentTagId) {
    return {
      id: encodeNodeId('resource', item.resourceId, parentTagId),
      type: 'resource',
      ...common,
    };
  }
  return {
    id: encodeNodeId('link', item.resourceId, parentTagId),
    type: 'link',
    ...common,
  };
};

export const buildLoadMoreNode = (
  parentNodeId: string,
  loaded: number,
  total: number
): LoadMoreNode => {
  return {
    id: encodeNodeId('loadMore', parentNodeId),
    type: 'loadMore',
    parentId: parentNodeId,
    loaded,
    total,
  };
};

export const buildDriveRootNode = (params: {
  groupId?: string;
  personalRootTag?: TagTreeNode;
}): FolderNode => {
  return {
    id: DRIVE_ROOT_ID,
    type: 'folder',
    parentId: null,
    tagId: params.groupId ? '' : (params.personalRootTag?.tagId ?? ''),
    name: params.groupId ? '小组云盘' : '个人云盘',
    expanded: true,
    childrenIds: [],
  };
};

export const isFolderLikeNode = (node: DriveNode): node is FolderNode | TrashNode => {
  return node.type === 'folder' || node.type === 'trash';
};
