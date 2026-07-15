import type { FavoriteCollection } from '@/domains/Interact';
import { Button, Card, Chip, Dropdown } from '@heroui/react';
import { EllipsisVertical } from 'lucide-react';
import styles from '../style.module.less';

interface CollectionCardProps {
  collection: FavoriteCollection;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CollectionCard({ collection, onOpen, onEdit, onDelete }: CollectionCardProps) {
  const displayName = collection.collectionName ?? '我的收藏';
  return (
    <div
      className={styles.collectionCardTrigger}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <Card className={styles.collectionCard}>
        <Card.Header className={styles.collectionCardHeader}>
          <Card.Title className={styles.collectionCardTitle}>{displayName}</Card.Title>
          {collection.isDefault ? (
            <Chip size="sm" variant="soft">
              默认
            </Chip>
          ) : null}
          <div
            role="presentation"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant="ghost" size="sm" isIconOnly aria-label="收藏夹操作">
                  <EllipsisVertical size={16} />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu aria-label="收藏夹操作">
                  <Dropdown.Item id="edit" onAction={onEdit}>
                    编辑
                  </Dropdown.Item>
                  {!collection.isDefault ? (
                    <Dropdown.Item id="delete" variant="danger" onAction={onDelete}>
                      删除
                    </Dropdown.Item>
                  ) : null}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </Card.Header>
        <Card.Content className={styles.collectionCardContent}>
          {collection.description ? <p>{collection.description}</p> : null}
          <span>{collection.itemCount} 个内容</span>
        </Card.Content>
      </Card>
    </div>
  );
}

export default CollectionCard;
