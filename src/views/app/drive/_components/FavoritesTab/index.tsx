import { Empty, Spin } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useInteractService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import DeleteCollectionModal from './DeleteCollectionModal';
import EditCollectionModal from './EditCollectionModal';
import CollectionCard from './components/CollectionCard';
import FavoriteResourceTable from './components/FavoriteResourceTable';
import styles from './style.module.less';

type TabKey = 'byContent' | 'byCollection';
type FavoritesView =
  | { mode: 'byContent' }
  | { mode: 'byCollection' }
  | { mode: 'collectionDetail'; collectionId: string; collectionName: string | null };

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'byContent', label: '按内容' },
  { key: 'byCollection', label: '按收藏夹' },
];

function FavoritesTab() {
  const interactService = useInteractService();
  const [view, setView] = useState<FavoritesView>({ mode: 'byContent' });
  const [editingCollection, setEditingCollection] = useState<
    FavoriteCollection | null | undefined
  >();
  const [deletingCollection, setDeletingCollection] = useState<FavoriteCollection | undefined>();
  const {
    data: collections,
    loading,
    refresh,
  } = useRequest(() => interactService.listFavoriteCollections(), {
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });

  const handleChanged = () => {
    void refresh();
    setView({ mode: 'byCollection' });
  };
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        {view.mode === 'collectionDetail' ? (
          <div className={styles.topLeft}>
            <Button variant="ghost" size="sm" onPress={() => setView({ mode: 'byCollection' })}>
              <ChevronLeft size={16} />
              返回
            </Button>
            <h2 className={styles.detailTitle}>{view.collectionName ?? '我的收藏'}</h2>
          </div>
        ) : (
          <SegmentedTabs<TabKey>
            ariaLabel="收藏视图切换"
            items={TAB_ITEMS}
            selectedKey={view.mode}
            onSelectionChange={(key) => setView({ mode: key })}
            size="sm"
          />
        )}
        {view.mode !== 'collectionDetail' ? (
          <Button variant="secondary" size="sm" onPress={() => setEditingCollection(null)}>
            <Plus size={14} />
            新建收藏夹
          </Button>
        ) : null}
      </div>

      <div className={styles.content}>
        {view.mode === 'byContent' ? (
          <FavoriteResourceTable key="all" emptyDescription="收藏后会显示在这里" />
        ) : null}
        {view.mode === 'byCollection' ? (
          loading ? (
            <Spin />
          ) : collections?.length ? (
            <div className={styles.collectionGrid}>
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.collectionId}
                  collection={collection}
                  onOpen={() =>
                    setView({
                      mode: 'collectionDetail',
                      collectionId: collection.collectionId,
                      collectionName: collection.collectionName,
                    })
                  }
                  onEdit={() => setEditingCollection(collection)}
                  onDelete={() => setDeletingCollection(collection)}
                />
              ))}
            </div>
          ) : (
            <Empty description="暂无收藏夹" />
          )
        ) : null}
        {view.mode === 'collectionDetail' ? (
          <FavoriteResourceTable
            key={view.collectionId}
            collectionId={view.collectionId}
            emptyDescription="该收藏夹暂无内容"
          />
        ) : null}
      </div>

      {editingCollection !== undefined ? (
        <EditCollectionModal
          onOpenChange={(open) => {
            if (!open) setEditingCollection(undefined);
          }}
          collection={editingCollection}
          onSuccess={handleChanged}
        />
      ) : null}
      {deletingCollection ? (
        <DeleteCollectionModal
          collectionId={deletingCollection.collectionId}
          collectionName={deletingCollection.collectionName}
          onOpenChange={(open) => {
            if (!open) setDeletingCollection(undefined);
          }}
          onSuccess={handleChanged}
        />
      ) : null}
    </div>
  );
}

export default FavoritesTab;
