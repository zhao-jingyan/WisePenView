import IconText from '@/components/IconText';
import {
  FolderTable,
  type FolderTableBreadcrumbItem,
  type FolderTableRowProps,
} from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import { Button } from '@heroui/react';
import { CloudUpload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
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

  const handleEnterFolder = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(null);
      enterFolder(nodeId);
    },
    [enterFolder]
  );
  const handleClickNode = useClickNode({
    enterFolder: handleEnterFolder,
    groupId: finalGroupId,
  });
  const { onDrop } = useDriveDrop({ refresh, groupId: finalGroupId });
  const rows = useMemo(() => dataSource.map((node) => toDriveTableRow(node)), [dataSource]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? findTreeNodeById(rows, selectedNodeId) : undefined),
    [rows, selectedNodeId]
  );
  const currentDirectoryItemCount = useMemo(
    () => rows.filter((row) => row.entryType !== 'loading').length,
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
  };

  const getRowProps = (row: DriveTableRow): FolderTableRowProps => {
    const node = row.node;
    const base: FolderTableRowProps = {};

    if (node.type === 'loading') {
      base['aria-busy'] = true;
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

  const handleRowSelect = (row: DriveTableRow) => {
    if (isDraggingRef.current || row.node.type === 'loading') return;
    if (selectedNodeId === row.node.id) {
      handleRowActivate(row);
      return;
    }
    setSelectedNodeId(row.node.id);
  };

  return (
    <main className={styles.listArea}>
      <div className={styles.tableLayout}>
        <FolderTable<DriveTableRow>
          ariaLabel="云盘文件列表"
          items={rows}
          loading={loading}
          breadcrumb={
            <FolderTable.Breadcrumb
              items={breadcrumbItems}
              onJump={(nodeId) => handleEnterFolder(nodeId)}
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
          selectedRowKey={selectedNode?.id}
          onRowSelect={handleRowSelect}
          onRowActivate={handleRowActivate}
          getRowProps={getRowProps}
          rowActions={rowActions}
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
