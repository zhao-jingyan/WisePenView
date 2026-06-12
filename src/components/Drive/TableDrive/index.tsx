import IconText from '@/components/Common/IconText';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableRowProps,
} from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import { Button } from '@heroui/react';
import { CloudUpload } from 'lucide-react';
import React, { useMemo, useRef } from 'react';
import { getDriveNodeLabel, resolveDriveScope } from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import {
  DRAG_TYPE_DRIVE_NODE,
  isDraggableDriveNode,
  isDropTargetDriveNode,
  useDriveDrop,
} from '../common/useDriveDrop';
import type { DriveRow, DriveTableRow, TableDriveProps } from './index.type';
import styles from './style.module.less';
import { useTableDrive } from './useTableDrive';
import { useTableDriveActions } from './useTableDriveActions';

function getTypeLabel(node: DriveNode): string {
  switch (node.type) {
    case 'folder':
      return '文件夹';
    case 'resource':
      return node.resourceType;
    case 'link':
      return '链接';
    case 'trash':
      return '回收站';
    case 'loadMore':
      return '';
  }
}

function toDriveTableRow(node: DriveRow, loadingMoreParentId: string | null): DriveTableRow {
  if (node.type === 'loadMore') {
    return {
      id: node.id,
      name: '加载更多',
      entryType: 'loadMore',
      typeLabel: '',
      loaded: node.loaded,
      total: node.total,
      loadMoreLabel: loadingMoreParentId === node.parentId ? '加载中...' : undefined,
      loadMoreLoading: loadingMoreParentId === node.parentId,
      node,
    };
  }

  return {
    id: node.id,
    name: getDriveNodeLabel(node),
    entryType: node.type,
    resourceType: node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined,
    sizeLabel: '—',
    typeLabel: getTypeLabel(node),
    isExpandable: node.type === 'folder' || node.type === 'trash',
    children: node.children?.map((child) => toDriveTableRow(child, loadingMoreParentId)),
    node,
  };
}

function toBreadcrumbItems(pathNodes: DriveNode[]): FolderTableBreadcrumbItem[] {
  return pathNodes
    .filter((node) => node.type !== 'loadMore')
    .map((node, index) => ({
      id: node.id,
      label: getDriveNodeLabel(node),
      isRoot: index === 0,
    }));
}

function TableDrive({ groupId, rootId, scope, actions }: TableDriveProps) {
  const resolvedScope = React.useMemo(() => resolveDriveScope(scope, groupId), [scope, groupId]);
  const finalRootId = rootId ?? resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    loadingMoreParentId,
    expandedRowKeys,
    enterFolder,
    handleLoadMore,
    handleExpand,
    refresh,
  } = useTableDrive({ rootId: finalRootId, groupId: finalGroupId });

  const handleClickNode = useClickNode({
    enterFolder,
    loadMore: handleLoadMore,
    groupId: finalGroupId,
  });
  const { onDrop } = useDriveDrop({ refresh, groupId: finalGroupId });
  const rows = useMemo(
    () => dataSource.map((node) => toDriveTableRow(node, loadingMoreParentId)),
    [dataSource, loadingMoreParentId]
  );
  const currentDirectoryItemCount = useMemo(
    () => rows.filter((row) => row.entryType !== 'loadMore').length,
    [rows]
  );
  const breadcrumbItems = useMemo(() => toBreadcrumbItems(pathNodes), [pathNodes]);
  const {
    rowActions,
    showCreateFolder,
    showUploadToGroup,
    showManagePermission,
    openNewFolder,
    openUploadToGroup,
    openTagPermission,
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: rows,
    rootId: finalRootId,
    groupId: finalGroupId,
    actions,
    refresh,
  });

  // 拖拽结束前屏蔽行点击，避免拖放动作额外触发进入/打开。
  const isDraggingRef = useRef(false);

  const handleExpandedChange = async (keys: string[]) => {
    const addedKey = keys.find((key) => !expandedRowKeys.includes(key));
    if (addedKey) {
      const row = findRowById(dataSource, addedKey);
      if (row) {
        await handleExpand(true, row);
        return;
      }
    }
    const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
    if (removedKey) {
      const row = findRowById(dataSource, removedKey);
      if (row) {
        await handleExpand(false, row);
        return;
      }
    }
  };

  const getRowProps = (row: DriveTableRow): FolderTableRowProps => {
    const node = row.node;
    const base: FolderTableRowProps = {};

    if (node.type === 'loadMore') {
      if (loadingMoreParentId === node.parentId) {
        base['aria-busy'] = true;
      }
      return base;
    }

    if (isDraggableDriveNode(node)) {
      base.draggable = true;
      base.onDragStart = (event) => {
        isDraggingRef.current = true;
        event.dataTransfer.setData(DRAG_TYPE_DRIVE_NODE, JSON.stringify(node));
        event.dataTransfer.effectAllowed = 'move';
      };
      base.onDragEnd = (event) => {
        isDraggingRef.current = false;
        event.currentTarget.classList.remove(styles.droppableOver);
      };
    }

    if (isDropTargetDriveNode(node)) {
      base.onDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add(styles.droppableOver);
      };
      base.onDragLeave = (event) => {
        event.currentTarget.classList.remove(styles.droppableOver);
      };
      base.onDrop = (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove(styles.droppableOver);
        const raw = event.dataTransfer.getData(DRAG_TYPE_DRIVE_NODE);
        if (!raw) return;
        try {
          const source = JSON.parse(raw) as DriveNode;
          void onDrop(source, node);
        } catch {
          // 忽略非 Drive 节点拖拽数据。
        } finally {
          isDraggingRef.current = false;
        }
      };
    }

    return base;
  };

  const handleRowActivate = (row: DriveTableRow) => {
    if (isDraggingRef.current) return;
    handleClickNode(row.node);
  };

  return (
    <main className={styles.listArea}>
      <FolderTable<DriveTableRow>
        ariaLabel="云盘文件列表"
        items={rows}
        loading={loading}
        breadcrumb={
          <FolderTable.Breadcrumb
            items={breadcrumbItems}
            onJump={(nodeId) => enterFolder(nodeId)}
          />
        }
        toolbar={
          <div className={styles.toolbarActions}>
            {showUploadToGroup ? (
              <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
                <IconText icon={<CloudUpload />} iconSize={16}>
                  上传文件
                </IconText>
              </Button>
            ) : null}
            {showManagePermission ? (
              <Button variant="secondary" size="sm" onPress={openTagPermission}>
                标签权限管理
              </Button>
            ) : null}
            {showCreateFolder ? (
              <Button variant="secondary" size="sm" onPress={openNewFolder}>
                新建文件夹
              </Button>
            ) : null}
          </div>
        }
        expandedRowKeys={expandedRowKeys}
        onExpandedChange={(keys) => void handleExpandedChange(keys)}
        onRowActivate={handleRowActivate}
        getRowProps={getRowProps}
        rowActions={rowActions}
        totalCount={currentDirectoryItemCount}
        summary={`当前目录共 ${currentDirectoryItemCount} 项`}
        className={styles.table}
      />
      {ModalHost}
    </main>
  );
}

function findRowById(rows: DriveRow[], id: string): DriveRow | undefined {
  for (const row of rows) {
    if (row.id === id) return row;
    if (row.type !== 'loadMore' && row.children?.length) {
      const child = findRowById(row.children, id);
      if (child) return child;
    }
  }
  return undefined;
}

export default TableDrive;
