import React from 'react';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineFolder } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import type { Folder } from '@/types/folder';
import type { IFolderService } from '@/services/Folder/index.type';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { NodeMap } from './index.type';
import styles from './style.module.less';

export const FILE_PREVIEW_SIZE = 5;
export const ROOT_DISPLAY = '~';

const MORE_KEY_PREFIX = '__more__:';
const FILE_KEY_PREFIX = 'file-';

const getFolderDisplayName = (tagName: string) => {
  if (tagName === '/') return ROOT_DISPLAY;
  return tagName.startsWith('/') ? tagName.slice(1) : tagName;
};

// 输入folder，输出tree可展示的文件夹数据节点
export function createFolderDataNode(
  folder: Folder,
  nodeMap: NodeMap,
  displayName?: string,
  icon?: React.ReactNode
): DataNode {
  nodeMap.set(folder.tagId, folder as TagTreeNode);
  return {
    key: folder.tagId,
    title: (
      <span className={styles.nodeTitle}>
        {icon ?? <AiOutlineFolder size={14} color="var(--ant-color-warning)" />}
        {displayName ?? getFolderDisplayName(folder.tagName)}
      </span>
    ),
    isLeaf: false,
  };
}

// 输入文件列表，输出tree可展示的文件数据节点列表
export function buildFilePreviewNodes(
  files: { resourceId?: string; resourceName?: string; resourceType?: string }[],
  totalFiles: number,
  folderTagId: string
): DataNode[] {
  const nodes: DataNode[] = [];
  for (const f of files) {
    nodes.push({
      key: `${FILE_KEY_PREFIX}${f.resourceId}`,
      title: (
        <span className={styles.nodeTitle}>
          <FileTypeIcon
            resourceType={f.resourceType}
            size={14}
            color="var(--ant-color-text-secondary)"
          />
          {f.resourceName || '未命名文件'}
        </span>
      ),
      isLeaf: true,
      selectable: false,
      checkable: false,
    });
  }
  if (totalFiles > FILE_PREVIEW_SIZE) {
    nodes.push({
      key: `${MORE_KEY_PREFIX}${folderTagId}`,
      title: (
        <span className={styles.moreHint}>… 还有 {totalFiles - FILE_PREVIEW_SIZE} 个文件</span>
      ),
      isLeaf: true,
      selectable: false,
      checkable: false,
    });
  }
  return nodes;
}

// 构建目标文件夹的子文件夹和
export async function buildFolderChildNodes(
  targetFolder: Folder,
  nodeMap: NodeMap,
  folderService: IFolderService
): Promise<DataNode[]> {
  // 将所有子文件夹转换为数据节点
  const subFolderNodes = (targetFolder.children ?? []).map((child) =>
    createFolderDataNode(child, nodeMap)
  );

  // 将所有子文件转换为数据节点
  let fileNodes: DataNode[] = [];
  try {
    const res = await folderService.getResByFolder({
      folder: targetFolder,
      filePage: 1,
      filePageSize: FILE_PREVIEW_SIZE,
    });
    fileNodes = buildFilePreviewNodes(res.files, res.totalFiles, targetFolder.tagId);
  } catch {
    /* file preview is non-critical */
  }

  // 返回所有子节点
  return [...subFolderNodes, ...fileNodes];
}

// 替换节点子节点
export function replaceNodeChildren(
  nodes: DataNode[],
  targetKey: React.Key,
  children: DataNode[]
): DataNode[] {
  return nodes.map((node) => {
    if (node.key === targetKey) {
      return { ...node, children, isLeaf: children.length === 0 };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: replaceNodeChildren(node.children, targetKey, children),
      };
    }
    return node;
  });
}
