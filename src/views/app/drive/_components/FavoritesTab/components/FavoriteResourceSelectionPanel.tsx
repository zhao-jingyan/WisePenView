import EntryIcon from '@/components/Icons/EntryIcon';
import type { FavoriteItem } from '@/domains/Interact';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { Button } from '@heroui/react';
import { BookmarkCheck, ExternalLink, FolderCog } from 'lucide-react';
import styles from '../style.module.less';

interface FavoriteResourceSelectionPanelProps {
  item?: FavoriteItem;
  onOpen: (item: FavoriteItem) => void;
  onManage: (item: FavoriteItem) => void;
  onRemove: (item: FavoriteItem) => void;
}

function FavoriteResourceSelectionPanel({
  item,
  onOpen,
  onManage,
  onRemove,
}: FavoriteResourceSelectionPanelProps) {
  if (!item) {
    return (
      <aside className={styles.detailPanel} aria-label="收藏详情">
        <div className={styles.favoriteDetailEmpty}>选中左侧资源以查看详情</div>
      </aside>
    );
  }

  const resource = item.resourceInfo;
  const resourceName = resource?.resourceName ?? '资源已删除';

  return (
    <aside className={styles.detailPanel} aria-label="收藏详情">
      <div className={styles.favoriteDetailContent}>
        <header className={styles.favoriteDetailHeader}>
          <span className={styles.favoriteDetailIcon} aria-hidden="true">
            <EntryIcon
              entryType="resource"
              resourceType={resource?.resourceType}
              resourceIconType={resource?.resourceIconType}
              size={18}
            />
          </span>
          <div className={styles.favoriteDetailTitleBlock}>
            <span className={styles.favoriteDetailTitle}>{resourceName}</span>
            <span className={styles.favoriteDetailType}>
              {resource?.resourceType ?? '未知类型'}
            </span>
          </div>
        </header>

        <dl className={styles.favoriteDetailMeta}>
          <div>
            <dt>收藏时间</dt>
            <dd>{formatTimestampToDate(item.favoritedAt) || '—'}</dd>
          </div>
        </dl>

        <div className={styles.favoriteDetailActions}>
          {resource ? (
            <>
              <Button variant="secondary" size="sm" onPress={() => onOpen(item)}>
                <ExternalLink size={16} aria-hidden="true" />
                打开
              </Button>
              <Button variant="secondary" size="sm" onPress={() => onManage(item)}>
                <FolderCog size={16} aria-hidden="true" />
                管理收藏
              </Button>
            </>
          ) : null}
          <Button variant="danger" size="sm" onPress={() => onRemove(item)}>
            <BookmarkCheck size={16} aria-hidden="true" />
            移出收藏夹
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default FavoriteResourceSelectionPanel;
