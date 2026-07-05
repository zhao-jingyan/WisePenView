import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableColumn,
} from '@/components/Table';
import { resolveSelectedCount } from '@/components/Table/shared/TableBase/tableSelection';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { useTrashTagStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import { Button, toast, type Selection, type SortDescriptor } from '@heroui/react';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { Trash2 } from 'lucide-react';
import {
  forwardRef,
  startTransition,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  buildTrashFolderNodeId,
  getDriveNodeLabel,
  resolveCurrentFolderTagId,
  resolveDriveScope,
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
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchSelectedKeys, setBatchSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedCommitFrameRef = useRef<number | null>(null);
  const selectedCommitTimerRef = useRef<number | null>(null);

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
    scheduleSelectedNodeIdCommit(null);
  }, [scheduleSelectedNodeIdCommit]);

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      selectedNodeIdRef.current = null;
      scheduleSelectedNodeIdCommit(null);
      setBatchEditMode(false);
      setBatchSelectedKeys(new Set());
      enterFolder(nodeId);
    },
    [enterFolder, scheduleSelectedNodeIdCommit]
  );
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
    groupId: finalGroupId,
  });
  const rows = useMemo(() => dataSource.map((node) => toDriveTableRow(node)), [dataSource]);
  const rowMap = useMemo(() => buildDriveTableRowMap(rows), [rows]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? rowMap.get(selectedNodeId) : undefined),
    [rowMap, selectedNodeId]
  );
  const currentDirectoryItemCount = useMemo(
    () => rows.filter((row) => row.entryType !== 'loading').length,
    [rows]
  );
  const batchDisabledKeys = useMemo(
    () => rows.filter((row) => row.entryType === 'loading').map((row) => row.id),
    [rows]
  );
  const batchSelectedCount = resolveSelectedCount(batchSelectedKeys, currentDirectoryItemCount);
  const exitBatchEditMode = useCallback(() => {
    setBatchEditMode(false);
    setBatchSelectedKeys(new Set());
  }, []);

  const enterBatchEditMode = useCallback(() => {
    handleClearSelection();
    setBatchEditMode(true);
    setBatchSelectedKeys(new Set());
  }, [handleClearSelection]);

  const trashTagId = useTrashTagStore((state) => state.getTrashTagId(finalGroupId));
  const trashFolderNodeId = useMemo(
    () => (trashTagId ? buildTrashFolderNodeId(trashTagId) : undefined),
    [trashTagId]
  );
  const isTrashView = currentNodeId === trashFolderNodeId;

  const openTrash = useCallback(async () => {
    if (isTrashView) {
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
  }, [driveService, finalGroupId, finalRootId, handleEnterFolder, isTrashView]);

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
    showManagePermission,
    createMenuItems,
    handleCreateMenuSelect,
    openTagPermission,
    ModalHost,
  } = useTableDriveActions({
    currentNodeId,
    currentRows: rows,
    groupId: finalGroupId,
    actions,
    refresh,
    onUploadSuccess,
    targetTagId,
    isTrashView,
  });
  const breadcrumb = useMemo(
    () => <FolderTable.Breadcrumb items={breadcrumbItems} onJump={handleEnterFolder} />,
    [breadcrumbItems, handleEnterFolder]
  );
  const toolbar = useMemo(
    () => (
      <div className={styles.toolbarActions}>
        {showCreateMenu ? (
          <CreateMenu items={createMenuItems} onSelect={handleCreateMenuSelect} />
        ) : null}
        {showManagePermission ? (
          <Button variant="secondary" size="sm" onPress={openTagPermission}>
            标签权限管理
          </Button>
        ) : null}
        {showToolbarTrash ? (
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
        {batchEditMode ? (
          <Button variant="ghost" size="sm" onPress={exitBatchEditMode}>
            取消
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onPress={enterBatchEditMode}>
            全局编辑
          </Button>
        )}
      </div>
    ),
    [
      batchEditMode,
      createMenuItems,
      enterBatchEditMode,
      exitBatchEditMode,
      handleCreateMenuSelect,
      isTrashView,
      openTagPermission,
      openTrash,
      showCreateMenu,
      showManagePermission,
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

  const handleRowSelect = useCallback(
    (row: DriveTableRow) => {
      if (batchEditMode || row.node.type === 'loading') return;
      if (selectedNodeIdRef.current === row.node.id) {
        handleRowActivate(row);
        return;
      }
      selectedNodeIdRef.current = row.node.id;
      scheduleSelectedNodeIdCommit(row.node.id);
    },
    [batchEditMode, handleRowActivate, scheduleSelectedNodeIdCommit]
  );

  return (
    <main className={styles.listArea}>
      <div className={styles.driveFrame}>
        <div className={styles.driveBody}>
          <FolderTable<DriveTableRow>
            ariaLabel="云盘文件列表"
            items={rows}
            columns={DRIVE_TABLE_COLUMNS}
            loading={loading}
            breadcrumb={breadcrumb}
            toolbar={toolbar}
            expandedRowKeys={expandedRowKeys}
            onExpandedChange={handleExpandedChange}
            onRowSelect={batchEditMode ? undefined : handleRowSelect}
            onRowActivate={handleRowActivate}
            totalCount={currentDirectoryItemCount}
            summary={`当前目录共 ${currentDirectoryItemCount} 项`}
            className={styles.table}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            batchSelection={
              batchEditMode
                ? {
                    selectedKeys: batchSelectedKeys,
                    disabledKeys: batchDisabledKeys,
                    onSelectionChange: setBatchSelectedKeys,
                  }
                : undefined
            }
          />
          <div className={styles.detailPanel}>
            <TableDriveSelectionPanel
              selectedRow={batchEditMode ? undefined : selectedNode}
              batchEditMode={batchEditMode}
              batchSelectedCount={batchSelectedCount}
              groupId={finalGroupId}
              onEnter={handleEnterFolder}
              onOpen={handleClickNode}
              onClear={handleClearSelection}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
      {ModalHost}
    </main>
  );
});

export default TableDrive;
