import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Table, Button } from 'antd';
import { LuTag, LuFolderPlus, LuChevronRight, LuChevronDown, LuHouse } from 'react-icons/lu';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import type { ResourceItem } from '@/types/resource';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { useTagService } from '@/contexts/ServicesContext';
import {
  NewTagModal,
  RenameTagModal,
  DeleteTagModal,
  RenameFileModal,
  DeleteFileModal,
  EditTagModal,
  UploadFileToGroupModal,
  type MoveToFolderTarget,
} from '@/components/Drive/Modals';
import { useClickFile, useTreeDrive } from '@/hooks/drive';
import type { ITreeDriveAdapter, TreeDriveNode } from '@/hooks/drive/useTreeDrive.type';
import type { TreeRowItem } from '../index.type';
import { getTreeDriveColumns, type TreeDriveColumnConfigOptions } from '../config/columnConfig';
import {
  getTreeDriveRowProps,
  createOnRowClick,
  type TreeDriveRowConfigOptions,
} from '../config/rowConfig';
import styles from '../style.module.less';
import type { GroupFileOrgLogic } from '@/types/group';

export interface TagDriveProps {
  groupId?: string;
  /** 只读：隐藏新建标签与行内操作 */
  fileOrgLogic?: GroupFileOrgLogic;
  canCreateTag: boolean;
}

const TAG_VIRTUAL_ROOT_ID = '__tag_root__';

const TagDrive: React.FC<TagDriveProps> = ({ groupId, fileOrgLogic, canCreateTag }) => {
  const tagService = useTagService();
  const clickFile = useClickFile();
  const virtualRootRef = useRef<TreeDriveNode | null>(null);

  const adapter = useMemo<ITreeDriveAdapter>(() => {
    return {
      loadTree: async (gid) => {
        const roots = await tagService.getTagTree(gid);
        const root: TreeDriveNode = {
          tagId: TAG_VIRTUAL_ROOT_ID,
          tagName: '全部标签',
          groupId: gid,
          children: roots,
        };
        virtualRootRef.current = root;
        return root;
      },
      getNodeById: (nodeId, gid) => {
        if (nodeId === TAG_VIRTUAL_ROOT_ID && virtualRootRef.current) {
          return virtualRootRef.current;
        }
        return tagService.getTagById(nodeId, gid);
      },
      getNodeContents: async ({ node, filePage, filePageSize }) => {
        if (node.tagId === TAG_VIRTUAL_ROOT_ID) {
          const roots = await tagService.getTagTree(node.groupId);
          return { childNodes: roots, files: [], totalFiles: 0 };
        }
        const res = await tagService.getResByTag({ tag: node, filePage, filePageSize });
        return { childNodes: res.tags, files: res.files, totalFiles: res.totalFiles };
      },
    };
  }, [tagService]);

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
  } = useTreeDrive({ adapter, groupId, cwdStoreKey: 'tag' });

  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagParentId, setNewTagParentId] = useState<string | undefined>(undefined);
  const [newTagParentLabel, setNewTagParentLabel] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState<ResourceItem | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<ResourceItem | null>(null);
  const [renameTagTarget, setRenameTagTarget] = useState<TagTreeNode | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<TagTreeNode | null>(null);
  const [editTagTarget, setEditTagTarget] = useState<MoveToFolderTarget | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleRenameFolder = useCallback((node: TagTreeNode) => {
    if (node.tagId === TAG_VIRTUAL_ROOT_ID) return;
    setRenameTagTarget(node);
  }, []);
  const handleDeleteFolder = useCallback((node: TagTreeNode) => {
    if (node.tagId === TAG_VIRTUAL_ROOT_ID) return;
    setDeleteTagTarget(node);
  }, []);
  const handleRenameFile = useCallback((file: ResourceItem) => {
    setRenameFileTarget(file);
  }, []);
  const handleDeleteFile = useCallback((file: ResourceItem) => {
    setDeleteFileTarget(file);
  }, []);
  const handleEditTag = useCallback((t: MoveToFolderTarget) => {
    setEditTagTarget(t);
  }, []);

  const handleCloseEditTag = useCallback(() => {
    setEditTagTarget(null);
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

  const noop = useCallback(() => {}, []);

  const handleOpenNewTag = useCallback(() => {
    if (breadcrumb.length === 0) {
      setNewTagParentId(undefined);
      setNewTagParentLabel(undefined);
    } else {
      const last = breadcrumb[breadcrumb.length - 1];
      setNewTagParentId(last.tagId);
      setNewTagParentLabel(last.tagName);
    }
    setNewTagOpen(true);
  }, [breadcrumb]);

  const handleCloseNewTag = useCallback(() => {
    setNewTagOpen(false);
    setNewTagParentId(undefined);
    setNewTagParentLabel(undefined);
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalOpen(false);
  }, []);

  const createActionLabel = fileOrgLogic === 'FOLDER' ? '新建文件夹' : '新建标签';
  const createActionIcon =
    fileOrgLogic === 'FOLDER' ? <LuFolderPlus size={16} /> : <LuTag size={16} />;

  const getRowProps = useMemo(
    () =>
      getTreeDriveRowProps({
        mode: 'tag',
        setIsDragging,
        styles: styles as TreeDriveRowConfigOptions['styles'],
        onRowClick: handleRowClick,
        onDropFile: noop as unknown as TreeDriveRowConfigOptions['onDropFile'],
        onDropFolder: noop as unknown as TreeDriveRowConfigOptions['onDropFolder'],
      }),
    [handleRowClick, noop]
  );

  const columns = getTreeDriveColumns({
    mode: 'tag',
    styles: styles as TreeDriveColumnConfigOptions['styles'],
    openDropdownKey,
    setOpenDropdownKey,
    onMoveToFolder: noop as unknown as TreeDriveColumnConfigOptions['onMoveToFolder'],
    onEditTag: handleEditTag,
    onRenameFolder: handleRenameFolder,
    onDeleteFolder: handleDeleteFolder,
    onRenameFile: handleRenameFile,
    onDeleteFile: handleDeleteFile,
    onLoadMore: handleLoadMore,
    loadingMoreKeys,
    fileOrgLogic,
  });

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
              <span>小组云盘</span>
            </button>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={item.tagId}>
                <LuChevronRight size={12} className={styles.breadcrumbSep} />
                <button
                  type="button"
                  className={`${styles.breadcrumbItem} ${idx === breadcrumb.length - 1 ? styles.breadcrumbItemActive : ''}`}
                  onClick={() => navigateToIndex(idx)}
                >
                  {item.tagName}
                </button>
              </React.Fragment>
            ))}
          </nav>

          <div className={styles.toolbarActions}>
            <Button
              type="default"
              size="small"
              icon={<AiOutlineCloudUpload size={16} />}
              onClick={handleOpenUploadModal}
            >
              上传文件
            </Button>

            {canCreateTag && (
              <Button
                type="default"
                size="small"
                icon={createActionIcon}
                onClick={handleOpenNewTag}
              >
                {createActionLabel}
              </Button>
            )}
          </div>
        </div>

        <NewTagModal
          open={newTagOpen}
          groupId={groupId}
          subjectLabel={fileOrgLogic === 'FOLDER' ? '文件夹' : '标签'}
          parentTagId={newTagParentId}
          parentDisplayName={newTagParentLabel}
          onCancel={handleCloseNewTag}
          onSuccess={refresh}
        />

        {groupId && fileOrgLogic && (
          <UploadFileToGroupModal
            open={uploadModalOpen}
            onCancel={handleCloseUploadModal}
            groupId={groupId}
            fileOrgLogic={fileOrgLogic}
            onSuccess={refresh}
          />
        )}

        <RenameTagModal
          open={renameTagTarget !== null}
          tag={renameTagTarget}
          groupId={groupId}
          onCancel={() => setRenameTagTarget(null)}
          onSuccess={refresh}
        />
        <DeleteTagModal
          open={deleteTagTarget !== null}
          tag={deleteTagTarget}
          groupId={groupId}
          onCancel={() => setDeleteTagTarget(null)}
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

        <EditTagModal
          open={editTagTarget !== null}
          target={editTagTarget}
          groupId={groupId}
          onCancel={handleCloseEditTag}
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

export default TagDrive;
