import React from 'react';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineTag } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import { mapFolderToTagTreeNode } from '@/types/folder';
import type { IFolderService } from '@/services/Folder/index.type';
import type {
  NodeMap,
  TreeNavDataMode,
  TreeNavIconRenderer,
  TreeNavSelectTarget,
} from './index.type';
import { createFolderDataNode } from './folderUtil';
import styles from './style.module.less';

export const TREE_NAV_FILE_PAGE_SIZE = 10;
export const TREE_NAV_FILE_KEY_PREFIX = 'file-';
const LOAD_MORE_PREFIX = 'loadMore-';

export interface NavLoadMoreMeta {
  parentKey: string;
  nextPage: number;
  treeNode: TagTreeNode;
  loadedFiles: number;
  totalFiles: number;
}

export interface NavNodeBuildContext {
  nodeMap: NodeMap;
  resourceById: Map<string, ResourceItem>;
  loadMoreMetaByKey: Map<string, NavLoadMoreMeta>;
  showFiles: boolean;
  selectTarget: TreeNavSelectTarget;
  dataMode: TreeNavDataMode;
  renderNodeIcon?: TreeNavIconRenderer;
  onLoadMoreClick: (loadMoreKey: string) => void;
}

function isValidTagNode(node: TagTreeNode): boolean {
  return Boolean(node?.tagId && (node.tagName ?? '').trim());
}

/** tag + leaves：占位节点，展开后通过 adapter 拉子标签与文件 */
export function tagToLazyNavDataNode(node: TagTreeNode, ctx: NavNodeBuildContext): DataNode | null {
  if (!isValidTagNode(node)) return null;
  ctx.nodeMap.set(node.tagId, node);
  const customBranchIcon = ctx.renderNodeIcon?.({
    kind: 'branch',
    dataMode: ctx.dataMode,
    rawNode: node,
  });
  return {
    key: node.tagId,
    title: (
      <span className={styles.nodeTitle}>
        {customBranchIcon ?? <AiOutlineTag size={14} color="var(--ant-color-primary)" />}
        {node.tagName}
      </span>
    ),
    isLeaf: false,
    checkable: false,
    selectable: false,
  };
}

export function createFileDataNode(item: ResourceItem, ctx: NavNodeBuildContext): DataNode {
  const id = item.resourceId ?? '';
  if (id) ctx.resourceById.set(id, item);
  const customFileIcon = ctx.renderNodeIcon?.({
    kind: 'file',
    dataMode: ctx.dataMode,
    rawNode: item,
  });
  return {
    key: `${TREE_NAV_FILE_KEY_PREFIX}${id}`,
    title: (
      <span className={styles.nodeTitle}>
        {customFileIcon ?? (
          <FileTypeIcon
            resourceType={item.resourceType}
            size={14}
            color="var(--ant-color-text-secondary)"
          />
        )}
        {item.resourceName || '未命名文件'}
      </span>
    ),
    isLeaf: true,
    checkable: ctx.selectTarget === 'leaves',
    selectable: false,
  };
}

export function createLoadMoreDataNode(loadMoreKey: string, ctx: NavNodeBuildContext): DataNode {
  return {
    key: loadMoreKey,
    title: (
      <span
        className={styles.loadMoreBtn}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.onLoadMoreClick(loadMoreKey);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            ctx.onLoadMoreClick(loadMoreKey);
          }
        }}
      >
        加载更多
      </span>
    ),
    isLeaf: true,
    selectable: false,
    checkable: false,
  };
}

export function loadMoreKeyForParent(parentKey: string): string {
  return `${LOAD_MORE_PREFIX}${parentKey}`;
}

/** 由 getNodeContents 的结果组装展开后的子节点（子文件夹/子标签 + 可选文件分页 + loadMore） */
export function buildNavChildrenFromContents(
  childNodes: TagTreeNode[],
  files: ResourceItem[],
  totalFiles: number,
  parentKey: string,
  treeNode: TagTreeNode,
  ctx: NavNodeBuildContext,
  mapChildTagToDataNode: (n: TagTreeNode) => DataNode | null
): DataNode[] {
  const childRows = childNodes
    .map((c) => mapChildTagToDataNode(c))
    .filter((n): n is DataNode => n != null);
  if (!ctx.showFiles) {
    return childRows;
  }

  const fileRows = files.map((f) => createFileDataNode(f, ctx));
  const rows: DataNode[] = [...childRows, ...fileRows];

  if (files.length < totalFiles) {
    const lmKey = loadMoreKeyForParent(parentKey);
    ctx.loadMoreMetaByKey.set(lmKey, {
      parentKey,
      nextPage: 2,
      treeNode,
      loadedFiles: files.length,
      totalFiles,
    });
    rows.push(createLoadMoreDataNode(lmKey, ctx));
  }

  return rows;
}

export async function buildFolderNavChildren(
  targetFolder: Folder,
  ctx: NavNodeBuildContext,
  folderService: IFolderService
): Promise<DataNode[]> {
  const subFolderNodes: DataNode[] = (targetFolder.children ?? []).map((child) => ({
    ...createFolderDataNode(
      child,
      ctx.nodeMap,
      undefined,
      ctx.renderNodeIcon?.({
        kind: 'branch',
        dataMode: ctx.dataMode,
        rawNode: mapFolderToTagTreeNode(child),
      })
    ),
    checkable: ctx.dataMode === 'tag' && ctx.selectTarget === 'nodes',
    selectable: ctx.dataMode === 'folder' && ctx.selectTarget === 'nodes',
  }));

  if (!ctx.showFiles) {
    return subFolderNodes;
  }

  const res = await folderService.getResByFolder({
    folder: targetFolder,
    filePage: 1,
    filePageSize: TREE_NAV_FILE_PAGE_SIZE,
  });

  const treeNode = mapFolderToTagTreeNode(targetFolder);
  const filesAndMore = buildNavChildrenFromContents(
    [],
    res.files,
    res.totalFiles,
    String(targetFolder.tagId),
    treeNode,
    ctx,
    () => null
  );
  return [...subFolderNodes, ...filesAndMore];
}

/** 点击「加载更多」后合并下一页文件，并更新或移除 loadMore 节点 */
export function replaceLoadMoreInNavTree(
  nodes: DataNode[],
  loadMoreKey: string,
  parentKey: string,
  newFiles: ResourceItem[],
  latestTotalFiles: number,
  loadedBefore: number,
  prevNextPage: number,
  treeNode: TagTreeNode,
  ctx: NavNodeBuildContext
): DataNode[] {
  return nodes.map((node) => {
    if (node.key === parentKey) {
      const children = (node.children ?? []).filter((c) => c.key !== loadMoreKey);
      const newFileNodes = newFiles.map((f) => createFileDataNode(f, ctx));
      const merged: DataNode[] = [...children, ...newFileNodes];
      const updatedLoaded = loadedBefore + newFiles.length;
      ctx.loadMoreMetaByKey.delete(loadMoreKey);
      if (updatedLoaded < latestTotalFiles) {
        const lmKey = loadMoreKeyForParent(parentKey);
        ctx.loadMoreMetaByKey.set(lmKey, {
          parentKey,
          nextPage: prevNextPage + 1,
          treeNode,
          loadedFiles: updatedLoaded,
          totalFiles: latestTotalFiles,
        });
        merged.push(createLoadMoreDataNode(lmKey, ctx));
      }
      return { ...node, children: merged, isLeaf: merged.length === 0 };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: replaceLoadMoreInNavTree(
          node.children,
          loadMoreKey,
          parentKey,
          newFiles,
          latestTotalFiles,
          loadedBefore,
          prevNextPage,
          treeNode,
          ctx
        ),
      };
    }
    return node;
  });
}
