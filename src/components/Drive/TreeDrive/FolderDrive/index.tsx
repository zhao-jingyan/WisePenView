import {
  DeleteFileModal,
  DeleteFolderModal,
  MoveToFolderModal,
  NewFolderModal,
  RenameFileModal,
  RenameFolderModal,
  type MoveToFolderTarget,
} from '@/components/Drive/Modals';
import { useFolderService } from '@/domains';
import type { Folder } from '@/domains/Folder';
import { mapFolderToTagTreeNode } from '@/domains/Folder';
import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag/service/index.type';
import { useClickFile, useTreeDrive, useTreeDriveDrop } from '@/hooks/drive';
import type { ITreeDriveAdapter } from '@/hooks/drive/useTreeDrive.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getFolderDisplayName } from '@/utils/tag/path';
import { Button, Table } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { LuChevronDown, LuChevronRight, LuFolderPlus, LuHouse } from 'react-icons/lu';
import { getTreeDriveColumns, type TreeDriveColumnConfigOptions } from '../config/columnConfig';
import {
  createOnRowClick,
  getTreeDriveRowProps,
  type TreeDriveRowConfigOptions,
} from '../config/rowConfig';
import type { TreeRowItem } from '../index.type';
import styles from '../style.module.less';

const FolderDrive: React.FC = () => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const clickFile = useClickFile();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<Folder | null>(null);

  // 将folderService的方法交给TreeDrive的适配器
  const adapter = useMemo<ITreeDriveAdapter>(
    () => ({
      loadTree: async (gid) =>
        mapFolderToTagTreeNode(await folderService.getFolderTree({ groupId: gid })),
      getNodeById: (nodeId, gid) => {
        const f = folderService.getFolderById(nodeId, gid);
        return f ? mapFolderToTagTreeNode(f) : undefined;
      },
      getNodeContents: async ({ node, filePage, filePageSize }) => {
        const res = await folderService.getResByFolder({ folder: node, filePage, filePageSize });
        return {
          childNodes: res.folders.map(mapFolderToTagTreeNode),
          files: res.files,
          totalFiles: res.totalFiles,
        };
      },
    }),
    [folderService]
  );

  const {
    treeData,
    loading,
    expandedKeys,
    breadcrumb,
    loadingMoreKeys,
    refresh,
    handleExpandChange,
    handleTreeNodeClick,
    handleLoadMore,
    resetCwd,
    navigateToIndex,
  } = useTreeDrive({ adapter, cwdStoreKey: 'folder' });

  const { handleDrop, handleDropFolder } = useTreeDriveDrop({ folderService, refresh });

  const handleOpenNewFolder = useCallback(async () => {
    try {
      const root = await folderService.getFolderTree({});
      const parent: Folder | undefined =
        breadcrumb.length === 0
          ? root
          : folderService.getFolderById(breadcrumb[breadcrumb.length - 1].tagId);
      if (!parent) {
        message.error('无法确定当前目录，请稍后重试');
        return;
      }
      setNewFolderParent(parent);
      setNewFolderOpen(true);
    } catch (err) {
      message.error(parseErrorMessage(err, '加载目录失败'));
    }
  }, [folderService, breadcrumb, message]);

  const handleCloseNewFolder = useCallback(() => {
    setNewFolderOpen(false);
    setNewFolderParent(null);
  }, []);

  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveToFolderTarget | null>(null);

  // 作为useMemo的依赖，使用useCallback来避免重复创建函数导致不断更新
  const handleRenameFolder = useCallback((node: TagTreeNode) => {
    setRenameFolderTarget(node as Folder);
  }, []);

  const handleDeleteFolder = useCallback((node: TagTreeNode) => {
    setDeleteFolderTarget(node as Folder);
  }, []);

  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
  }, []);

  const handleDeleteFile = useCallback((file: ResourceItem) => {
    setDeleteFileTarget(file);
  }, []);

  const handleMoveToFolder = useCallback((t: MoveToFolderTarget) => {
    setMoveTarget(t);
  }, []);

  const handleCloseMoveToFolder = useCallback(() => {
    setMoveTarget(null);
  }, []);

  const handleRowClick = useMemo(
    () =>
      createOnRowClick({
        getIsDragging: () => isDragging,
        onTreeNodeClick: handleTreeNodeClick,
        onTreeLeafClick: clickFile,
      }),
    [isDragging, handleTreeNodeClick, clickFile]
  );

  const getRowProps = useMemo(
    () =>
      getTreeDriveRowProps({
        mode: 'folder',
        setIsDragging,
        styles: styles as TreeDriveRowConfigOptions['styles'],
        onRowClick: handleRowClick,
        onDropFile: handleDrop,
        onDropFolder: handleDropFolder,
      }),
    [handleRowClick, handleDrop, handleDropFolder]
  );

  const columns = useMemo(
    () =>
      getTreeDriveColumns({
        mode: 'folder',
        styles: styles as TreeDriveColumnConfigOptions['styles'],
        openDropdownKey,
        setOpenDropdownKey,
        onMoveToFolder: handleMoveToFolder,
        onRenameFolder: handleRenameFolder,
        onDeleteFolder: handleDeleteFolder,
        onRenameFile: handleRenameFile,
        onDeleteFile: handleDeleteFile,
        onLoadMore: handleLoadMore,
        loadingMoreKeys,
      }),
    [
      openDropdownKey,
      handleMoveToFolder,
      handleRenameFolder,
      handleDeleteFolder,
      handleRenameFile,
      handleDeleteFile,
      handleLoadMore,
      loadingMoreKeys,
    ]
  );

  const expandIcon = useCallback(
    ({
      expanded,
      onExpand,
      record,
    }: {
      expanded: boolean;
      onExpand: (record: TreeRowItem, e: React.MouseEvent<HTMLElement>) => void;
      record: TreeRowItem;
    }) => {
      if (record._type !== 'folder') {
        return record._type === 'loadMore' ? null : <span className={styles.expandPlaceholder} />;
      }
      return (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(record, e);
          }}
        >
          {expanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        </button>
      );
    },
    []
  );

  return (
    <main className={styles.listArea}>
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <nav className={styles.breadcrumb}>
            <button
              type="button"
              className={`${styles.breadcrumbItem} ${breadcrumb.length === 0 ? styles.breadcrumbItemActive : ''}`}
              onClick={() => resetCwd()}
            >
              <LuHouse size={14} />
              <span>云盘</span>
            </button>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={item.tagId}>
                <LuChevronRight size={12} className={styles.breadcrumbSep} />
                <button
                  type="button"
                  className={`${styles.breadcrumbItem} ${idx === breadcrumb.length - 1 ? styles.breadcrumbItemActive : ''}`}
                  onClick={() => navigateToIndex(idx)}
                >
                  {getFolderDisplayName(item.tagName)}
                </button>
              </React.Fragment>
            ))}
          </nav>

          <Button
            type="default"
            size="small"
            icon={<LuFolderPlus size={16} />}
            onClick={handleOpenNewFolder}
          >
            新建文件夹
          </Button>
        </div>

        <NewFolderModal
          open={newFolderOpen}
          parentFolder={newFolderParent}
          onCancel={handleCloseNewFolder}
          onSuccess={refresh}
        />

        <RenameFolderModal
          open={renameFolderTarget !== null}
          folder={renameFolderTarget}
          onCancel={() => setRenameFolderTarget(null)}
          onSuccess={refresh}
        />
        <DeleteFolderModal
          open={deleteFolderTarget !== null}
          folder={deleteFolderTarget}
          onCancel={() => setDeleteFolderTarget(null)}
          onSuccess={refresh}
        />
        <RenameFileModal
          open={renameFileTarget !== null}
          file={renameFileTarget}
          onCancel={() => setRenameFileTarget(null)}
          onSuccess={refresh}
        />
        <DeleteFileModal
          open={deleteFileTarget !== null}
          file={deleteFileTarget}
          onCancel={() => setDeleteFileTarget(null)}
          onSuccess={refresh}
        />

        <MoveToFolderModal
          open={moveTarget !== null}
          target={moveTarget}
          onCancel={handleCloseMoveToFolder}
          onSuccess={refresh}
        />

        <div className={styles.scrollArea}>
          <div className={styles.tableWrapper}>
            <Table<TreeRowItem>
              dataSource={treeData}
              columns={columns}
              loading={loading}
              pagination={false}
              size="middle"
              rowKey="key"
              expandable={{
                expandedRowKeys: expandedKeys,
                onExpand: handleExpandChange,
                expandIcon,
                indentSize: 24,
              }}
              onRow={(record) => getRowProps(record)}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FolderDrive;
