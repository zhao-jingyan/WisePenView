import type { ChatDocumentPickerNode, ChatDocumentPickerSelectedResource } from '@/domains/Chat';

const DOCUMENT_PICKER_CHILD_KEY_SEPARATOR = '>';

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

function buildDocumentPickerScopedKey(scopeKey: string, nodeId: string): string {
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
  const treeNodes: DocumentPickerTreeNode[] = [];

  for (const node of documentNodes) {
    const key = buildDocumentPickerScopedKey(scopeKey, node.nodeId);
    const selectable = isSelectableDocumentPickerNode(node);
    nodeEntries.push([key, node]);
    treeNodes.push({
      key,
      title: node.title,
      isLeaf: node.isLeaf,
      selectable,
      checkable: selectable,
    });
  }

  return { treeNodes, nodeEntries };
}

export function replaceDocumentPickerTreeNodeChildren<T extends { key: unknown; children?: T[] }>(
  nodes: T[],
  targetKey: string,
  children: T[]
): T[] {
  const result: T[] = [];
  for (const node of nodes) {
    if (String(node.key) === targetKey) {
      const nextNode = Object.assign({}, node) as T;
      nextNode.children = children;
      result.push(nextNode);
      continue;
    }
    if (!node.children || node.children.length === 0) {
      result.push(node);
      continue;
    }
    const nextNode = Object.assign({}, node) as T;
    nextNode.children = replaceDocumentPickerTreeNodeChildren(node.children, targetKey, children);
    result.push(nextNode);
  }
  return result;
}

function mapDocumentPickerNodeToSelectedResource(
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
  const resources: ChatDocumentPickerSelectedResource[] = [];
  for (const node of nodes) {
    const resource = mapDocumentPickerNodeToSelectedResource(node);
    if (!resource) continue;
    resources.push(resource);
  }
  return resources;
}
