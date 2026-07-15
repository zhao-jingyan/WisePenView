import { Button } from '@heroui/react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import styles from './style.module.less';

interface ResourceFavoriteButtonProps {
  isFavorited: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

function ResourceFavoriteButton({ isFavorited, isDisabled, onPress }: ResourceFavoriteButtonProps) {
  const Icon = isFavorited ? BookmarkCheck : Bookmark;
  return (
    <Button
      variant="secondary"
      className={styles.panelButton}
      aria-pressed={isFavorited}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      <Icon size={16} aria-hidden="true" />
      <span className={styles.panelCopy}>
        <strong>{isFavorited ? '已收藏' : '收藏'}</strong>
        <span>{isFavorited ? '管理收藏夹' : '加入收藏夹'}</span>
      </span>
    </Button>
  );
}

export default ResourceFavoriteButton;
