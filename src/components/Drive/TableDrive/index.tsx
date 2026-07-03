import IconText from '@/components/IconText';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableColumn,
} from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import { Button } from '@heroui/react';
import { useUnmount } from 'ahooks';
import { CloudUpload } from 'lucide-react';
import { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import { getDriveNodeLabel, resolveDriveScope } from '../common/driveComponentModel';
import { useClickNode } from '../common/useClickNode';
import type { DriveRow, DriveTableRow, TableDriveProps } from './index.type';
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

function TableDrive({ groupId, rootId, scope, actions }: TableDriveProps) {
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

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      selectedNodeIdRef.current = null;
      scheduleSelectedNodeIdCommit(null);
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
  const breadcrumbItems = useMemo(() => toBreadcrumbItems(pathNodes), [pathNodes]);
  const {
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
    groupId: finalGroupId,
    actions,
    refresh,
  });
  const breadcrumb = useMemo(
    () => <FolderTable.Breadcrumb items={breadcrumbItems} onJump={handleEnterFolder} />,
    [breadcrumbItems, handleEnterFolder]
  );
  const toolbar = useMemo(
    () => (
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
    ),
    [
      openNewFolder,
      openTagPermission,
      openUploadToGroup,
      showCreateFolder,
      showManagePermission,
      showUploadToGroup,
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
      if (row.node.type === 'loading') return;
      if (selectedNodeIdRef.current === row.node.id) {
        handleRowActivate(row);
        return;
      }
      selectedNodeIdRef.current = row.node.id;
      scheduleSelectedNodeIdCommit(row.node.id);
    },
    [handleRowActivate, scheduleSelectedNodeIdCommit]
  );

  return (
    <main className={styles.listArea}>
      <div className={styles.tableLayout}>
        <FolderTable<DriveTableRow>
          ariaLabel="云盘文件列表"
          items={rows}
          columns={DRIVE_TABLE_COLUMNS}
          loading={loading}
          breadcrumb={breadcrumb}
          toolbar={toolbar}
          expandedRowKeys={expandedRowKeys}
          onExpandedChange={handleExpandedChange}
          onRowSelect={handleRowSelect}
          onRowActivate={handleRowActivate}
          totalCount={currentDirectoryItemCount}
          summary={`当前目录共 ${currentDirectoryItemCount} 项`}
          className={styles.table}
        />
        <aside className={styles.selectionPanel} aria-label="选中节点操作区域">
          <div className={styles.selectionPanelTitle}>选中节点</div>
          <div className={styles.selectionMeta}>
            <span className={styles.selectionLabel}>节点 ID</span>
            <span className={styles.selectionValue}>{selectedNode?.id ?? '未选中'}</span>
          </div>
        </aside>
      </div>
      {ModalHost}
    </main>
  );
}

export default TableDrive;
