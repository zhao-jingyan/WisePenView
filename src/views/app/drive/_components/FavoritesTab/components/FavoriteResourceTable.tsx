import FavoriteCollectionPicker from '@/components/Resource/FavoriteCollectionPicker';
import { FolderTable, type FolderTableColumn, type FolderTableRow } from '@/components/Table';
import type { FavoriteItem } from '@/domains/Interact';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { useFavoriteResourceTableController } from '../hooks/useFavoriteResourceTableController';
import styles from '../style.module.less';
import FavoriteResourceSelectionPanel from './FavoriteResourceSelectionPanel';
import UnfavoriteResourceModal from './UnfavoriteResourceModal';

interface FavoriteResourceTableProps {
  collectionId: string;
  collectionName: string;
  collectionItemCount: number;
  onCollectionChanged: () => void;
  emptyDescription: string;
}

interface FavoriteResourceTableRow extends FolderTableRow {
  item: FavoriteItem;
}

const FAVORITE_RESOURCE_COLUMNS: FolderTableColumn<FavoriteResourceTableRow>[] = [
  {
    id: 'resource',
    label: '名称',
    width: 'fill',
    isNameColumn: true,
    className: styles.resourceNameColumn,
  },
  {
    id: 'type',
    label: '类型',
    width: 'folderType',
    renderCell: (row) => row.typeLabel,
  },
  {
    id: 'favoritedAt',
    label: '收藏时间',
    width: 'folderType',
    renderCell: (row) => formatTimestampToDate(row.item.favoritedAt) || '—',
  },
  {
    id: 'actions',
    label: '操作',
    width: 'folderAction',
    isActionColumn: true,
  },
];

function toFavoriteResourceTableRow(item: FavoriteItem): FavoriteResourceTableRow {
  const resource = item.resourceInfo;
  return {
    id: item.resourceId,
    name: resource?.resourceName ?? '资源已删除',
    entryType: 'resource',
    resourceType: resource?.resourceType,
    resourceIconType: resource?.resourceIconType,
    typeLabel: resource?.resourceType ?? '未知类型',
    item,
  };
}

function FavoriteResourceTable({
  collectionId,
  collectionName,
  collectionItemCount,
  onCollectionChanged,
  emptyDescription,
}: FavoriteResourceTableProps) {
  const controller = useFavoriteResourceTableController({ collectionId, onCollectionChanged });
  const rows = controller.list.map(toFavoriteResourceTableRow);

  return (
    <div className={styles.resourceWorkspace}>
      <div className={styles.resourceTablePanel}>
        <header className={styles.resourcePanelHeader}>
          <div className={styles.resourcePanelCopy}>
            <h2 className={styles.resourcePanelTitle}>{collectionName}</h2>
            <p className={styles.resourcePanelDescription}>{collectionItemCount} 个内容</p>
          </div>
        </header>
        <FolderTable<FavoriteResourceTableRow>
          ariaLabel="已收藏资源"
          items={rows}
          selectedRowKey={controller.selectedResourceId}
          onRowSelect={(row) => controller.onRowSelect(row.item)}
          columns={FAVORITE_RESOURCE_COLUMNS}
          renderNameContent={(content, row) =>
            row.item.resourceInfo ? (
              content
            ) : (
              <span className={styles.resourceCellDisabled}>{content}</span>
            )
          }
          rowActions={(row) => [
            {
              key: 'open',
              label: '打开',
              disabled: !row.item.resourceInfo,
              onPress: () => controller.onRowAction(row.item, 'open'),
            },
            {
              key: 'manage',
              label: '管理收藏',
              disabled: !row.item.resourceInfo,
              onPress: () => controller.onRowAction(row.item, 'manage'),
            },
            {
              key: 'remove',
              label: '移出收藏夹',
              variant: 'danger',
              onPress: () => controller.onRowAction(row.item, 'remove'),
            },
          ]}
          loading={controller.loading}
          emptyText="暂无收藏内容"
          emptyDescription={emptyDescription}
          totalCount={controller.total}
          loadMore={{
            hasMore: controller.hasMore,
            loading: controller.loadingMore,
            onLoadMore: controller.loadMore,
          }}
          className={styles.resourceTable}
        />
      </div>
      <FavoriteResourceSelectionPanel
        item={controller.selectedItem}
        onOpen={controller.onOpenResource}
        onManage={(item) => controller.onRowAction(item, 'manage')}
        onRemove={controller.onRequestUnfavorite}
      />
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
