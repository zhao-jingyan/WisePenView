import React from 'react';
import { Dropdown, Spin } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AiOutlineFolder, AiOutlineTag } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuFolderInput, LuTag } from 'react-icons/lu';
import { formatSize } from '@/utils/format';
import { getFolderDisplayName } from '@/utils/path';
import type { ResourceItem } from '@/types/resource';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { MoveToFolderTarget } from '@/components/Drive/Modals';
import type { GroupFileOrgLogic } from '@/types/group';
import type { TreeRowItem, TreeDriveMode, LoadMoreRowItem } from '../index.type';

export interface TreeDriveColumnConfigOptions {
  /** 视图模式：tag 时树节点用 tag 图标 */
  mode: TreeDriveMode;
  styles: {
    nameCell: string;
    optionBtn: string;
    actionCellPlaceholder: string;
    loadMoreCell: string;
  };
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
  onMoveToFolder: (target: MoveToFolderTarget) => void;
  /** tag 模式下点击「编辑标签」时调用 */
  onEditTag?: (target: MoveToFolderTarget) => void;
  onRenameFolder: (node: TagTreeNode) => void;
  onDeleteFolder: (node: TagTreeNode) => void;
  onRenameFile: (file: ResourceItem) => void;
  onDeleteFile: (file: ResourceItem) => void;
  /** 「加载更多」点击回调 */
  onLoadMore: (record: LoadMoreRowItem) => void;
  /** 正在加载更多的 key 集合，用于显示 loading 状态 */
  loadingMoreKeys: ReadonlySet<string>;
  /** 只读：操作列保留占位，不展示下拉菜单 */
  readOnlyMode?: boolean;
  /** 小组文件组织模式：TAG/FOLDER，仅用于展示图标 */
  fileOrgLogic?: GroupFileOrgLogic;
}

export function getTreeDriveColumns(
  options: TreeDriveColumnConfigOptions
): ColumnsType<TreeRowItem> {
  const {
    mode,
    styles,
    openDropdownKey,
    setOpenDropdownKey,
    onMoveToFolder,
    onEditTag,
    onRenameFolder,
    onDeleteFolder,
    onRenameFile,
    onDeleteFile,
    onLoadMore,
    loadingMoreKeys,
    readOnlyMode = false,
    fileOrgLogic,
  } = options;

  const columns: ColumnsType<TreeRowItem> = [
    {
      title: '名称',
      dataIndex: '_',
      key: 'name',
      onHeaderCell: () => ({
        style: { paddingLeft: 'calc(8px + 20px + var(--ant-margin-xs))' }, //内联样式，植入到<th>标签中，避免被table样式覆盖
      }),
      render: (_: unknown, record: TreeRowItem) => {
        if (record._type === 'loadMore') {
          const isLoading = loadingMoreKeys.has(record.key);
          return (
            <button
              type="button"
              className={styles.loadMoreCell}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoading) onLoadMore(record);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spin size="small" />
                  <span>加载中…</span>
                </>
              ) : (
                <span>
                  加载更多文件（已加载 {record.loadedFiles} / 共 {record.totalFiles}）
                </span>
              )}
            </button>
          );
        }
        return (
          <div className={styles.nameCell}>
            {record._type === 'folder' ? (
              mode === 'tag' && fileOrgLogic !== 'FOLDER' ? (
                <AiOutlineTag size={20} color="var(--ant-color-primary)" />
              ) : (
                <AiOutlineFolder size={20} color="var(--ant-color-warning)" />
              )
            ) : (
              <FileTypeIcon
                resourceType={record.data.resourceType}
                size={18}
                color="var(--ant-color-text-secondary)"
              />
            )}
            <span>
              {record._type === 'folder'
                ? getFolderDisplayName(record.data.tagName)
                : record.data.resourceName || '未命名'}
            </span>
          </div>
        );
      },
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render: (_: unknown, record: TreeRowItem) =>
        record._type === 'file'
          ? formatSize(record.data.size)
          : record._type === 'loadMore'
            ? null
            : '-',
    },
    {
      title: '类型',
      key: 'type',
      width: 100,
      render: (_: unknown, record: TreeRowItem) =>
        record._type === 'loadMore'
          ? null
          : record._type === 'folder'
            ? mode === 'tag'
              ? '标签'
              : '文件夹'
            : (record.data.resourceType ?? '-'),
    },
    {
      title: '',
      key: 'action',
      width: 56,
      align: 'right',
      render: (_: unknown, record: TreeRowItem) => {
        if (record._type === 'loadMore') return null;
        if (readOnlyMode) {
          return (
            <span className={styles.actionCellPlaceholder} aria-hidden>
              <LuEllipsisVertical size={18} />
            </span>
          );
        }
        const rowKey = record.key;
        const showEditTag = mode === 'tag' && record._type === 'file';
        const showMoveToFolder = mode === 'folder';
        const handleEditTag = (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
          info.domEvent.stopPropagation();
          setOpenDropdownKey(null);
          onEditTag?.({ type: 'file', data: record.data as ResourceItem });
        };
        const handleMoveToFolder = (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
          info.domEvent.stopPropagation();
          setOpenDropdownKey(null);
          onMoveToFolder(
            record._type === 'folder'
              ? { type: 'folder', data: record.data }
              : { type: 'file', data: record.data }
          );
        };
        const firstItem: MenuProps['items'] =
          showEditTag && onEditTag
            ? [
                {
                  key: 'editTag',
                  label: '编辑标签',
                  icon: <LuTag size={14} />,
                  onClick: handleEditTag,
                },
              ]
            : showMoveToFolder
              ? [
                  {
                    key: 'move',
                    label: '移动到文件夹',
                    icon: <LuFolderInput size={14} />,
                    onClick: handleMoveToFolder,
                  },
                ]
              : [];
        const menuItems: MenuProps['items'] =
          record._type === 'folder'
            ? [
                ...firstItem,
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onRenameFolder(record.data);
                  },
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <LuTrash2 size={14} />,
                  danger: true,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onDeleteFolder(record.data);
                  },
                },
              ]
            : [
                ...firstItem,
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <LuPencil size={14} />,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onRenameFile(record.data as ResourceItem);
                  },
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <LuTrash2 size={14} />,
                  danger: true,
                  onClick: (info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
                    info.domEvent.stopPropagation();
                    setOpenDropdownKey(null);
                    onDeleteFile(record.data as ResourceItem);
                  },
                },
              ];
        if (menuItems.length === 0) return null;
        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            getPopupContainer={() => document.body}
            open={openDropdownKey === rowKey}
            onOpenChange={(open) => setOpenDropdownKey(open ? rowKey : null)}
          >
            <button
              type="button"
              className={styles.optionBtn}
              aria-label="更多操作"
              onClick={(e) => e.stopPropagation()}
            >
              <LuEllipsisVertical size={18} />
            </button>
          </Dropdown>
        );
      },
    },
  ];

  return columns;
}
