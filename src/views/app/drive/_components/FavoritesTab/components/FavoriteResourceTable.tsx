import EntryIcon from '@/components/Icons/EntryIcon';
import DataTable from '@/components/Table/DataTable';
import type { DataTableColumn } from '@/components/Table/DataTable/index.type';
import { buildDriveNodeScope } from '@/domains/Drive';
import type { FavoriteItem } from '@/domains/Interact';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { Button } from '@heroui/react';
import { useFavoriteResources } from '../hooks/useFavoriteResources';
import styles from '../style.module.less';

interface FavoriteResourceTableProps {
  collectionId?: string;
  emptyDescription: string;
}

function FavoriteResourceTable({ collectionId, emptyDescription }: FavoriteResourceTableProps) {
  const openInWorkspace = useOpenInWorkspace();
  const { list, total, page, pageSize, totalPage, loading, setPage } =
    useFavoriteResources(collectionId);

  const columns: DataTableColumn<FavoriteItem>[] = [
    {
      id: 'resource',
      label: '资源',
      width: 'fill',
      isRowHeader: true,
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
          <Button
            variant="ghost"
            size="sm"
            className={styles.resourceCellButton}
            onPress={() =>
              openInWorkspace({
                resourceId: item.resourceId,
                resourceType: resourceInfo.resourceType,
                resourceName: resourceInfo.resourceName,
                driveLocation: { scope: buildDriveNodeScope() },
              })
            }
          >
            <EntryIcon
              entryType="resource"
              resourceType={resourceInfo.resourceType}
              resourceName={resourceInfo.resourceName}
              resourceIconType={resourceInfo.resourceIconType}
              size={18}
            />
            <span className={styles.resourceCellName}>{resourceInfo.resourceName}</span>
          </Button>
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
  ];

  return (
    <DataTable
      ariaLabel="已收藏资源"
      items={list}
      rowKey="resourceId"
      columns={columns}
      loading={loading}
      emptyText="暂无收藏内容"
      emptyDescription={emptyDescription}
      totalCount={total}
      pagination={{
        total,
        current: page,
        pageSize,
        onChange: (nextPage) => setPage(Math.min(Math.max(1, nextPage), Math.max(1, totalPage))),
      }}
      className={styles.resourceTable}
    />
  );
}

export default FavoriteResourceTable;
