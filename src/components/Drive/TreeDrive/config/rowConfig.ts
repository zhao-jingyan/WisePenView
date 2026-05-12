import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';
import type { DragEvent, HTMLAttributes } from 'react';
import type { TreeDriveMode, TreeRowItem } from '../index.type';

/** HTML5 拖拽 dataTransfer 类型：文件 */
export const DRAG_TYPE_FILE = 'application/x-wisepen-folder-file';
/** HTML5 拖拽 dataTransfer 类型：文件夹 */
export const DRAG_TYPE_FOLDER = 'application/x-wisepen-folder-folder';

/** 创建「行点击」回调：防拖拽误触 + 按 folder/file 分支调用对应回调 */
export function createOnRowClick(options: {
  getIsDragging: () => boolean;
  onTreeNodeClick: (node: TagTreeNode) => void;
  onTreeLeafClick: (file: ResourceItem) => void;
}): (record: TreeRowItem) => void {
  const { getIsDragging, onTreeNodeClick, onTreeLeafClick } = options;
  return (record: TreeRowItem) => {
    if (getIsDragging()) return;
    if (record._type === 'folder') {
      onTreeNodeClick(record.data);
    } else if (record._type === 'file') {
      onTreeLeafClick(record.data);
    }
  };
}

export interface TreeDriveRowConfigOptions {
  /** 视图模式：tag 模式下禁用拖拽 */
  mode: TreeDriveMode;
  /** 只读：文件夹模式下禁用拖拽与放置，行行为与标签模式一致 */
  readOnlyMode?: boolean;
  /** 拖拽开始/结束：仅在事件回调中调用，避免 render 期传递 ref 触发 lint */
  setIsDragging: (value: boolean) => void;
  styles: {
    droppableOver: string;
  };
  /** 行点击（展开文件夹 / 打开文件） */
  onRowClick: (record: TreeRowItem) => void;
  /** 文件拖放到文件夹 */
  onDropFile: (file: ResourceItem, targetFolder: TagTreeNode) => void;
  /** 文件夹拖放到文件夹 */
  onDropFolder: (folder: TagTreeNode, targetFolder: TagTreeNode) => void;
}

/**
 * 返回 Table onRow 所需的 getRowProps：(record) => row props
 * 包含行点击、文件/文件夹拖拽与放置
 */
export function getTreeDriveRowProps(
  options: TreeDriveRowConfigOptions
): (record: TreeRowItem) => HTMLAttributes<HTMLTableRowElement> {
  const {
    mode,
    readOnlyMode = false,
    setIsDragging,
    styles,
    onRowClick,
    onDropFile,
    onDropFolder,
  } = options;

  const enableFolderDragDrop = mode === 'folder' && !readOnlyMode;

  return (record: TreeRowItem): HTMLAttributes<HTMLTableRowElement> => {
    const base = {
      onClick: () => onRowClick(record),
      style: { cursor: 'pointer' as const },
    };

    // tag 模式下禁用拖拽
    if (mode === 'tag') {
      return base;
    }

    // 「加载更多」占位行，不走node/leaf的点击回调
    if (record._type === 'loadMore') {
      return { style: { cursor: 'pointer' as const } };
    }

    if (!enableFolderDragDrop) {
      return base;
    }

    if (record._type === 'file') {
      return {
        ...base,
        draggable: true,
        onDragStart: (e: DragEvent) => {
          setIsDragging(true);
          e.dataTransfer.setData(DRAG_TYPE_FILE, JSON.stringify(record.data));
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragEnd: () => {
          setIsDragging(false);
        },
      };
    }

    if (record._type === 'folder') {
      return {
        ...base,
        // 当浮于文件夹时，设置样式提示可以drop
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add(styles.droppableOver);
        },
        onDragLeave: (e: DragEvent) => {
          e.currentTarget.classList.remove(styles.droppableOver);
        },
        // 当drop时，处理文件/文件夹的移动
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          e.currentTarget.classList.remove(styles.droppableOver);
          const fileRaw = e.dataTransfer.getData(DRAG_TYPE_FILE);
          const folderRaw = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
          if (fileRaw) {
            try {
              const file = JSON.parse(fileRaw) as ResourceItem;
              onDropFile(file, record.data);
            } catch {
              // ignore
            }
          } else if (folderRaw) {
            try {
              const folder = JSON.parse(folderRaw) as TagTreeNode;
              const target = record.data;
              if (folder.tagId === target.tagId) return;
              onDropFolder(folder, target);
            } catch {
              // ignore
            }
          }
        },
        // 当拖拽文件夹时，设置样式提示可以drop
        draggable: true,
        onDragStart: (e: DragEvent) => {
          setIsDragging(true);
          e.dataTransfer.setData(DRAG_TYPE_FOLDER, JSON.stringify(record.data));
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragEnd: () => {
          setIsDragging(false);
        },
      };
    }

    return base;
  };
}
