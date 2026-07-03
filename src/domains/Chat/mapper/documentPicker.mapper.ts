import { buildDriveNodeScope, type DriveNode } from '@/domains/Drive';
import type { Group } from '@/domains/Group';
import type {
  ChatDocumentPickerNode,
  ChatDocumentPickerScope,
  ChatDocumentPickerSelectedResource,
} from '../service/index.type';

export const DOCUMENT_PICKER_CHILD_KEY_SEPARATOR = '>';

export interface DocumentPickerTreeKey {
  scopeKey: string;
  nodeId: string;
}

export interface DocumentPickerTreeNode {
  key: string;
  title: string;
  isLeaf: boolean;
  selectable: boolean;
  checkable: boolean;
}

export interface BuildDocumentPickerTreeNodesResult {
  treeNodes: DocumentPickerTreeNode[];
  nodeEntries: Array<[string, ChatDocumentPickerNode]>;
}

export function buildDocumentPickerScopes(groups: Group[]): ChatDocumentPickerScope[] {
  const personalScope = buildDriveNodeScope();
  return [
    {
      scopeKey: 'personal',
      label: '个人文件',
      rootId: personalScope.rootId,
      type: 'personal',
    },
    ...groups.map((group) => {
      const groupScope = buildDriveNodeScope(group.groupId);
      return {
        scopeKey: `group:${group.groupId}`,
        label: group.groupName,
        rootId: groupScope.rootId,
        type: 'group' as const,
        groupId: group.groupId,
      };
    }),
  ];
}

function getDriveNodeTitle(node: DriveNode): string {
  switch (node.type) {
    case 'root':
      return node.name || '云盘';
    case 'folder':
      return node.name || '未命名文件夹';
    case 'resource':
    case 'link':
      return node.title || node.resourceId;
    case 'loading':
      return node.label || '';
  }
}

export function mapDriveNodeToDocumentPickerNode(node: DriveNode): ChatDocumentPickerNode | null {
  if (node.type === 'loading') return null;

  const isResourceNode = node.type === 'resource' || node.type === 'link';
  const groupId = node.scope.type === 'group' ? node.scope.groupId : null;
  const base: ChatDocumentPickerNode = {
    nodeId: node.id,
    title: getDriveNodeTitle(node),
    type: node.type,
    groupId,
    resourceId: null,
    resourceName: null,
    resourceType: null,
    isLeaf: isResourceNode,
    selectable: isResourceNode,
  };

  if (!isResourceNode) return base;

  return {
    ...base,
    resourceId: node.resourceId,
    resourceName: node.title || node.resourceId,
    resourceType: node.resourceType ?? '',
  };
}

export function buildDocumentPickerScopedKey(scopeKey: string, nodeId: string): string {
  return `${scopeKey}${DOCUMENT_PICKER_CHILD_KEY_SEPARATOR}${nodeId}`;
}

export function parseDocumentPickerTreeKey(key: string): DocumentPickerTreeKey | null {
  const idx = key.indexOf(DOCUMENT_PICKER_CHILD_KEY_SEPARATOR);
  if (idx === -1) return null;
  return {
    scopeKey: key.slice(0, idx),
    nodeId: key.slice(idx + DOCUMENT_PICKER_CHILD_KEY_SEPARATOR.length),
  };
}

export function isDocumentPickerScopeRootKey(key: string): boolean {
  return !key.includes(DOCUMENT_PICKER_CHILD_KEY_SEPARATOR);
}

export function isSelectableDocumentPickerNode(node: ChatDocumentPickerNode | undefined): boolean {
  if (!node) return false;
  if (node.selectable) return true;
  return node.type === 'resource' || node.type === 'link';
}

export function isExpandableDocumentPickerNode(node: ChatDocumentPickerNode | undefined): boolean {
  if (!node) return false;
  if (node.isLeaf) return false;
  return node.type === 'root' || node.type === 'folder';
}

export function buildDocumentPickerTreeNodes(
  scopeKey: string,
  documentNodes: ChatDocumentPickerNode[]
): BuildDocumentPickerTreeNodesResult {
  const nodeEntries: Array<[string, ChatDocumentPickerNode]> = [];
  const treeNodes = documentNodes.map((node) => {
    const key = buildDocumentPickerScopedKey(scopeKey, node.nodeId);
    const selectable = isSelectableDocumentPickerNode(node);
    nodeEntries.push([key, node]);
    return {
      key,
      title: node.title,
      isLeaf: node.isLeaf,
      selectable,
      checkable: selectable,
    };
  });

  return { treeNodes, nodeEntries };
}

export function replaceDocumentPickerTreeNodeChildren<T extends { key: unknown; children?: T[] }>(
  nodes: T[],
  targetKey: string,
  children: T[]
): T[] {
  return nodes.map((node) => {
    if (String(node.key) === targetKey) {
      return { ...node, children };
    }
    if (!node.children || node.children.length === 0) return node;
    return {
      ...node,
      children: replaceDocumentPickerTreeNodeChildren(node.children, targetKey, children),
    };
  });
}

export function mapDocumentPickerNodeToSelectedResource(
  node: ChatDocumentPickerNode | undefined
): ChatDocumentPickerSelectedResource | null {
  if (!node || !isSelectableDocumentPickerNode(node) || !node.resourceId) return null;
  return {
    resourceId: node.resourceId,
    resourceName: node.resourceName || node.title || node.resourceId,
    resourceType: node.resourceType ?? '',
    enabled: true,
  };
}

export function mapDocumentPickerNodesToSelectedResources(
  nodes: Array<ChatDocumentPickerNode | undefined>
): ChatDocumentPickerSelectedResource[] {
  return nodes
    .map((node) => mapDocumentPickerNodeToSelectedResource(node))
    .filter((node): node is ChatDocumentPickerSelectedResource => Boolean(node));
}
