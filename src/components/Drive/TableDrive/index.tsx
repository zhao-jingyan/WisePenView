import { DeleteNodeModal, MoveNodeModal, RenameNodeModal } from '@/components/Drive/Modals';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableColumn,
  type FolderTableRowAction,
  type FolderTableRowDragDrop,
  type FolderTableRowPressContext,
} from '@/components/Table';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { useTrashTagStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import { Button, toast, type SortDescriptor } from '@heroui/react';
import { useMount, useRequest, useUnmount, useUpdateEffect } from 'ahooks';
import { Trash2 } from 'lucide-react';
import {
  forwardRef,
  startTransition,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import {
  buildTrashFolderNodeId,
  getDriveNodeLabel,
  isDriveActionTarget,
  resolveCurrentFolderTagId,
  resolveDriveScope,
  type DriveActionTarget,
} from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import type { DriveRow, DriveTableRow, TableDriveHandle, TableDriveProps } from './index.type';
import CreateMenu from './parts/CreateMenu';
import TableDriveSelectionPanel from './parts/SelectionPanel';
import styles from './style.module.less';
import { useTableDrive } from './useTableDrive';
import { useTableDriveActions } from './useTableDriveActions';

const DRIVE_TABLE_COLUMNS: FolderTableColumn<DriveTableRow>[] = [
  {
    id: 'name',
    label: '名称',
    width: 'fill',
    align: 'start',
    isRowHeader: true,
    isNameColumn: true,
    allowsSorting: true,
    sortFolderGroup: true,
    getSortValue: (row) => row.name,
  },
  {
    id: 'size',
    label: '大小',
    width: 'folderSize',
    renderCell: (row) => (row.entryType === 'loading' ? '' : (row.sizeLabel ?? '—')),
  },
  {
    id: 'type',
    label: '类型',
    width: 'folderType',
    allowsSorting: true,
    getSortValue: (row) => row.typeLabel,
    renderCell: (row) => (row.entryType === 'loading' ? '' : row.typeLabel),
  },
  {
    id: 'actions',
    label: '操作',
    width: 'folderAction',
    isActionColumn: true,
  },
];

function getTypeLabel(node: DriveNode): string {
  switch (node.type) {
    case 'root':
      return '云盘';
    case 'folder':
      return '文件夹';
    case 'resource':
      return node.resourceType ?? '资源';
    case 'link':
      return '链接';
    case 'loading':
      return '';
  }
}

function toDriveTableRow(node: DriveRow): DriveTableRow {
  if (node.type === 'loading') {
    return {
      id: node.id,
      name: node.label || '正在加载...',
      entryType: 'loading',
      typeLabel: '',
      node,
    };
  }

  return {
    id: node.id,
    name: getDriveNodeLabel(node),
    entryType: node.type,
    resourceType: node.type === 'resource' ? node.resourceType : undefined,
    resourceIconType:
      node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined,
    sizeLabel: '—',
    typeLabel: getTypeLabel(node),
    isExpandable: node.type === 'root' || node.type === 'folder',
    children: node.children?.map((child) => toDriveTableRow(child)),
    node,
  };
}

function toBreadcrumbItems(pathNodes: DriveNode[]): FolderTableBreadcrumbItem[] {
  return pathNodes
    .filter((node) => node.type !== 'loading')
    .map((node, index) => ({
      id: node.id,
      label: getDriveNodeLabel(node),
      isRoot: index === 0,
    }));
}

function buildDriveTableRowMap(rows: DriveTableRow[]): Map<string, DriveTableRow> {
  const map = new Map<string, DriveTableRow>();
  const visit = (row: DriveTableRow) => {
    map.set(row.id, row);
    row.children?.forEach(visit);
  };
  rows.forEach(visit);
  return map;
}

function toDriveActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function isDriveMoveSource(row: DriveTableRow): boolean {
  return isDriveActionTarget(row.node);
}

function isDriveMoveTarget(row: DriveTableRow): boolean {
  return isDriveMoveTargetNode(row.node);
}

function isDriveMoveTargetNode(node: DriveNode): boolean {
  return node.type === 'folder' || node.type === 'root';
}

function resolveSelectionKeysAfterRowPress(
  currentKeys: Set<string>,
  rowId: string,
  ctx: FolderTableRowPressContext
): Set<string> {
  if (!ctx.modifierKey) {
    return new Set([rowId]);
  }

  const nextKeys = new Set(currentKeys);
  if (nextKeys.has(rowId)) {
    nextKeys.delete(rowId);
    return nextKeys;
  }
  nextKeys.add(rowId);
  return nextKeys;
}

const TableDrive = forwardRef<TableDriveHandle, TableDriveProps>(function TableDrive(
  { groupId, rootId, scope, actions, onTrashViewChange, onUploadSuccess, showToolbarTrash = true },
  ref
) {
  const driveService = useDriveService();
  const resolvedScope = useMemo(
    () => resolveDriveScope(scope, groupId, rootId),
    [scope, groupId, rootId]
  );
  const finalRootId = resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    expandedRowKeys,
    enterFolder,
    handleExpand,
    refresh,
  } = useTableDrive({ rootId: finalRootId, groupId: finalGroupId, scope: resolvedScope.scope });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [draggingRowKeys, setDraggingRowKeys] = useState<Set<string>>(new Set());
  const [dropTargetRowId, setDropTargetRowId] = useState<string | null>(null);
  const [dropTargetBreadcrumbId, setDropTargetBreadcrumbId] = useState<string | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  const draggingRowKeysRef = useRef<Set<string>>(new Set());
  const selectedCommitFrameRef = useRef<number | null>(null);
  const selectedCommitTimerRef = useRef<number | null>(null);

  const updateDraggingRowKeys = useCallback((keys: Set<string>) => {
    draggingRowKeysRef.current = keys;
    setDraggingRowKeys(keys);
  }, []);

  const cancelSelectedNodeIdCommit = useCallback(() => {
    if (selectedCommitFrameRef.current !== null) {
      window.cancelAnimationFrame(selectedCommitFrameRef.current);
      selectedCommitFrameRef.current = null;
    }
    if (selectedCommitTimerRef.current !== null) {
      window.clearTimeout(selectedCommitTimerRef.current);
      selectedCommitTimerRef.current = null;
    }
  }, []);

  const scheduleSelectedNodeIdCommit = useCallback(
    (nextNodeId: string | null) => {
      cancelSelectedNodeIdCommit();
      selectedCommitFrameRef.current = window.requestAnimationFrame(() => {
        selectedCommitFrameRef.current = null;
        selectedCommitTimerRef.current = window.setTimeout(() => {
          selectedCommitTimerRef.current = null;
          startTransition(() => {
            setSelectedNodeId(nextNodeId);
          });
        }, 0);
      });
    },
    [cancelSelectedNodeIdCommit]
  );

  useUnmount(cancelSelectedNodeIdCommit);

  const handleClearSelection = useCallback(() => {
    selectedNodeIdRef.current = null;
    setSelectedRowKeys(new Set());
    scheduleSelectedNodeIdCommit(null);
  }, [scheduleSelectedNodeIdCommit]);

  const refreshDrive = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      selectedNodeIdRef.current = null;
      scheduleSelectedNodeIdCommit(null);
      setSelectedRowKeys(new Set());
      updateDraggingRowKeys(new Set());
      setDropTargetRowId(null);
      setDropTargetBreadcrumbId(null);
      enterFolder(nodeId);
    },
    [enterFolder, scheduleSelectedNodeIdCommit, updateDraggingRowKeys]
  );
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
    groupId: finalGroupId,
  });
  const rows = useMemo(() => dataSource.map((node) => toDriveTableRow(node)), [dataSource]);
  const rowMap = useMemo(() => buildDriveTableRowMap(rows), [rows]);
  const pathNodeMap = useMemo(() => {
    const map = new Map<string, DriveNode>();
    pathNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [pathNodes]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? rowMap.get(selectedNodeId) : undefined),
    [rowMap, selectedNodeId]
  );
  const currentDirectoryItemCount = useMemo(
    () => rows.filter((row) => row.entryType !== 'loading').length,
    [rows]
  );

  const handleNodeActionSuccess = useCallback(() => {
    handleClearSelection();
    refreshDrive();
  }, [handleClearSelection, refreshDrive]);

  const handleOpenRename = useCallback((node: DriveActionTarget) => {
    setRenameTarget(node);
  }, []);

  const handleOpenMove = useCallback((node: DriveActionTarget) => {
    setMoveTarget(node);
  }, []);

  const handleOpenDelete = useCallback((node: DriveActionTarget) => {
    setDeleteTarget(node);
  }, []);

  const { loading: movingByDrag, run: runMoveRowsByDrag } = useRequest(
    async ({
      sourceRowIds,
      targetFolderNodeId,
    }: {
      sourceRowIds: string[];
      targetFolderNodeId: string;
    }) => {
      const sourceRows = sourceRowIds
        .map((rowId) => rowMap.get(rowId))
        .filter((row): row is DriveTableRow => {
          if (!row) return false;
          return isDriveMoveSource(row);
        });

      if (sourceRows.length === 0) {
        return 0;
      }

      const movableRows = sourceRows.filter((row) => row.id !== targetFolderNodeId);
      await driveService.moveNodesToFolder({
        nodeIds: movableRows.map((row) => row.node.id),
        targetFolderNodeId,
        groupId: finalGroupId,
      });

      return movableRows.length;
    },
    {
      manual: true,
      onSuccess: (movedCount) => {
        updateDraggingRowKeys(new Set());
        setDropTargetRowId(null);
        setDropTargetBreadcrumbId(null);
        handleClearSelection();
        refreshDrive();
        if (movedCount > 1) {
          toast.success(`已移动 ${movedCount} 项`);
        } else if (movedCount === 1) {
          toast.success('已移动');
        }
      },
      onError: (error) => {
        updateDraggingRowKeys(new Set());
        setDropTargetRowId(null);
        setDropTargetBreadcrumbId(null);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const trashTagId = useTrashTagStore((state) => state.getTrashTagId(finalGroupId));
  const trashFolderNodeId = useMemo(
    () => (trashTagId ? buildTrashFolderNodeId(trashTagId) : undefined),
    [trashTagId]
  );
  const canOpenTrash = !finalGroupId;
  const isTrashView = Boolean(
    canOpenTrash &&
    trashFolderNodeId &&
    (currentNodeId === trashFolderNodeId ||
      pathNodes.some((pathNode) => pathNode.id === trashFolderNodeId))
  );

  const openTrash = useCallback(async () => {
    if (!canOpenTrash || isTrashView) {
      return;
    }

    try {
      let resolvedTrashTagId = useTrashTagStore.getState().getTrashTagId(finalGroupId);
      if (!resolvedTrashTagId) {
        await driveService.getRootNode({ rootId: finalRootId, groupId: finalGroupId });
        resolvedTrashTagId = useTrashTagStore.getState().getTrashTagId(finalGroupId);
      }
      if (!resolvedTrashTagId) {
        toast.danger('未找到回收站');
        return;
      }
      handleEnterFolder(buildTrashFolderNodeId(resolvedTrashTagId));
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  }, [canOpenTrash, driveService, finalGroupId, finalRootId, handleEnterFolder, isTrashView]);

  useImperativeHandle(ref, () => ({ openTrash }), [openTrash]);

  useMount(() => {
    onTrashViewChange?.(isTrashView);
  });

  useUpdateEffect(() => {
    onTrashViewChange?.(isTrashView);
  }, [isTrashView, onTrashViewChange]);

  const targetTagId = useMemo(
    () => resolveCurrentFolderTagId(currentNodeId, pathNodes),
    [currentNodeId, pathNodes]
  );
  const breadcrumbItems = useMemo(() => toBreadcrumbItems(pathNodes), [pathNodes]);
  const {
    showCreateMenu,
    showUploadToGroup,
    showManagePermission,
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagPermission,
    openResourcePermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: rows,
    groupId: finalGroupId,
    actions,
    refresh: refreshDrive,
    onUploadSuccess,
    targetTagId,
    isTrashView,
  });
  const toolbar = useMemo(
    () => (
      <div className={styles.toolbarActions}>
        {showCreateMenu ? (
          <CreateMenu items={createMenuItems} onSelect={handleCreateMenuSelect} />
        ) : null}
        {showManagePermission ? (
          <Button variant="secondary" size="sm" onPress={() => openTagPermission()}>
            标签权限管理
          </Button>
        ) : null}
        {showUploadToGroup ? (
          <Button variant="secondary" size="sm" onPress={openUploadToGroup}>
            上传到小组
          </Button>
        ) : null}
        {showToolbarTrash && canOpenTrash ? (
          <Button
            variant={isTrashView ? 'ghost' : 'secondary'}
            size="sm"
            isDisabled={isTrashView}
            onPress={openTrash}
          >
            <Trash2 size={16} aria-hidden="true" />
            回收站
          </Button>
        ) : null}
      </div>
    ),
    [
      createMenuItems,
      handleCreateMenuSelect,
      isTrashView,
      openTagPermission,
      openUploadToGroup,
      openTrash,
      canOpenTrash,
      showCreateMenu,
      showManagePermission,
      showUploadToGroup,
      showToolbarTrash,
    ]
  );

  const handleExpandedChange = useCallback(
    async (keys: string[]) => {
      const addedKey = keys.find((key) => !expandedRowKeys.includes(key));
      if (addedKey) {
        const row = findTreeNodeById(dataSource, addedKey);
        if (row) {
          await handleExpand(true, row);
          return;
        }
      }
      const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
      if (removedKey) {
        const row = findTreeNodeById(dataSource, removedKey);
        if (row) {
          await handleExpand(false, row);
          return;
        }
      }
    },
    [dataSource, expandedRowKeys, handleExpand]
  );

  const handleRowActivate = useCallback(
    (row: DriveTableRow) => {
      handleClickNode(row.node);
    },
    [handleClickNode]
  );

  const resolveRowActions = useCallback(
    (row: DriveTableRow): FolderTableRowAction<DriveTableRow>[] => {
      const actionTarget = toDriveActionTarget(row.node);
      if (!actionTarget) return [];

      const openAction: FolderTableRowAction<DriveTableRow> =
        row.node.type === 'folder'
          ? {
              key: 'enter',
              label: '进入',
              onPress: () => handleEnterFolder(row.node.id),
            }
          : {
              key: 'open',
              label: '打开',
              onPress: () => handleClickNode(row.node),
            };

      const actions: FolderTableRowAction<DriveTableRow>[] = [openAction];

      if (actionTarget.type !== 'link') {
        actions.push({
          key: 'rename',
          label: '重命名',
          onPress: () => handleOpenRename(actionTarget),
        });
      }

      actions.push(
        {
          key: 'move',
          label: isTrashView ? '移动到云盘' : '移动',
          onPress: () => handleOpenMove(actionTarget),
        },
        {
          key: 'delete',
          label: finalGroupId ? '移除' : isTrashView ? '彻底删除' : '删除',
          variant: 'danger',
          onPress: () => handleOpenDelete(actionTarget),
        }
      );

      return actions;
    },
    [
      finalGroupId,
      handleClickNode,
      handleEnterFolder,
      handleOpenDelete,
      handleOpenMove,
      handleOpenRename,
      isTrashView,
    ]
  );

  const handleRowSelect = useCallback(
    (row: DriveTableRow, ctx: FolderTableRowPressContext) => {
      if (row.node.type === 'loading') return;

      const nextSelectedRowKeys = resolveSelectionKeysAfterRowPress(selectedRowKeys, row.id, ctx);
      setSelectedRowKeys(nextSelectedRowKeys);

      if (ctx.modifierKey) {
        selectedNodeIdRef.current = nextSelectedRowKeys.has(row.id) ? row.node.id : null;
        scheduleSelectedNodeIdCommit(selectedNodeIdRef.current);
        return;
      }

      if (selectedNodeIdRef.current === row.node.id && selectedRowKeys.size <= 1) {
        handleRowActivate(row);
        return;
      }

      selectedNodeIdRef.current = row.node.id;
      scheduleSelectedNodeIdCommit(row.node.id);
    },
    [handleRowActivate, scheduleSelectedNodeIdCommit, selectedRowKeys]
  );

  const resolveDragSourceIds = useCallback(
    (row: DriveTableRow): string[] => {
      if (!isDriveMoveSource(row)) {
        return [];
      }
      if (selectedRowKeys.has(row.id)) {
        return [...selectedRowKeys].filter((rowId) => {
          const selectedRow = rowMap.get(rowId);
          return selectedRow ? isDriveMoveSource(selectedRow) : false;
        });
      }
      return [row.id];
    },
    [rowMap, selectedRowKeys]
  );

  const canDropRowsToTargetNode = useCallback(
    (sourceRowIds: string[], targetNode: DriveNode): boolean => {
      if (sourceRowIds.length === 0 || !isDriveMoveTargetNode(targetNode)) {
        return false;
      }
      if (sourceRowIds.includes(targetNode.id)) {
        return false;
      }
      return sourceRowIds.every((rowId) => {
        const sourceRow = rowMap.get(rowId);
        return Boolean(sourceRow && sourceRow.node.scope.rootId === targetNode.scope.rootId);
      });
    },
    [rowMap]
  );

  const canDropRowsToTarget = useCallback(
    (sourceRowIds: string[], targetRow: DriveTableRow): boolean =>
      canDropRowsToTargetNode(sourceRowIds, targetRow.node),
    [canDropRowsToTargetNode]
  );

  const handleRowDragStart = useCallback(
    (row: DriveTableRow, event: DragEvent<HTMLElement>) => {
      const sourceRowIds = resolveDragSourceIds(row);
      if (sourceRowIds.length === 0 || movingByDrag) {
        event.preventDefault();
        return;
      }

      const nextDraggingRowKeys = new Set(sourceRowIds);
      updateDraggingRowKeys(nextDraggingRowKeys);
      if (!selectedRowKeys.has(row.id)) {
        setSelectedRowKeys(nextDraggingRowKeys);
        selectedNodeIdRef.current = row.node.id;
        scheduleSelectedNodeIdCommit(row.node.id);
      }

      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-wisepen-drive-row-ids', sourceRowIds.join('\n'));
      event.dataTransfer.setData('text/plain', row.name);
    },
    [
      movingByDrag,
      resolveDragSourceIds,
      scheduleSelectedNodeIdCommit,
      selectedRowKeys,
      updateDraggingRowKeys,
    ]
  );

  const handleRowDragOver = useCallback(
    (row: DriveTableRow, event: DragEvent<HTMLElement>) => {
      const sourceRowIds = [...draggingRowKeysRef.current];
      if (!canDropRowsToTarget(sourceRowIds, row)) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropTargetBreadcrumbId(null);
      setDropTargetRowId(row.id);
    },
    [canDropRowsToTarget]
  );

  const handleRowDragLeave = useCallback((row: DriveTableRow, event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setDropTargetRowId((current) => (current === row.id ? null : current));
  }, []);

  const handleRowDrop = useCallback(
    (row: DriveTableRow, event: DragEvent<HTMLElement>) => {
      const sourceRowIds = [...draggingRowKeysRef.current];
      if (!canDropRowsToTarget(sourceRowIds, row)) {
        return;
      }
      event.preventDefault();
      setDropTargetRowId(null);
      runMoveRowsByDrag({ sourceRowIds, targetFolderNodeId: row.node.id });
    },
    [canDropRowsToTarget, runMoveRowsByDrag]
  );

  const handleBreadcrumbDragOver = useCallback(
    (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => {
      const targetNode = pathNodeMap.get(item.id);
      const sourceRowIds = [...draggingRowKeysRef.current];
      if (!targetNode || !canDropRowsToTargetNode(sourceRowIds, targetNode)) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDropTargetRowId(null);
      setDropTargetBreadcrumbId(item.id);
    },
    [canDropRowsToTargetNode, pathNodeMap]
  );

  const handleBreadcrumbDragLeave = useCallback(
    (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }
      setDropTargetBreadcrumbId((current) => (current === item.id ? null : current));
    },
    []
  );

  const handleBreadcrumbDrop = useCallback(
    (item: FolderTableBreadcrumbItem, event: DragEvent<HTMLElement>) => {
      const targetNode = pathNodeMap.get(item.id);
      const sourceRowIds = [...draggingRowKeysRef.current];
      if (!targetNode || !canDropRowsToTargetNode(sourceRowIds, targetNode)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDropTargetRowId(null);
      setDropTargetBreadcrumbId(null);
      runMoveRowsByDrag({ sourceRowIds, targetFolderNodeId: targetNode.id });
    },
    [canDropRowsToTargetNode, pathNodeMap, runMoveRowsByDrag]
  );

  const handleRowDragEnd = useCallback(() => {
    updateDraggingRowKeys(new Set());
    setDropTargetRowId(null);
    setDropTargetBreadcrumbId(null);
  }, [updateDraggingRowKeys]);

  const breadcrumb = useMemo(
    () => (
      <FolderTable.Breadcrumb
        items={breadcrumbItems}
        onJump={handleEnterFolder}
        dropTarget={{
          isDropActive: (item) => dropTargetBreadcrumbId === item.id,
          onDragEnter: handleBreadcrumbDragOver,
          onDragOver: handleBreadcrumbDragOver,
          onDragLeave: handleBreadcrumbDragLeave,
          onDrop: handleBreadcrumbDrop,
        }}
      />
    ),
    [
      breadcrumbItems,
      dropTargetBreadcrumbId,
      handleBreadcrumbDragLeave,
      handleBreadcrumbDragOver,
      handleBreadcrumbDrop,
      handleEnterFolder,
    ]
  );

  const rowDragDrop = useMemo<FolderTableRowDragDrop<DriveTableRow>>(
    () => ({
      getRowState: (row) => ({
        draggable: isDriveMoveSource(row) && !movingByDrag,
        dragging: draggingRowKeys.has(row.id),
        dropTarget: dropTargetRowId === row.id,
      }),
      onDragStart: handleRowDragStart,
      onDragOver: handleRowDragOver,
      onDragEnter: handleRowDragOver,
      onDragLeave: handleRowDragLeave,
      onDrop: handleRowDrop,
      onDragEnd: handleRowDragEnd,
    }),
    [
      draggingRowKeys,
      dropTargetRowId,
      handleRowDragEnd,
      handleRowDragLeave,
      handleRowDragOver,
      handleRowDragStart,
      handleRowDrop,
      movingByDrag,
    ]
  );

  return (
    <main className={styles.listArea}>
      <div className={styles.driveFrame}>
        <div className={styles.driveBody}>
          <div className={styles.tablePanel}>
            <FolderTable<DriveTableRow>
              ariaLabel="云盘文件列表"
              items={rows}
              columns={DRIVE_TABLE_COLUMNS}
              loading={loading}
              breadcrumb={breadcrumb}
              toolbar={toolbar}
              expandedRowKeys={expandedRowKeys}
              onExpandedChange={handleExpandedChange}
              selectedRowKeys={selectedRowKeys}
              onRowSelect={handleRowSelect}
              onRowActivate={handleRowActivate}
              rowDragDrop={rowDragDrop}
              totalCount={currentDirectoryItemCount}
              summary={`当前目录共 ${currentDirectoryItemCount} 项`}
              className={styles.table}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              rowActions={resolveRowActions}
            />
          </div>

          <div className={styles.detailPanel}>
            <TableDriveSelectionPanel
              selectedRow={selectedRowKeys.size > 1 ? undefined : selectedNode}
              selectedCount={selectedRowKeys.size}
              groupId={finalGroupId}
              isTrashView={isTrashView}
              canManageTagPermission={showManagePermission && !isTrashView}
              tagPermissionRefreshToken={tagPermissionRefreshToken}
              resourcePermissionRefreshToken={resourcePermissionRefreshToken}
              onEnter={handleEnterFolder}
              onOpen={handleClickNode}
              onRename={handleOpenRename}
              onMove={handleOpenMove}
              onDelete={handleOpenDelete}
              onManageTagPermission={openTagPermission}
              onManageResourcePermission={openResourcePermission}
              onTagPermissionChange={refreshDrive}
            />
          </div>
        </div>
      </div>
      {ModalHost}
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        groupId={finalGroupId}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refreshDrive}
      />
      <MoveNodeModal
        isOpen={Boolean(moveTarget)}
        node={moveTarget}
        rootId={finalRootId}
        groupId={finalGroupId}
        isTrashView={isTrashView}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        onSuccess={handleNodeActionSuccess}
      />
      <DeleteNodeModal
        isOpen={Boolean(deleteTarget)}
        node={deleteTarget}
        groupId={finalGroupId}
        isTrashView={isTrashView}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={handleNodeActionSuccess}
      />
    </main>
  );
});

export default TableDrive;
