import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import type { FavoriteCollection } from '@/domains/Interact';
import { Button, Checkbox, Input, TextField } from '@heroui/react';
import { Plus } from 'lucide-react';
import styles from './style.module.less';

interface CollectionPickerModalProps {
  collections: FavoriteCollection[];
  selectedIds: string[];
  newCollectionName: string;
  showCreateInput: boolean;
  loadingCollections: boolean;
  loadingStatus: boolean;
  loadingConfirm: boolean;
  loadingCreate: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (collectionId: string, selected: boolean) => void;
  onConfirm: () => void;
  onShowCreateInput: (show: boolean) => void;
  onNewCollectionNameChange: (name: string) => void;
  onCreateCollection: () => void;
}

function CollectionPickerModal({
  collections,
  selectedIds,
  newCollectionName,
  showCreateInput,
  loadingCollections,
  loadingStatus,
  loadingConfirm,
  loadingCreate,
  onOpenChange,
  onToggle,
  onConfirm,
  onShowCreateInput,
  onNewCollectionNameChange,
  onCreateCollection,
}: CollectionPickerModalProps) {
  const selectedIdSet = new Set(selectedIds);
  const busy = loadingConfirm || loadingCreate;
  return (
    <AppModal
      isOpen
      onOpenChange={onOpenChange}
      title="收藏到"
      size="sm"
      isDismissable={!busy}
      actions={
        <>
          <Button variant="secondary" isDisabled={busy} onPress={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || loadingCollections || loadingStatus}
            onPress={onConfirm}
          >
            确认
          </Button>
        </>
      }
    >
      <div className={styles.pickerBody}>
        {loadingCollections || loadingStatus ? (
          <div className={styles.pickerLoading}>
            <Spin />
          </div>
        ) : (
          <div className={styles.collectionList}>
            {collections.map((collection) => (
              <Checkbox
                key={collection.collectionId}
                isSelected={selectedIdSet.has(collection.collectionId)}
                onChange={(selected) => onToggle(collection.collectionId, selected)}
                variant="secondary"
                className={styles.collectionItem}
              >
                <Checkbox.Content className={styles.collectionContent}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className={styles.collectionText}>
                    <span data-slot="label" className={styles.collectionLabel}>
                      {collection.collectionName ?? '我的收藏'}
                    </span>
                    <span data-slot="description" className={styles.collectionCount}>
                      {collection.itemCount} 个内容
                    </span>
                  </span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </div>
        )}

        {showCreateInput ? (
          <div className={styles.createRow}>
            <TextField aria-label="新建收藏夹名称" className={styles.createInput}>
              <Input
                placeholder="收藏夹名称"
                value={newCollectionName}
                autoFocus
                onChange={(event) => onNewCollectionNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCreateCollection();
                  }
                  if (event.key === 'Escape') onShowCreateInput(false);
                }}
              />
            </TextField>
            <Button
              size="sm"
              variant="primary"
              isDisabled={loadingCreate}
              onPress={onCreateCollection}
            >
              创建
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={loadingCreate}
              onPress={() => onShowCreateInput(false)}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={styles.newCollectionButton}
            onPress={() => onShowCreateInput(true)}
          >
            <Plus size={15} />
            新建收藏夹
          </Button>
        )}
      </div>
    </AppModal>
  );
}

export default CollectionPickerModal;
