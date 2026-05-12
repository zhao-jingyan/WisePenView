import type { LoadMoreRowItem, TreeRowItem } from '@/components/Drive/TreeDrive/index.type';
import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';

// 将 TagTreeNode（树节点）与 ResourceItem（资源叶子）转为 TreeRowItem[]，供 Table 树渲染
// 语义上，Node对应folder/tag，Leaf对应file

function buildFileRowKey(scopeKey: string, resourceId: string): string {
  return `file-${scopeKey}-${resourceId}`;
}

/** 将子节点列表转为占位行：children=[]，展开后再加载真实子行 */
export function buildNodePlaceholderRows(rootChildNodes: TagTreeNode[]): TreeRowItem[] {
  return rootChildNodes.map(nodeToPlaceholderRow);
}

/** 将单个树节点转为占位行 */
function nodeToPlaceholderRow(node: TagTreeNode): TreeRowItem {
  return {
    key: `folder-${node.tagId}`,
    _type: 'folder' as const,
    data: node,
    children: [],
  };
}

/** buildNodeChildRows 的可选分页元数据（叶子即资源文件列表） */
export interface BuildNodeChildRowsMeta {
  parentKey: string;
  treeNode: TagTreeNode;
  totalLeaves: number;
  leafPageSize: number;
}

/** 展开节点后的子行：子树节点占位行 + 资源叶子行；传入 meta 时在末尾追加 loadMore 占位行 */
export function buildNodeChildRows(
  childNodes: TagTreeNode[],
  leaves: ResourceItem[],
  meta?: BuildNodeChildRowsMeta
): TreeRowItem[] {
  const nodeRows: TreeRowItem[] = childNodes.map(nodeToPlaceholderRow);
  const fileScopeKey = meta?.parentKey ?? 'cwd';

  const leafRows: TreeRowItem[] = leaves.map((item) => ({
    key: buildFileRowKey(fileScopeKey, item.resourceId),
    _type: 'file' as const,
    data: item,
  }));

  const rows: TreeRowItem[] = [...nodeRows, ...leafRows];

  if (meta && leaves.length < meta.totalLeaves) {
    rows.push({
      key: `loadMore-${meta.parentKey}`,
      _type: 'loadMore',
      parentKey: meta.parentKey,
      nextPage: 2,
      treeNode: meta.treeNode,
      totalFiles: meta.totalLeaves,
      loadedFiles: leaves.length,
    });
  }

  return rows;
}

/** 递归更新 treeData 中指定 key 节点的 children */
export function updateNodeChildren(
  nodes: TreeRowItem[],
  targetKey: string,
  newChildren: TreeRowItem[]
): TreeRowItem[] {
  return nodes.map((node) => {
    if (node.key === targetKey) {
      return { ...node, children: newChildren };
    }
    if (node._type === 'folder' && node.children?.length) {
      return { ...node, children: updateNodeChildren(node.children, targetKey, newChildren) };
    }
    return node;
  });
}

/** 递归向指定节点追加资源叶子行（TreeRowItem 中 _type === 'file'） */
export function appendLeafRowsToNode(
  nodes: TreeRowItem[],
  targetKey: string,
  moreLeafRows: TreeRowItem[]
): TreeRowItem[] {
  return nodes.map((node) => {
    if (node.key === targetKey && node._type === 'folder') {
      return { ...node, children: [...(node.children ?? []), ...moreLeafRows] };
    }
    if (node._type === 'folder' && node.children?.length) {
      return { ...node, children: appendLeafRowsToNode(node.children, targetKey, moreLeafRows) };
    }
    return node;
  });
}

/** 构建「当前树节点」在表格根层的视图：子节点占位 + 当前页叶子 + 可选 loadMore */
export function buildCurrentNodeView(
  childNodes: TagTreeNode[],
  leaves: ResourceItem[],
  currentNode: TagTreeNode,
  totalLeaves: number,
  leafPageSize: number
): TreeRowItem[] {
  const nodeRows = buildNodePlaceholderRows(childNodes);
  const fileScopeKey = `folder-${currentNode.tagId}`;
  const leafRows: TreeRowItem[] = leaves.map((item) => ({
    key: buildFileRowKey(fileScopeKey, item.resourceId),
    _type: 'file' as const,
    data: item,
  }));
  const rows: TreeRowItem[] = [...nodeRows, ...leafRows];

  if (leaves.length > 0 && leaves.length < totalLeaves) {
    rows.push({
      key: 'loadMore-cwd',
      _type: 'loadMore',
      parentKey: `folder-${currentNode.tagId}`,
      nextPage: 2,
      treeNode: currentNode,
      totalFiles: totalLeaves,
      loadedFiles: leaves.length,
    });
  }

  return rows;
}

/** 替换根层 loadMore 占位行（当前节点视图的「加载更多叶子」） */
export function replaceTopLevelLoadMore(
  nodes: TreeRowItem[],
  loadMoreRecord: LoadMoreRowItem,
  newLeaves: ResourceItem[],
  latestTotalLeaves: number
): TreeRowItem[] {
  const { loadedFiles, nextPage, treeNode, parentKey } = loadMoreRecord;
  const filtered = nodes.filter((c) => c._type !== 'loadMore');
  const leafRows: TreeRowItem[] = newLeaves.map((item) => ({
    key: buildFileRowKey(parentKey, item.resourceId),
    _type: 'file' as const,
    data: item,
  }));
  const updatedLoadedLeaves = loadedFiles + newLeaves.length;
  const result: TreeRowItem[] = [...filtered, ...leafRows];

  if (updatedLoadedLeaves < latestTotalLeaves) {
    result.push({
      key: 'loadMore-cwd',
      _type: 'loadMore',
      parentKey: loadMoreRecord.parentKey,
      nextPage: nextPage + 1,
      treeNode,
      totalFiles: latestTotalLeaves,
      loadedFiles: updatedLoadedLeaves,
    });
  }

  return result;
}

/** 在嵌套节点内替换 loadMore：追加新叶子页，必要时保留新的 loadMore 行 */
export function replaceLoadMoreInNode(
  nodes: TreeRowItem[],
  loadMoreRecord: LoadMoreRowItem,
  newLeaves: ResourceItem[],
  latestTotalLeaves: number
): TreeRowItem[] {
  const { parentKey, loadedFiles, nextPage, treeNode } = loadMoreRecord;

  return nodes.map((node) => {
    if (node.key === parentKey && node._type === 'folder') {
      const existingChildren = (node.children ?? []).filter((c) => c._type !== 'loadMore');
      const leafRows: TreeRowItem[] = newLeaves.map((item) => ({
        key: buildFileRowKey(parentKey, item.resourceId),
        _type: 'file' as const,
        data: item,
      }));
      const updatedLoadedLeaves = loadedFiles + newLeaves.length;
      const result: TreeRowItem[] = [...existingChildren, ...leafRows];

      if (updatedLoadedLeaves < latestTotalLeaves) {
        result.push({
          key: `loadMore-${parentKey}`,
          _type: 'loadMore',
          parentKey,
          nextPage: nextPage + 1,
          treeNode,
          totalFiles: latestTotalLeaves,
          loadedFiles: updatedLoadedLeaves,
        });
      }

      return { ...node, children: result };
    }
    if (node._type === 'folder' && node.children?.length) {
      return {
        ...node,
        children: replaceLoadMoreInNode(
          node.children,
          loadMoreRecord,
          newLeaves,
          latestTotalLeaves
        ),
      };
    }
    return node;
  });
}
