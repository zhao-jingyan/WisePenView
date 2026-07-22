import TableDriveSelectionPanel from '@/components/Drive/TableDrive/parts/SelectionPanel';
import EntryIcon from '@/components/Icons/EntryIcon';
import FavoriteCollectionPicker from '@/components/Resource/FavoriteCollectionPicker';
import DataTable from '@/components/Table/DataTable';
import type { DataTableColumn } from '@/components/Table/DataTable/index.type';
import TableRowActions from '@/components/Table/shared/TableRowActions';
import type { TableRowActionItem } from '@/components/Table/shared/TableRowActions/index.type';
import type { FavoriteItem } from '@/domains/Interact';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { useFavoriteResourceTableController } from '../hooks/useFavoriteResourceTableController';
import styles from '../style.module.less';
import UnfavoriteResourceModal from './UnfavoriteResourceModal';

interface FavoriteResourceTableProps {
  collectionId: string;
  collectionName: string;
  collectionItemCount: number;
  onCollectionChanged: () => void;
  emptyDescription: string;
}

function FavoriteResourceTable({
  collectionId,
  collectionName,
  collectionItemCount,
  onCollectionChanged,
  emptyDescription,
}: FavoriteResourceTableProps) {
  const controller = useFavoriteResourceTableController({ collectionId, onCollectionChanged });

  const columns: DataTableColumn<FavoriteItem>[] = [
    {
      id: 'resource',
      label: '名称',
      width: 'fill',
      align: 'start',
      isRowHeader: true,
      className: styles.resourceNameColumn,
      renderCell: (item) => {
        if (!item.resourceInfo) {
          return (
            <span className={styles.resourceCellDisabled}>
              <EntryIcon entryType="resource" size={18} />
              <span>资源已删除</span>
            </span>
          );
        }
        const { resourceInfo } = item;
        return (
          <span className={styles.resourceCellButton}>
            <EntryIcon
              entryType="resource"
              resourceType={resourceInfo.resourceType}
              resourceName={resourceInfo.resourceName}
              resourceIconType={resourceInfo.resourceIconType}
              size={18}
            />
            <span className={styles.resourceCellName}>{resourceInfo.resourceName}</span>
          </span>
        );
      },
    },
    {
      id: 'type',
      label: '类型',
      width: 'md',
      renderCell: (item) => item.resourceInfo?.resourceType ?? '未知类型',
    },
    {
      id: 'favoritedAt',
      label: '收藏时间',
      width: 'md',
      renderCell: (item) => formatTimestampToDate(item.favoritedAt) || '—',
    },
    {
      id: 'unfavorite',
      label: '操作',
      width: 'sm',
      align: 'center',
      renderCell: (item) => {
        const actions: TableRowActionItem[] = [
          {
            key: 'open',
            label: '进入',
            disabled: !item.resourceInfo,
          },
          {
            key: 'manage',
            label: '管理收藏',
            disabled: !item.resourceInfo,
          },
          { key: 'remove', label: '移出收藏夹', variant: 'danger' },
        ];
        return (
          <TableRowActions
            ariaLabel={`${item.resourceInfo?.resourceName ?? '该资源'}操作`}
            actions={actions}
            onAction={(key) => controller.onRowAction(item, key)}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.resourceWorkspace}>
      <div className={styles.resourceTablePanel}>
        <header className={styles.resourcePanelHeader}>
          <div className={styles.resourcePanelCopy}>
            <h2 className={styles.resourcePanelTitle}>{collectionName}</h2>
            <p className={styles.resourcePanelDescription}>{collectionItemCount} 个内容</p>
          </div>
        </header>
        <DataTable
          ariaLabel="已收藏资源"
          items={controller.list}
          rowKey="resourceId"
          selectedRowKey={controller.selectedResourceId}
          onRowSelect={controller.onRowSelect}
          onRowActivate={controller.onRowActivate}
          columns={columns}
          loading={controller.loading}
          emptyText="暂无收藏内容"
          emptyDescription={emptyDescription}
          totalCount={controller.total}
          pagination={{
            total: controller.total,
            current: controller.page,
            pageSize: controller.pageSize,
            onChange: (nextPage) =>
              controller.setPage(
                Math.min(Math.max(1, nextPage), Math.max(1, controller.totalPage))
              ),
          }}
          className={styles.resourceTable}
        />
      </div>
      <aside className={styles.detailPanel}>
        <TableDriveSelectionPanel
          mode="favorite"
          selectedRow={controller.selectedRow}
          selectedCount={controller.selectedRow ? 1 : 0}
          onEnter={() => undefined}
          onOpen={controller.onDetailOpen}
          onRename={() => undefined}
          onMove={() => undefined}
          onDelete={() => undefined}
          onRemoveFavorite={() => {
            if (controller.selectedItem) controller.onRequestUnfavorite(controller.selectedItem);
          }}
        />
      </aside>
      <UnfavoriteResourceModal
        item={controller.unfavoriteItem}
        collectionId={collectionId}
        onOpenChange={(open) => {
          if (!open) controller.onCloseUnfavorite();
        }}
        onSuccess={controller.onUnfavoriteSuccess}
      />
      {controller.manageFavoriteItem?.resourceInfo ? (
        <FavoriteCollectionPicker
          key={controller.manageFavoriteItem.resourceId}
          resourceId={controller.manageFavoriteItem.resourceId}
          onOpenChange={(open) => {
            if (!open) controller.onCloseManageFavorite();
          }}
          onConfirmed={controller.onManageFavoriteSuccess}
        />
      ) : null}
    </div>
  );
}

export default FavoriteResourceTable;
