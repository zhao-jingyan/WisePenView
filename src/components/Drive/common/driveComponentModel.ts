import {
  decodeRootNodeScope,
  DRIVE_ROOT_ID,
  type DriveNode,
  type DriveNodeScope,
  type LoadingNode,
} from '@/domains/Drive';

export const DEFAULT_DRIVE_ROOT_ID = DRIVE_ROOT_ID;

export type DriveScope = { type: 'personal' } | { type: 'group'; groupId: string };

export type DriveItemKind = 'root' | 'folder' | 'resource' | 'link';

export type DriveDataNode = Exclude<DriveNode, LoadingNode>;

export type DriveActionTarget = Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>;

export interface DriveSelectionItem {
  nodeId: string;
  kind: DriveItemKind;
  label: string;
  parentNodeId: string | null;
  scope: DriveNodeScope;
  rootId: string;
  groupId?: string;
  resourceId?: string;
  tagId?: string;
}

export const getDriveScopeGroupId = (scope: DriveNodeScope): string | undefined =>
  scope.type === 'group' ? scope.groupId : undefined;

export const resolveDriveScope = (
  scope?: DriveScope,
  fallbackGroupId?: string,
  rootId?: string
) => {
  const fallbackScopeGroupId =
    scope == null ? fallbackGroupId : scope.type === 'group' ? scope.groupId : undefined;
  const nodeScope = decodeRootNodeScope(rootId, fallbackScopeGroupId);
  return {
    scope: nodeScope,
    rootId: nodeScope.rootId,
    groupId: getDriveScopeGroupId(nodeScope),
  };
};

export const getDriveNodeLabel = (node: DriveNode): string => {
  switch (node.type) {
    case 'root':
      return node.name || '云盘';
    case 'folder':
      return node.name || '未命名文件夹';
    case 'resource':
    case 'link':
      return node.title || '未命名文件';
    case 'loading':
      return '';
  }
};

export const isDriveActionTarget = (node: DriveNode): node is DriveActionTarget =>
  node.type === 'folder' || node.type === 'resource' || node.type === 'link';

export const toDriveSelectionItem = (node: DriveNode): DriveSelectionItem | null => {
  if (node.type === 'loading') return null;
  if (node.type === 'root') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
      scope: node.scope,
      rootId: node.scope.rootId,
      groupId: getDriveScopeGroupId(node.scope),
      tagId: node.tagId,
    };
  }
  if (node.type === 'folder') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
      scope: node.scope,
      rootId: node.scope.rootId,
      groupId: getDriveScopeGroupId(node.scope),
      tagId: node.tagId,
    };
  }
  return {
    nodeId: node.id,
    kind: node.type,
    label: getDriveNodeLabel(node),
    parentNodeId: node.parentId,
    scope: node.scope,
    rootId: node.scope.rootId,
    groupId: getDriveScopeGroupId(node.scope),
    resourceId: node.resourceId,
  };
};
